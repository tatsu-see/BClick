/**
 * RhythmScore.js
 * alphaTabでリズム譜を表示するクラス
 * 
 * alphaTabは以下のサイトで情報公開している。
 * 
 * 拍子について
 * https://www.alphatab.net/docs/alphatex/bar-metadata#ts。
 * 
 * 休符について
 * https://alphatab.net/docs/alphatex/document-structure#beat-content-required
 * 
 * 音符表現について
 * https://alphatab.net/docs/alphatex/document-structure#beats
 */

class RhythmScore {
  constructor(containerId, {
    timeSignature = "4/4",
    chord = "E",
    measures = 2,
    progression = "",
    bars = [],
  } = {}) {
    this.container = document.getElementById(containerId);
    this.timeSignature = timeSignature;
    this.chord = chord;
    this.measures = measures;
    this.progression = this.normalizeProgression(progression);
    this.bars = Array.isArray(bars) ? bars : [];
    this.overlayTimer = null;
    console.log("RhythmScore コンストラクタ実行:", {
      containerId,
      container: !!this.container,
      timeSignature: this.timeSignature,
      measures: this.measures,
      progressionLength: this.progression.length,
      barsLength: this.bars.length,
    });
    this.handleOverlayRefresh = () => {
      this.clearOverlay();
      this.startOverlayPoll();
    };
    window.addEventListener("resize", this.handleOverlayRefresh);
    window.addEventListener("scroll", this.handleOverlayRefresh, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.handleOverlayRefresh);
    }
    this.render();
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
      let chordAttached = false;
      const rhythm = barData && Array.isArray(barData.rhythm) && barData.rhythm.length > 0
        ? barData.rhythm
        : Array.from({ length: beats }, () => "4");
      let lastNoteIndex = null;
      rhythm.forEach((value, index) => {
        const duration = value.endsWith("16") ? "16" : value.endsWith("8") ? "8" : "4";
        const isRest = value.startsWith("r");
        const isTie = value.startsWith("t");

        const beatChordLabel = beatChords[beatIndex] || "";
        const beatLength = getBeatLength(duration);

        let handledTie = false;
        if (isTie) {
          if (lastNoteIndex !== null) {
            // タイの拍は「前の音符を伸ばす」だけにして、新しい音符を追加しない。1つ前の拍の文字列の最後に "-" を追加する。
            // また、タイの後ろの音符は指定しないことで、リズム譜として タイを表示する。
            // 例）                         vここに C4.4 は挿入しない。
            // :4 C4.4 { slashed ch "G" } - { slashed }
            notes[lastNoteIndex] = `${notes[lastNoteIndex]} - { slashed }`;
            beatProgress += beatLength;
            handledTie = true;
          }
        }

        if (handledTie) {
          if (beatProgress >= 0.999) {
            beatIndex = Math.min(beatIndex + 1, beats - 1);
            beatProgress = 0;
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

          /* Spec noteText の例）
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
          chordAttached = false;
        }
        return;
      });
      bars.push(notes.join(" "));
    }

    // 文字列を確認する。
    var check_alphaTex = 
    [
      `\\ts ${numerator} ${denominator}`,
      ".",
      `:${denominator} ${bars.join(" | ")} |`,
    ].join("\n");

    return check_alphaTex;
  }

  render() {
    if (!this.container || !window.alphaTab) return;
    this.container.textContent = "";
    this.clearOverlay();

    const settings = {
      tex: true,
      display: {
        staveProfile: window.alphaTab.StaveProfile.Score,
        scale: 0.95,
      },
    };

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
        badge.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          // 小節編集画面を表示する。
          window.open(`/editMeasure.html?bar=${resolvedIndex}`, "_blank", "noopener,noreferrer");
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
