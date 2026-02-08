import { APP_LIMITS } from "../constants/appConstraints.js";

/**
 * オリジナルの簡易楽譜データオブジェクト
 * - 楽譜の作成ボタンで、楽譜を生成する基データとして使うのが主な目的。
 * - この形式が、小節の編集にもデータ形式として使えるから、小節編集時にも使っているが、こちらはサブ目的。
 */
class ScoreData {
  constructor({ tempo, clickCount, countIn, timeSignature, measures, progression, bars, rhythmPattern, barsPerRow, scoreEnabled } = {}) {
    this.tempo = Number.isNaN(Number.parseInt(tempo, 10)) ? 60 : Number.parseInt(tempo, 10);
    this.clickCount = Number.isNaN(Number.parseInt(clickCount, 10)) ? 4 : Number.parseInt(clickCount, 10);
    this.countIn = Number.isNaN(Number.parseInt(countIn, 10)) ? 4 : Number.parseInt(countIn, 10);
    this.timeSignature = timeSignature || "4/4";
    this.measures = Number.isNaN(Number.parseInt(measures, 10))
      ? 2
      : Number.parseInt(measures, 10);
    this.progression = progression || "";
    const parsedBarsPerRow = Number.parseInt(barsPerRow, 10);
    this.barsPerRow = Number.isNaN(parsedBarsPerRow)
      ? 2
      : Math.max(1, Math.min(4, parsedBarsPerRow));
    this.scoreEnabled = typeof scoreEnabled === "boolean" ? scoreEnabled : true;
    this.rhythmPattern = Array.isArray(rhythmPattern) ? rhythmPattern : null;
    const normalizedBars = this.normalizeBars(bars);
    this.bars = normalizedBars || this.buildBars();
  }

  getBeatCount() {
    const [numeratorRaw] = this.timeSignature.split("/");
    const numerator = Number.parseInt(numeratorRaw, 10);
    return Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
  }

  /**
   * 小節内リズムパターンを正規化する。
   */
  normalizeRhythmPattern() {
    const beats = this.getBeatCount();
    const source = Array.isArray(this.rhythmPattern) ? this.rhythmPattern : [];
    const tokens = source
      .filter((value) => typeof value === "string" && value.length > 0)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const total = tokens.reduce((sum, value) => {
      if (value.endsWith("16")) return sum + 0.25;
      if (value.endsWith("8")) return sum + 0.5;
      if (value.endsWith("4")) return sum + 1;
      if (value.endsWith("2")) return sum + 2;
      if (value.endsWith("1")) return sum + 4;
      return sum;
    }, 0);
    if (tokens.length === 0 || Math.abs(total - beats) > 0.001) {
      return Array.from({ length: beats }, () => "4");
    }
    return tokens;
  }

  buildDefaultRhythm() {
    return this.normalizeRhythmPattern();
  }

  buildBars() {
    const defaultRhythm = this.buildDefaultRhythm();
    const beats = this.getBeatCount();
    const chords = this.progression.trim().length > 0
      ? this.progression.trim().split(/\s+/)
      : [];
    const MAX_SUBDIV = APP_LIMITS.beatSubdivMax;
    /**
     * 空の拍内コード配列を生成する。
     * @returns {string[]}
     */
    const buildEmptyChordRow = () => Array.from({ length: MAX_SUBDIV }, () => "");

    const bars = [];
    for (let i = 0; i < this.measures; i += 1) {
      const chord = chords.length > 0 ? chords[i % chords.length] : "";
      const beatChords = Array.from({ length: beats }, (_, index) => {
        const row = buildEmptyChordRow();
        if (index === 0 && chord) {
          row[0] = chord;
        }
        return row;
      });
      bars.push({
        chord: beatChords,
        rhythm: defaultRhythm.slice(),
      });
    }
    return bars;
  }

  normalizeBars(bars) {
    if (!Array.isArray(bars)) return null;
    const defaults = this.buildBars();
    const expectedBeats = this.getBeatCount();
    const MAX_SUBDIV = APP_LIMITS.beatSubdivMax;
    /**
     * 空の拍内コード配列を生成する。
     * @returns {string[]}
     */
    const buildEmptyChordRow = () => Array.from({ length: MAX_SUBDIV }, () => "");
    /**
     * 拍内コード配列を正規化する。
     * @param {unknown} row
     * @returns {string[]}
     */
    const normalizeChordRow = (row) => {
      if (Array.isArray(row)) {
        const normalized = row.map((value) => (typeof value === "string" ? value : ""));
        while (normalized.length < MAX_SUBDIV) {
          normalized.push("");
        }
        return normalized.slice(0, MAX_SUBDIV);
      }
      if (typeof row === "string" && row.length > 0) {
        return [row, ...Array.from({ length: MAX_SUBDIV - 1 }, () => "")];
      }
      return buildEmptyChordRow();
    };
    /**
     * 拍ごとのコード配列を正規化する。
     * @param {unknown} value
     * @returns {string[][]}
     */
    const normalizeBeatChords = (value) => {
      const normalized = [];
      if (Array.isArray(value)) {
        const isMatrix = value.some((item) => Array.isArray(item));
        if (isMatrix) {
          value.forEach((row) => normalized.push(normalizeChordRow(row)));
        } else {
          value.forEach((item) => normalized.push(normalizeChordRow(item)));
        }
      } else if (typeof value === "string" && value.length > 0) {
        normalized.push(normalizeChordRow(value));
      }
      while (normalized.length < expectedBeats) {
        normalized.push(buildEmptyChordRow());
      }
      return normalized.slice(0, expectedBeats);
    };
    const normalized = defaults.map((fallback, index) => {
      const source = bars[index];
      if (!source || typeof source !== "object") return fallback;
      const chord = normalizeBeatChords(source.chord);
      const rhythm = Array.isArray(source.rhythm) && source.rhythm.length > 0
        ? source.rhythm.filter((value) => typeof value === "string" && value.length > 0)
        : fallback.rhythm;
      const duration = rhythm.reduce((total, value) => {
        if (value.endsWith("16")) return total + 0.25;
        if (value.endsWith("8")) return total + 0.5;
        if (value.endsWith("4")) return total + 1;
        if (value.endsWith("2")) return total + 2;
        if (value.endsWith("1")) return total + 4;
        return total;
      }, 0);
      return {
        chord,
        rhythm: rhythm.length > 0 && duration === expectedBeats ? rhythm : fallback.rhythm,
      };
    });
    return normalized;
  }
}

export default ScoreData;
