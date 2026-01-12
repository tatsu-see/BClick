/**
 * オリジナルの簡易楽譜データオブジェクト
 */
class ScoreData {
  constructor({ timeSignature, measures, progression, bars } = {}) {
    this.timeSignature = timeSignature || "4/4";
    this.measures = Number.isNaN(Number.parseInt(measures, 10))
      ? 2
      : Number.parseInt(measures, 10);
    this.progression = progression || "";
    const normalizedBars = this.normalizeBars(bars);
    this.bars = normalizedBars || this.buildBars();
  }

  buildDefaultRhythm() {
    const [numeratorRaw] = this.timeSignature.split("/");
    const numerator = Number.parseInt(numeratorRaw, 10);
    const beats = Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
    return Array.from({ length: beats }, () => "4");
  }

  buildBars() {
    const defaultRhythm = this.buildDefaultRhythm();
    const chords = this.progression.trim().length > 0
      ? this.progression.trim().split(/\s+/)
      : [];

    const bars = [];
    for (let i = 0; i < this.measures; i += 1) {
      const chord = chords.length > 0 ? chords[i % chords.length] : "";
      bars.push({
        chord,
        rhythm: defaultRhythm.slice(),
      });
    }
    return bars;
  }

  normalizeBars(bars) {
    if (!Array.isArray(bars)) return null;
    const defaults = this.buildBars();
    const expectedBeats = this.buildDefaultRhythm().length;
    const normalized = defaults.map((fallback, index) => {
      const source = bars[index];
      if (!source || typeof source !== "object") return fallback;
      const chord = typeof source.chord === "string" ? source.chord : fallback.chord;
      const rhythm = Array.isArray(source.rhythm) && source.rhythm.length > 0
        ? source.rhythm.filter((value) => typeof value === "string" && value.length > 0)
        : fallback.rhythm;
      const duration = rhythm.reduce((total, value) => {
        if (value.endsWith("8")) return total + 0.5;
        if (value.endsWith("4")) return total + 1;
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
