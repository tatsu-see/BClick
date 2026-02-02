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

    const bars = [];
    for (let i = 0; i < this.measures; i += 1) {
      const chord = chords.length > 0 ? chords[i % chords.length] : "";
      const beatChords = Array.from({ length: beats }, (_, index) =>
        index === 0 ? chord : "",
      );
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
    const normalized = defaults.map((fallback, index) => {
      const source = bars[index];
      if (!source || typeof source !== "object") return fallback;
      const chord = Array.isArray(source.chord)
        ? source.chord
            .map((value) => (typeof value === "string" ? value : ""))
            .slice(0, expectedBeats)
        : typeof source.chord === "string"
          ? Array.from({ length: expectedBeats }, (_, beatIndex) =>
              beatIndex === 0 ? source.chord : "",
            )
          : fallback.chord;
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
        chord: chord.length < expectedBeats
          ? chord.concat(Array.from({ length: expectedBeats - chord.length }, () => ""))
          : chord,
        rhythm: rhythm.length > 0 && duration === expectedBeats ? rhythm : fallback.rhythm,
      };
    });
    return normalized;
  }
}

export default ScoreData;
