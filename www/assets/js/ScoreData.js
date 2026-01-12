/**
 * オリジナルの簡易楽譜データオブジェクト
 */
class ScoreData {
  constructor({ timeSignature, measures, progression } = {}) {
    this.timeSignature = timeSignature || "4/4";
    this.measures = Number.isNaN(Number.parseInt(measures, 10))
      ? 2
      : Number.parseInt(measures, 10);
    this.progression = progression || "";
    this.bars = this.buildBars();
  }

  buildBars() {
    const [numeratorRaw] = this.timeSignature.split("/");
    const numerator = Number.parseInt(numeratorRaw, 10);
    const beats = Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
    const defaultRhythm = Array.from({ length: beats }, () => "4");
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
}

export default ScoreData;
