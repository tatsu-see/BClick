/**
 * ScoreBarEditor.js
 * 小節（バー）データの編集操作（コピー/複製/貼り付け/削除）を担当するクラス
 */

import ScoreData from "../models/ScoreModel.js";

class ScoreBarEditor {
  constructor({ timeSignature = "4/4", progression = "", rhythmPattern = null } = {}) {
    this.timeSignature = timeSignature;
    this.progression = progression;
    this.rhythmPattern = rhythmPattern;
    this.copiedBar = null;
  }

  /**
   * 編集対象の前提データを更新する。
   * @param {object} params
   */
  setContext({ timeSignature, progression, rhythmPattern } = {}) {
    if (typeof timeSignature === "string" && timeSignature.length > 0) {
      this.timeSignature = timeSignature;
    }
    if (typeof progression === "string" || Array.isArray(progression)) {
      this.progression = progression;
    }
    if (Array.isArray(rhythmPattern) || rhythmPattern === null) {
      this.rhythmPattern = rhythmPattern;
    }
  }

  /**
   * コピー済みデータを破棄する。
   */
  clearClipboard() {
    this.copiedBar = null;
  }

  /**
   * コピー済みデータがあるか確認する。
   * @returns {boolean}
   */
  hasClipboard() {
    return Boolean(this.copiedBar);
  }

  /**
   * 小節データを複製する。
   * @param {object} bar
   * @returns {object}
   */
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

  /**
   * デフォルト小節データを生成する。
   * @returns {object}
   */
  buildDefaultBar() {
    const scoreData = new ScoreData({
      timeSignature: this.timeSignature,
      measures: 1,
      progression: Array.isArray(this.progression) ? this.progression.join(" ") : this.progression,
      rhythmPattern: this.rhythmPattern,
      bars: null,
    });
    const bars = scoreData.buildBars();
    return bars[0] ? this.cloneBar(bars[0]) : { chord: [], rhythm: [] };
  }

  /**
   * 操作対象の小節が存在するように配列を拡張する。
   * @param {object[]} bars
   * @param {number} barIndex
   */
  ensureIndex(bars, barIndex) {
    while (bars.length <= barIndex) {
      bars.push(this.buildDefaultBar());
    }
  }

  /**
   * 小節をコピーする。
   * @param {object[]} bars
   * @param {number} barIndex
   */
  copy(bars, barIndex) {
    const nextBars = Array.isArray(bars) ? bars.map((bar) => this.cloneBar(bar)) : [];
    this.ensureIndex(nextBars, barIndex);
    this.copiedBar = this.cloneBar(nextBars[barIndex]);
    return {
      nextBars,
      messageId: "barCopyMessage",
    };
  }

  /**
   * 小節を貼り付ける。
   * @param {object[]} bars
   * @param {number} barIndex
   */
  paste(bars, barIndex) {
    if (!this.copiedBar) return null;
    const nextBars = Array.isArray(bars) ? bars.map((bar) => this.cloneBar(bar)) : [];
    this.ensureIndex(nextBars, barIndex);
    nextBars[barIndex] = this.cloneBar(this.copiedBar);
    return {
      nextBars,
      messageId: "barPasteMessage",
    };
  }

  /**
   * 小節を複製する。
   * @param {object[]} bars
   * @param {number} barIndex
   */
  duplicate(bars, barIndex) {
    const nextBars = Array.isArray(bars) ? bars.map((bar) => this.cloneBar(bar)) : [];
    this.ensureIndex(nextBars, barIndex);
    const source = nextBars[barIndex] || this.buildDefaultBar();
    nextBars.splice(barIndex + 1, 0, this.cloneBar(source));
    return {
      nextBars,
      messageId: "barDuplicateMessage",
    };
  }

  /**
   * 小節を削除する。
   * @param {object[]} bars
   * @param {number} barIndex
   */
  delete(bars, barIndex) {
    const nextBars = Array.isArray(bars) ? bars.map((bar) => this.cloneBar(bar)) : [];
    this.ensureIndex(nextBars, barIndex);
    if (nextBars.length > 1) {
      nextBars.splice(barIndex, 1);
    } else {
      nextBars[0] = this.buildDefaultBar();
    }
    return { nextBars };
  }
}

export default ScoreBarEditor;
