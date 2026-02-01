import { ConfigStore } from "./store.js";
import ScoreData from "./ScoreData.js";
import { showMessage } from "../lib/ShowMessageBox.js";

/**
 * RhythmScore.js
 * alphaTab（alphaTex）でリズム譜を表示するクラス
 */

class RhythmScore {
  constructor(containerId, {
    timeSignature = "4/4",
    chord = "E",
    measures = 2,
    barsPerRow = null,
    progression = "",
    bars = [],
  } = {}) {
    this.container = document.getElementById(containerId);
    this.store = new ConfigStore();
    this.timeSignature = timeSignature;
    this.chord = chord;
    this.measures = measures;
    this.barsPerRow = Number.isFinite(barsPerRow) ? barsPerRow : null;
    this.progression = this.normalizeProgression(progression);
    this.bars = Array.isArray(bars) ? bars : [];
    this.overlayTimer = null;
    this.contextMenu = null;
    this.contextMenuItems = [];
    this.contextMenuBarIndex = null;
    this.contextMenuPointerId = null;
    this.copiedBar = null;
    console.log("RhythmScore コンストラクタ実行:", {
      containerId,
      container: !!this.container,
      timeSignature: this.timeSignature,
      measures: this.measures,
      progressionLength: this.progression.length,
      barsLength: this.bars.length,
    });
    this.handleOverlayRefresh = () => {
      this.closeContextMenu();
      this.clearOverlay();
      this.startOverlayPoll();
    };
    window.addEventListener("resize", this.handleOverlayRefresh);
    window.addEventListener("scroll", this.handleOverlayRefresh, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.handleOverlayRefresh);
    }
    window.addEventListener("pagehide", () => {
      this.copiedBar = null;
    });
    this.render();
  }

  getPreferredLang() {
    const lang = navigator.language || navigator.userLanguage || "en";
    return lang.startsWith("ja") ? "ja" : "en";
  }

  getMenuLabel(key) {
    const isJa = this.getPreferredLang() === "ja";
    const labels = {
      edit: { ja: "編集", en: "Edit" },
      copy: { ja: "コピー", en: "Copy" },
      duplicate: { ja: "複製", en: "Duplicate" },
      paste: { ja: "貼り付け", en: "Paste" },
      delete: { ja: "削除", en: "Delete" },
    };
    return labels[key] ? labels[key][isJa ? "ja" : "en"] : key;
  }

  cloneBar(bar) {
    if (!bar || typeof bar !== "object") {
      return this.buildDefaultBar();
    }
    const chord = Array.isArray(bar.chord)
      ? bar.chord.map((value) => (typeof value === "string" ? value : ""))
      : typeof bar.chord === "string"
        ? [bar.chord]
        : [];
    const rhythm = Array.isArray(bar.rhythm)
      ? bar.rhythm.map((value) => (typeof value === "string" ? value : ""))
      : [];
    return { chord, rhythm };
  }

  buildDefaultBar() {
    const beatPatterns = this.store?.getScoreBeatPatterns?.();
    const scoreData = new ScoreData({
      timeSignature: this.timeSignature,
      measures: 1,
      progression: this.progression.join(" "),
      beatPatterns,
      bars: null,
    });
    const bars = scoreData.buildBars();
    return bars[0] ? this.cloneBar(bars[0]) : { chord: [], rhythm: [] };
  }

  applyBarsUpdate(nextBars) {
    this.bars = Array.isArray(nextBars) ? nextBars : [];
    this.measures = this.bars.length > 0 ? this.bars.length : 1;
    this.store.setScoreBars(this.bars);
    this.store.setScoreMeasures(this.measures);
    window.bclickScoreBarCount = this.bars.length;
    this.render();
  }

  ensureContextMenu() {
    if (!this.container) return;
    if (this.contextMenu && this.container.contains(this.contextMenu)) return;
    const menu = document.createElement("div");
    menu.className = "scoreContextMenu";
    menu.setAttribute("role", "menu");

    const list = document.createElement("div");
    list.className = "scoreContextMenuList";

    const actions = ["edit", "copy", "duplicate", "paste", "delete"];
    actions.forEach((action) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "scoreContextMenuItem";
      item.dataset.action = action;
      item.setAttribute("role", "menuitem");
      item.textContent = this.getMenuLabel(action);
      list.appendChild(item);
    });

    menu.appendChild(list);
    menu.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    this.container.appendChild(menu);
    this.contextMenu = menu;
    this.contextMenuItems = Array.from(menu.querySelectorAll(".scoreContextMenuItem"));
  }

  setActiveMenuItem(targetItem) {
    this.contextMenuItems.forEach((item) => {
      const isActive = item === targetItem;
      item.classList.toggle("isActive", isActive);
    });
  }

  updateActiveMenuFromPoint(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    const item = target ? target.closest(".scoreContextMenuItem") : null;
    if (item && item.classList.contains("isDisabled")) {
      this.setActiveMenuItem(null);
      return;
    }
    this.setActiveMenuItem(item);
  }

  closeContextMenu() {
    if (!this.contextMenu) return;
    this.contextMenu.classList.remove("isVisible");
    this.contextMenuBarIndex = null;
    this.contextMenuPointerId = null;
    this.setActiveMenuItem(null);
    if (this.handleMenuPointerMove) {
      window.removeEventListener("pointermove", this.handleMenuPointerMove);
    }
    if (this.handleMenuPointerUp) {
      window.removeEventListener("pointerup", this.handleMenuPointerUp);
      window.removeEventListener("pointercancel", this.handleMenuPointerUp);
    }
    if (this.handleOutsidePointerDown) {
      window.removeEventListener("pointerdown", this.handleOutsidePointerDown, true);
    }
  }

  openContextMenu({ left, top, barIndex }) {
    if (!this.container) return;
    this.ensureContextMenu();
    if (!this.contextMenu) return;

    this.contextMenuBarIndex = barIndex;
    this.contextMenuItems.forEach((item) => {
      const isPaste = item.dataset.action === "paste";
      item.classList.toggle("isDisabled", isPaste && !this.copiedBar);
    });

    this.contextMenu.style.left = `${left}px`;
    this.contextMenu.style.top = `${top}px`;
    this.contextMenu.classList.add("isVisible");

    const menuRect = this.contextMenu.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const maxLeft = Math.max(0, containerRect.width - menuRect.width - 4);
    const maxTop = Math.max(0, containerRect.height - menuRect.height - 4);
    const clampedLeft = Math.max(4, Math.min(left, maxLeft));
    const clampedTop = Math.max(4, Math.min(top, maxTop));
    this.contextMenu.style.left = `${clampedLeft}px`;
    this.contextMenu.style.top = `${clampedTop}px`;
  }

  handleMenuAction(action, barIndex) {
    if (typeof barIndex !== "number" || barIndex < 0) return;
    if (action === "edit") {
      window.location.href = `/editMeasure.html?bar=${barIndex}`;
      return;
    }

    const nextBars = this.bars.map((bar) => this.cloneBar(bar));
    const ensureIndex = () => {
      while (nextBars.length <= barIndex) {
        nextBars.push(this.buildDefaultBar());
      }
    };

    if (action === "copy") {
      ensureIndex();
      this.copiedBar = this.cloneBar(nextBars[barIndex]);
      showMessage("barCopyMessage", 2000);
      return;
    }

    if (action === "paste") {
      if (!this.copiedBar) return;
      ensureIndex();
      nextBars[barIndex] = this.cloneBar(this.copiedBar);
      this.applyBarsUpdate(nextBars);
      showMessage("barPasteMessage", 2000);
      return;
    }

    if (action === "duplicate") {
      ensureIndex();
      const source = nextBars[barIndex] || this.buildDefaultBar();
      nextBars.splice(barIndex + 1, 0, this.cloneBar(source));
      this.applyBarsUpdate(nextBars);
      showMessage("barDuplicateMessage", 2000);
      return;
    }

    if (action === "delete") {
      const deleteHandler = () => {
        ensureIndex();
        if (nextBars.length > 1) {
          nextBars.splice(barIndex, 1);
        } else {
          nextBars[0] = this.buildDefaultBar();
        }
        this.applyBarsUpdate(nextBars);
      };
      const fallbackMessage = this.getPreferredLang() === "ja"
        ? "この小節を削除しますか？"
        : "Delete this bar?";
      if (window.confirm(fallbackMessage)) {
        deleteHandler();
      }
    }
  }

  setTimeSignature(value) {
    if (typeof value !== "string" || value.length === 0) return;
    this.timeSignature = value;
    this.render();
  }

  setChord(value) {
    if (typeof value !== "string") return;
    this.chord = value;
    this.render();
  }

  setMeasures(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    this.measures = parsed;
    this.render();
  }

  setBarsPerRow(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    this.barsPerRow = parsed;
    this.render();
  }

  setProgression(value) {
    this.progression = this.normalizeProgression(value);
    this.render();
  }

  setBars(value) {
    this.bars = Array.isArray(value) ? value : [];
    this.render();
  }

  normalizeProgression(value) {
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === "string" && item.length > 0);
    }
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.split(/\s+/) : [];
  }

  sanitizeChordLabel(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.replace(/["\\]/g, "");
  }

  /**
   * SVG内のコード文字だけを拡大する。
   */
  scaleSvgChordText(svgs, scalePercent = 150) {
    const svgList = Array.isArray(svgs) ? svgs : [];
    if (svgList.length === 0) return;
    const multiplier = scalePercent / 100;
      svgList.forEach((svg) => {
        svg.querySelectorAll("text").forEach((node) => {
          const raw = node.textContent?.trim();
          // アルファベットで始まり、英数字 + #/b を含む8文字以内のテキストだけをコードとして扱う。
          // 例） F#m7b5 とかのコードも許容するため。余裕を見て8文字とした。
          if (!raw || !/^[A-Za-z][A-Za-z0-9#b]{0,7}$/.test(raw)) return;
        // リサイズ毎に増幅しないように、元サイズを保持する。
        let baseSize = node.dataset.baseFontSize;
        if (!baseSize) {
          const currentSize = node.style.fontSize
            || (window.getComputedStyle ? window.getComputedStyle(node).fontSize : "");
          const match = String(currentSize).trim().match(/^([\d.]+)([a-z%]+)$/i);
          if (!match) return;
          baseSize = `${match[1]}${match[2]}`;
          node.dataset.baseFontSize = baseSize;
        }
        const baseMatch = String(baseSize).trim().match(/^([\d.]+)([a-z%]+)$/i);
        if (!baseMatch) return;
        const value = Number.parseFloat(baseMatch[1]);
        const unit = baseMatch[2];
        if (!Number.isFinite(value) || !unit) return;
        node.style.fontSize = `${value * multiplier}${unit}`;
      });
    });
  }

  // alphaTab に表示する楽譜用の文字列を作成する。
  buildAlphaTex() {
    const [numeratorRaw, denominatorRaw] = this.timeSignature.split("/");
    const numeratorValue = Number.parseInt(numeratorRaw, 10);
    const denominatorValue = Number.parseInt(denominatorRaw, 10);
    const numerator = Number.isNaN(numeratorValue) || numeratorValue <= 0 ? 4 : numeratorValue;
    const denominator = Number.isNaN(denominatorValue) || denominatorValue <= 0 ? 4 : denominatorValue;
    const beats = numerator;
    const bars = [];
    const barSource = Array.isArray(this.bars) && this.bars.length > 0 ? this.bars : null;
    const barCount = barSource ? barSource.length : this.measures;
    const progression = this.progression.length > 0 ? this.progression : null;

    // alphaTab に向けて小節毎に情報を組み立てていく。
    let lastBeatDivision = 4;
    for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
      const notes = [];
      const barData = barSource ? barSource[barIndex] : null;
      const getBeatLength = (duration) => {
        if (duration === "16") return 0.25;
        if (duration === "8") return 0.5;
        return 1;
      };
      const normalizeBeatChords = (value) => {
        if (Array.isArray(value)) {
          const normalized = value.map((item) => (typeof item === "string" ? item : ""));
          while (normalized.length < beats) {
            normalized.push("");
          }
          return normalized.slice(0, beats);
        }
        if (typeof value === "string" && value.length > 0) {
          return Array.from({ length: beats }, (_, index) => (index === 0 ? value : ""));
        }
        return Array.from({ length: beats }, () => "");
      };
      const buildBeatChords = () => {
        if (barData && barData.chord) {
          return normalizeBeatChords(barData.chord);
        }
        const fallback = progression ? progression[barIndex % progression.length] : "";
        return normalizeBeatChords(fallback);
      };
      const beatChords = buildBeatChords().map((value) => this.sanitizeChordLabel(value));
      let beatIndex = 0;
      let beatProgress = 0;
      let currentBeatDivision = 4;
      let chordAttached = false;
      const rhythm = barData && Array.isArray(barData.rhythm) && barData.rhythm.length > 0
        ? barData.rhythm
        : Array.from({ length: beats }, () => "4");
      let lastNoteIndex = null;

      // 4 / 8 / 16分音符ごとのループ
      rhythm.forEach((value, index) => {
        const duration = value.endsWith("16") ? "16" : value.endsWith("8") ? "8" : "4";
        const isRest = value.startsWith("r");
        const isTie = value.startsWith("t");
        const isBarHead = beatIndex === 0 && beatProgress === 0;

        if (beatProgress === 0) {
          currentBeatDivision = Number.parseInt(duration, 10);
        }
        const beatChordLabel = beatChords[beatIndex] || "";
        const beatLength = getBeatLength(duration);

        let handledTie = false;
        if (isTie) {
          if (lastNoteIndex !== null) {
            // タイの拍は「前の音符を伸ばす」だけにして、新しい音符を追加しない。1つ前の拍の文字列の最後に "-" を追加する。
            // また、タイの後ろの音符は指定しないことで、リズム譜として タイを表示する。

            // Spec
            // 例1）4分音符から4分音符へのタイ（alphaTex）
            //                             vここに C4.4 は挿入しない。
            // :4 C4.4 { slashed ch "G" } - { slashed }
            // 
            // 例2）4分音符から8分音符へのタイ
            //                             vここで8分音符に変更する。
            // :4 C4.4 { slashed ch "G" } :8 - { slashed }
            // タイ拍の分割が 4→8、8→16 と切り替わる時に、拍の先頭にコロンと共に数字が必要。
            const divisionToken = currentBeatDivision !== lastBeatDivision
              ? ` :${currentBeatDivision}`
              : "";
            notes[lastNoteIndex] = `${notes[lastNoteIndex]}${divisionToken} - { slashed }`;
            beatProgress += beatLength;
            handledTie = true;
          } else if (isBarHead && barIndex > 0) {

            // Spec 2小節名以降の先頭のタイは、先頭の拍を "- { slashed }" で始める。
            // 例）（alphaTex）
            // :4 C4{slashed} :8 -{slashed} r :4 C4{slashed} C4{slashed} |    ← 1小節目
            // :4 - {slashed} C4{slashed} C4{slashed} C4{slashed} |           ← 2小節目（先頭タイ）

            const divisionToken = currentBeatDivision !== lastBeatDivision
              ? `:${currentBeatDivision} `
              : "";
            notes.push(`${divisionToken}- { slashed }`);
            beatProgress += beatLength;
            handledTie = true;
          }
        }

        if (handledTie) {
          if (beatProgress >= 0.999) {
            beatIndex = Math.min(beatIndex + 1, beats - 1);
            beatProgress = 0;
            lastBeatDivision = currentBeatDivision;
            chordAttached = false;
          }
          return;
        }

        if (isRest) {
          // 休符の場合
          const noteValue = duration === "16" ? "r.16" : duration === "8" ? "r.8" : "r.4";
          const props = "slashed";
          const noteText = `${noteValue} { ${props} }`;

          notes.push(noteText);
          lastNoteIndex = null;
          beatProgress += beatLength;
        }
        else {
          const noteValue = duration === "16" ? "C4.16" : duration === "8" ? "C4.8" : "C4.4";
//          const noteValue = value === "8" ? ".8" : "(C4 D4).8"; // サンプル 8分音符
//          const noteValue = value === "8" ? ".8" : "r.8";       // サンプル 8分休符
//          const noteValue = value === "8" ? ".8" : "C4.16";     // サンプル 16分音符
          let props = "slashed";
          if (beatChordLabel && !chordAttached) {
            props += ` ch "${beatChordLabel}"`;
            chordAttached = true;
          }
          const noteText = `${noteValue} { ${props} }`;

          /* Spec noteText の例）（alphaTex）
          // コード無しの場合 > C4.4 { slashed }
          // コード在りの場合 > C4.4 { slashed ch "C" }
          */

          notes.push(noteText);
          lastNoteIndex = notes.length - 1;
          beatProgress += beatLength;
        }

        if (beatProgress >= 0.999) {
          beatIndex = Math.min(beatIndex + 1, beats - 1);
          beatProgress = 0;
          lastBeatDivision = currentBeatDivision;
          chordAttached = false;
        }
        return;
      });
      bars.push(notes.join(" "));
    }

    // 文字列を確認する。
    const layoutLine = Number.isFinite(this.barsPerRow) && this.barsPerRow > 0
      ? `\\track { defaultSystemsLayout ${this.barsPerRow} }`
      : null;
    var check_alphaTex = 
    [
      layoutLine,
      `\\ts ${numerator} ${denominator}`,
      ".",
      `:${denominator} ${bars.join(" | ")} |`,
    ].filter(Boolean).join("\n");

    return check_alphaTex;
  }

  render() {
    if (!this.container || !window.alphaTab) return;
    this.closeContextMenu();
    this.container.textContent = "";
    this.contextMenu = null;
    this.contextMenuItems = [];
    this.clearOverlay();

    const settings = {
      tex: true,
      display: {
        staveProfile: window.alphaTab.StaveProfile.Score,
        scale: 0.95,
      },
    };
    if (Number.isFinite(this.barsPerRow) && this.barsPerRow > 0) {
      const layoutMode = window.alphaTab.SystemsLayoutMode?.Model ?? 1;
      settings.display.systemsLayoutMode = layoutMode;
    }

    this.container.textContent = this.buildAlphaTex();
      new window.alphaTab.AlphaTabApi(this.container, settings);
    this.startOverlayPoll();
  }

  clearOverlay() {
    if (!this.container) return;
    this.container.querySelectorAll(".scoreChordOverlayLayer").forEach((layer) => layer.remove());
    if (this.overlayTimer) {
      clearInterval(this.overlayTimer);
      this.overlayTimer = null;
    }
  }

  startOverlayPoll() {
    if (this.overlayTimer) return;
    let attempts = 0;
    this.overlayTimer = setInterval(() => {
      attempts += 1;
      const done = this.renderOverlay();
      if (done || attempts >= 30) {
        clearInterval(this.overlayTimer);
        this.overlayTimer = null;
      }
    }, 50);
  }

  renderOverlay() {
    if (!this.container) return false;
    const svgs = Array.from(this.container.querySelectorAll("svg"));
    if (svgs.length === 0) return false;
    this.container.querySelectorAll(".scoreChordOverlayLayer").forEach((layer) => layer.remove());
    this.scaleSvgChordText(svgs, 150);
    const overlay = document.createElement("div");
    overlay.className = "scoreChordOverlayLayer";

    const containerRect = this.container.getBoundingClientRect();
    const entries = [];

    svgs.forEach((svg) => {
      svg.querySelectorAll("text").forEach((node) => {
        const raw = node.textContent?.trim();
        if (!raw || !/^\d+$/.test(raw)) return;
        const fillColor = node.getAttribute("fill") || node.style.fill;
        if (fillColor !== "#C80000") return;
        const parsedBarIndex = Number.parseInt(raw, 10);
        if (Number.isNaN(parsedBarIndex)) return;
        const barIndex = Math.max(parsedBarIndex - 1, 0);
        const rect = node.getBoundingClientRect();
        const left = rect.left - containerRect.left;
        const top = rect.top - containerRect.top;
        entries.push({
          node,
          label: raw,
          barIndex,
          left,
          top,
          width: rect.width,
          height: rect.height,
          fontSize: rect.height,
        });
      });
    });

    if (entries.length === 0) return false;

    entries
      .sort((a, b) => {
        if (a.top !== b.top) return a.top - b.top;
        return a.left - b.left;
      })
      .forEach((entry, index) => {
        const resolvedIndex = entry.barIndex !== null ? entry.barIndex : index;
        const badge = document.createElement("span");
        badge.className = "scoreChordOverlayLabel";
        badge.textContent = entry.label;
        badge.dataset.barIndex = String(resolvedIndex);
        if (window.bclickActiveChordIndex === resolvedIndex) {
          badge.classList.add("isActiveChord");
        }

        /*Spec 小節番号のクリック・タップ操作イベント
        ・マウスボタンダウン、またはタップダウン、でcontextMenuを表示する
        ・表示されたcontextMenu内のメニューヘはドラッグ操作でメニューを選択する。
        ・ドラッグ操作中は選択メニューをハイライトする。
        ・マウスボタンアップ、またはタップアップ、で選択したメニューの決定となる。
        ・contextMenuには、編集、コピー、複製、貼り付け、削除、のメニューが存在する。
        ・contextMenuの表示位置は、選択した小節番号の右側とする。

        ・「編集」は、editMeasure.html へ画面遷移して、小節の編集操作を行う。
        ・「コピー」は、選択した小節（音符とコード）を内部的に記憶する。
        ・「複製」は、選択した小節を複製して、選択した小節のすぐ後ろに追加する。
        ・「貼り付け」は、「コピー」で内部的に記憶した小節（音符とコード）を、今選択した小節に上書きする。
        ・「削除」は、選択した小節を削除する。削除時は、confirmで本当に削除していいか確認する。

        ・「コピー」、「複製」、「貼り付け」後は、それぞれの操作が終わったメッセージを2秒表示する。
        ・contextMenuの文字は適切に翻訳する。
        ・editScore画面から別画面に移動したら、コピーや貼り付けの内部的データは消去してよい。
        */
        badge.addEventListener("contextmenu", (event) => {
          event.preventDefault();
        });
        badge.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        badge.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();

          const badgeRect = badge.getBoundingClientRect();
          const containerRect = this.container.getBoundingClientRect();
          const left = badgeRect.right - containerRect.left + 6;
          const top = badgeRect.top - containerRect.top;

          this.openContextMenu({
            left,
            top,
            barIndex: resolvedIndex,
          });

          this.contextMenuPointerId = event.pointerId;
          this.handleMenuPointerMove = (moveEvent) => {
            if (this.contextMenuPointerId !== moveEvent.pointerId) return;
            this.updateActiveMenuFromPoint(moveEvent.clientX, moveEvent.clientY);
          };
          this.handleMenuPointerUp = (upEvent) => {
            if (this.contextMenuPointerId !== upEvent.pointerId) return;
            this.updateActiveMenuFromPoint(upEvent.clientX, upEvent.clientY);
            const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
            const item = target ? target.closest(".scoreContextMenuItem") : null;
            if (item && !item.classList.contains("isDisabled")) {
              const action = item.dataset.action;
              this.handleMenuAction(action, resolvedIndex);
            }
            this.closeContextMenu();
          };
          this.handleOutsidePointerDown = (downEvent) => {
            if (!this.contextMenu) return;
            if (this.contextMenu.contains(downEvent.target)) return;
            this.closeContextMenu();
          };
          window.addEventListener("pointermove", this.handleMenuPointerMove);
          window.addEventListener("pointerup", this.handleMenuPointerUp);
          window.addEventListener("pointercancel", this.handleMenuPointerUp);
          window.addEventListener("pointerdown", this.handleOutsidePointerDown, true);
        });

        // タップできる小節番号のオーバーレイのサイズを求める。
        const doubledHeight = entry.height * 2.5;
        const expandedWidth = entry.width * 1.2;
        const overlayShiftX = 4;  // 少しだけ左に移動する量 単位は px

        badge.style.left = `${entry.left - (expandedWidth - entry.width) / 2 - overlayShiftX}px`;
        badge.style.top = `${entry.top - entry.height / 2}px`;
        badge.style.width = `${expandedWidth}px`;
        badge.style.height = `${doubledHeight}px`;
        badge.style.fontSize = `${entry.fontSize}px`;
        overlay.appendChild(badge);
      });

    this.container.appendChild(overlay);
    return true;
  }
}

export default RhythmScore;
