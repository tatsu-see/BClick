/**
 * RhythmScore.js
 * リズム譜の描画・UI・編集をまとめる統合クラス
 */

import AlphaTexBuilder from "../utils/AlphaTexBuilder.js";
import RhythmScoreRenderer from "./RhythmScoreRenderer.js";
import RhythmScoreUI from "./RhythmScoreUI.js";
import ScoreBarEditor from "./ScoreBarEditor.js";
import { showMessage } from "../../lib/ShowMessageBox.js";

class RhythmScore {
  constructor(containerId, {
    timeSignature = "4/4",
    chord = "E",
    measures = 2,
    barsPerRow = null,
    progression = "",
    bars = [],
    rhythmPattern = null,
    tempo = null,
    onBarsChange = null,
  } = {}) {
    this.container = typeof containerId === "string"
      ? document.getElementById(containerId)
      : containerId;
    this.alphaTexBuilder = new AlphaTexBuilder();
    this.renderer = new RhythmScoreRenderer(this.container, {
      alphaTexBuilder: this.alphaTexBuilder,
    });
    this.ui = new RhythmScoreUI(this.container, {
      getSvgs: () => this.renderer.getSvgs(),
      onAction: (action, barIndex) => this.handleMenuAction(action, barIndex),
      canPaste: () => this.editor.hasClipboard(),
    });
    this.editor = new ScoreBarEditor({
      timeSignature,
      progression,
      rhythmPattern,
    });
    this.onBarsChange = onBarsChange;
    this.timeSignature = timeSignature;
    this.chord = chord;
    this.measures = measures;
    this.barsPerRow = Number.isFinite(barsPerRow) ? barsPerRow : null;
    this.progression = this.normalizeProgression(progression);
    this.bars = Array.isArray(bars) ? bars : [];
    this.rhythmPattern = rhythmPattern;
    this.tempo = tempo;
    this.overlayRefreshTimer = null;
    this.postRenderTimerId = null;
    this.postRenderRunId = 0;
    this.menuHighlightTimerId = null;
    this.menuHighlightRunId = 0;

    console.log("RhythmScore コンストラクタ実行:", {
      containerId,
      container: !!this.container,
      timeSignature: this.timeSignature,
      measures: this.measures,
      progressionLength: this.progression.length,
      barsLength: this.bars.length,
    });

    this.ui.attach();
    window.addEventListener("pagehide", () => {
      this.editor.clearClipboard();
    });
    this.render();
  }

