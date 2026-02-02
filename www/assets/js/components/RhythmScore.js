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
    this.overlayRefreshTimer = null;

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
   * UIメニュー操作を受け取って処理する。
   * @param {string} action
   * @param {number} barIndex
   */
  handleMenuAction(action, barIndex) {
    if (typeof barIndex !== "number" || barIndex < 0) return;
    if (action === "edit") {
      window.location.href = `/editMeasure.html?bar=${barIndex}`;
      return;
    }

      this.editor.setContext({
        timeSignature: this.timeSignature,
        progression: this.progression,
        rhythmPattern: this.rhythmPattern,
      });

    let result = null;
    if (action === "copy") {
      result = this.editor.copy(this.bars, barIndex);
      if (result?.messageId) {
        showMessage(result.messageId, 2000);
      }
      return;
    } else if (action === "paste") {
      result = this.editor.paste(this.bars, barIndex);
    } else if (action === "duplicate") {
      result = this.editor.duplicate(this.bars, barIndex);
    } else if (action === "delete") {
      result = this.editor.delete(this.bars, barIndex);
    }

    if (!result || !result.nextBars) return;
    this.applyBarsUpdate(result.nextBars);
    if (result.messageId) {
      showMessage(result.messageId, 2000);
    }
  }

  /**
   * 小節配列を更新して通知する。
   * @param {object[]} nextBars
   */
  applyBarsUpdate(nextBars) {
    this.bars = Array.isArray(nextBars) ? nextBars : [];
    this.measures = this.bars.length > 0 ? this.bars.length : 1;
    window.bclickScoreBarCount = this.bars.length;
    this.onBarsChange?.(this.bars, this.measures);
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