  /**
   * コード進行を配列に正規化する。
   * @param {string[] | string} value
   * @returns {string[]}
   */
  normalizeProgression(value) {
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === "string" && item.length > 0);
    }
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.split(/\s+/) : [];
  }

  /**
   * 楽譜のスクロールコンテナを取得する。
   * @returns {HTMLElement|null}
   */
  getScrollContainer() {
    if (!this.container) return null;
    const byId = this.container.closest("#scoreArea");
    if (byId) return byId;
    return this.container.parentElement;
  }

  /**
   * オーバーレイの小節ラベルを取得する。
   * @param {number} barIndex
   * @returns {HTMLElement|null}
   */
  getOverlayLabel(barIndex) {
    if (!this.container) return null;
    if (!Number.isFinite(barIndex) || barIndex < 0) return null;
    return this.container.querySelector(`.scoreChordOverlayLabel[data-bar-index="${barIndex}"]`);
  }

  /**
   * スクロール復元用のスナップショットを作成する。
   * @param {number} barIndex
   * @returns {object|null}
   */
  buildScrollSnapshot(barIndex) {
    const scrollContainer = this.getScrollContainer();
    if (!scrollContainer) return null;
    const snapshot = {
      scrollContainer,
      scrollTop: scrollContainer.scrollTop,
      barIndex: Number.isFinite(barIndex) && barIndex >= 0 ? barIndex : null,
      anchorOffset: null,
    };
    if (snapshot.barIndex === null) {
      return snapshot;
    }
    const label = this.getOverlayLabel(snapshot.barIndex);
    if (!label) return snapshot;
    const containerRect = scrollContainer.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    snapshot.anchorOffset = labelRect.top - containerRect.top;
    return snapshot;
  }

  /**
   * スクロール位置の復元を試行する。
   * @param {object} snapshot
   * @param {boolean} applyBase
   * @returns {boolean}
   */
  restoreScrollSnapshot(snapshot, applyBase = false) {
    if (!snapshot || !snapshot.scrollContainer) return true;
    const { scrollContainer, scrollTop, anchorOffset, barIndex } = snapshot;
    const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    if (applyBase) {
      const baseScroll = Math.max(0, Math.min(scrollTop, maxScroll));
      if (scrollContainer.scrollTop !== baseScroll) {
        scrollContainer.scrollTop = baseScroll;
      }
    }
    if (anchorOffset === null || barIndex === null) {
      return true;
    }
    const label = this.getOverlayLabel(barIndex);
    if (!label) return false;
    const containerRect = scrollContainer.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const newOffset = labelRect.top - containerRect.top;
    const adjusted = scrollContainer.scrollTop + (newOffset - anchorOffset);
    const clamped = Math.max(0, Math.min(adjusted, maxScroll));
    scrollContainer.scrollTop = clamped;
    return true;
  }

  /**
   * メニュー操作後のスクロール復元を予約する。
   * @param {object|null} snapshot
   */
  scheduleScrollRestore(snapshot) {
    if (!snapshot || !snapshot.scrollContainer) return;
    const runId = this.postRenderRunId + 1;
    this.postRenderRunId = runId;
    if (this.postRenderTimerId) {
      clearTimeout(this.postRenderTimerId);
      this.postRenderTimerId = null;
    }
    let attempts = 0;
    let baseApplied = false;
    const tryRestore = () => {
      if (this.postRenderRunId !== runId) return;
      attempts += 1;
      if (!baseApplied) {
        this.restoreScrollSnapshot(snapshot, true);
        baseApplied = true;
      }
      const done = this.restoreScrollSnapshot(snapshot, false);
      if (done || attempts >= 120) {
        this.postRenderTimerId = null;
        return;
      }
      this.postRenderTimerId = window.setTimeout(tryRestore, 50);
    };
    this.postRenderTimerId = window.setTimeout(tryRestore, 0);
  }

  /**
   * 末尾までスクロールする。
   */
  scheduleScrollToEnd() {
    const scrollContainer = this.getScrollContainer();
    if (!scrollContainer) return;
    const runId = this.postRenderRunId + 1;
    this.postRenderRunId = runId;
    if (this.postRenderTimerId) {
      clearTimeout(this.postRenderTimerId);
      this.postRenderTimerId = null;
    }
    let attempts = 0;
    const tryScroll = () => {
      if (this.postRenderRunId !== runId) return;
      attempts += 1;
      const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
      scrollContainer.scrollTop = maxScroll;
      if (attempts >= 120) {
        this.postRenderTimerId = null;
        return;
      }
      this.postRenderTimerId = window.setTimeout(tryScroll, 50);
    };
    this.postRenderTimerId = window.setTimeout(tryScroll, 0);
  }

  /**
   * メニュー操作後の小節を一時的に強調表示する。
   * @param {number} barIndex
   */
  requestMenuHighlight(barIndex) {
    if (!Number.isFinite(barIndex) || barIndex < 0) return;
    if (!this.container) return;
    // オーバーレイ再生成でも維持するためにグローバルへ保持する。
    window.bclickMenuEditedBarIndex = barIndex;
    const runId = this.menuHighlightRunId + 1;
    this.menuHighlightRunId = runId;
    if (this.menuHighlightTimerId) {
      window.clearTimeout(this.menuHighlightTimerId);
      this.menuHighlightTimerId = null;
    }
    let attempts = 0;
    const clearMenuHighlight = () => {
      if (this.menuHighlightRunId !== runId) return;
      if (window.bclickMenuEditedBarIndex === barIndex) {
        window.bclickMenuEditedBarIndex = null;
      }
      this.container
        .querySelectorAll(".scoreChordOverlayLabel.isMenuEdited")
        .forEach((node) => node.classList.remove("isMenuEdited"));
    };
    const applyHighlight = () => {
      if (this.menuHighlightRunId !== runId) return;
      attempts += 1;
      const label = this.getOverlayLabel(barIndex);
      if (!label) {
        if (attempts < 180) {
          window.requestAnimationFrame(applyHighlight);
        } else {
          clearMenuHighlight();
        }
        return;
      }
      this.container
        .querySelectorAll(".scoreChordOverlayLabel.isMenuEdited")
        .forEach((node) => node.classList.remove("isMenuEdited"));
      label.classList.add("isMenuEdited");
      this.menuHighlightTimerId = window.setTimeout(() => {
        clearMenuHighlight();
      }, 3000);
    };
    window.requestAnimationFrame(applyHighlight);
  }

  /**
   * UIメニュー操作を受け取って処理する。
   * @param {string} action
   * @param {number} barIndex
   */
  handleMenuAction(action, barIndex) {
    if (typeof barIndex !== "number" || barIndex < 0) return;
    if (action === "edit") {
      // editMeasure から戻ったときに最後に編集した小節をハイライトするため保存する。
      sessionStorage.setItem("bclick.lastEditedBarIndex", String(barIndex));
      window.location.href = `editMeasure.html?bar=${barIndex}`;
      return;
    }

    this.editor.setContext({
      timeSignature: this.timeSignature,
      progression: this.progression,
      rhythmPattern: this.rhythmPattern,
    });

    const isDeleteAction = action === "delete";
    const isDeletingLastBar = isDeleteAction
      && Array.isArray(this.bars)
      && this.bars.length > 0
      && barIndex >= this.bars.length - 1;
    const shouldPreserveScroll = ["paste", "duplicate", "delete"].includes(action);
    const scrollSnapshot = shouldPreserveScroll && !isDeletingLastBar
      ? this.buildScrollSnapshot(barIndex)
      : null;
    const shouldScrollToEnd = isDeletingLastBar;
    let highlightBarIndex = barIndex;

    let result = null;
    if (action === "copy") {
      result = this.editor.copy(this.bars, barIndex);
      if (result?.messageId) {
        showMessage(result.messageId, 2000);
      }
      this.requestMenuHighlight(barIndex);
      return;
    } else if (action === "paste") {
      result = this.editor.paste(this.bars, barIndex);
    } else if (action === "duplicate") {
      result = this.editor.duplicate(this.bars, barIndex);
      highlightBarIndex = barIndex + 1;
    } else if (action === "delete") {
      result = this.editor.delete(this.bars, barIndex);
      if (result?.nextBars) {
        highlightBarIndex = Math.min(barIndex, result.nextBars.length - 1);
      }
    }

    if (!result || !result.nextBars) return;
    this.applyBarsUpdate(result.nextBars, {
      scrollSnapshot,
      highlightBarIndex,
      scrollToEnd: shouldScrollToEnd,
    });
    if (result.messageId) {
      showMessage(result.messageId, 2000);
    }
  }

  /**
   * 小節配列を更新して通知する。
   * @param {object[]} nextBars
   * @param {object} options
   */
  applyBarsUpdate(nextBars, {
    scrollSnapshot = null,
    highlightBarIndex = null,
    scrollToEnd = false,
  } = {}) {
    this.bars = Array.isArray(nextBars) ? nextBars : [];
    this.measures = this.bars.length > 0 ? this.bars.length : 1;
    const nextBarCount = this.bars.length > 0 ? this.bars.length : this.measures;
    window.bclickScoreBarCount = nextBarCount;
    this.onBarsChange?.(this.bars, this.measures);
    this.render();
    if (scrollToEnd) {
      this.scheduleScrollToEnd();
    } else if (scrollSnapshot) {
      this.scheduleScrollRestore(scrollSnapshot);
    }
    if (Number.isFinite(highlightBarIndex)) {
      this.requestMenuHighlight(highlightBarIndex);
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
    const nextBarCount = this.bars.length > 0 ? this.bars.length : this.measures;
    window.bclickScoreBarCount = nextBarCount;
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
    const nextBarCount = this.bars.length > 0 ? this.bars.length : this.measures;
    window.bclickScoreBarCount = nextBarCount;
    this.render();
  }

  setTempo(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    this.tempo = parsed;
    this.render();
  }

  setRhythmPattern(value) {
    this.rhythmPattern = Array.isArray(value) ? value : null;
  }

  /**
   * 描画を更新する。
   */
  render() {
    if (!this.container || !window.alphaTab) return;
    this.ui.closeContextMenu();
    this.ui.clearOverlay();
    this.renderer.setData({
      tempo: this.tempo,
      timeSignature: this.timeSignature,
      measures: this.measures,
      barsPerRow: this.barsPerRow,
      progression: this.progression,
      bars: this.bars,
    });
    this.renderer.render();
    this.ui.startOverlayPoll();
  }

  /**
   * オーバーレイの再描画を遅延して実行する。
   * @param {number} delayMs
   */
  requestOverlayRefresh(delayMs = 0) {
    if (!this.ui) return;
    if (this.overlayRefreshTimer) {
      clearTimeout(this.overlayRefreshTimer);
    }
    //Spec alphaTab再描画後のタイミング差でズレるため、遅延して重ね直す
    this.overlayRefreshTimer = window.setTimeout(() => {
      this.ui.handleOverlayRefresh();
      this.overlayRefreshTimer = null;
    }, delayMs);
  }
}

export default RhythmScore;

/*
Spec 小節番号のクリック・タップ操作イベント
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
