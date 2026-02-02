/**
 * オリジナルの簡易楽譜データオブジェクト
 * - 楽譜の作成ボタンで、楽譜を生成する基データとして使うのが主な目的。
 * - この形式が、小節の編集にもデータ形式として使えるから、小節編集時にも使っているが、こちらはサブ目的。
 */
class ScoreData {
  constructor({ tempo, clickCount, countIn, timeSignature, measures, progression, bars, beatPatterns, barsPerRow, scoreEnabled } = {}) {
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
    this.beatPatterns = Array.isArray(beatPatterns) ? beatPatterns : null;
    const normalizedBars = this.normalizeBars(bars);
    this.bars = normalizedBars || this.buildBars();
  }

  getBeatCount() {
    const [numeratorRaw] = this.timeSignature.split("/");
    const numerator = Number.parseInt(numeratorRaw, 10);
    return Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
  }

  /**
   * リズムパターンを正規化する。
   */
  normalizeBeatPatterns() {
    const beats = this.getBeatCount();
    const source = Array.isArray(this.beatPatterns) ? this.beatPatterns : [];
    const mapLegacyPattern = (value) => {
      switch (value) {
        case "restQuarter":
          return { division: 4, pattern: ["rest"] };
        case "eighths":
          return { division: 8, pattern: ["note", "note"] };
        case "eighthRest":
          return { division: 8, pattern: ["note", "rest"] };
        case "restEighth":
          return { division: 8, pattern: ["rest", "note"] };
        case "quarter":
        default:
          return { division: 4, pattern: ["note"] };
      }
    };
    const normalizeItem = (item) => {
      if (typeof item === "string") {
        return mapLegacyPattern(item);
      }
      if (!item || typeof item !== "object") {
        return { division: 4, pattern: ["note"] };
      }
      const divisionRaw = Number.parseInt(item.division, 10);
      const division = [1, 2, 4, 8, 16].includes(divisionRaw) ? divisionRaw : 4;
      const expectedLength = division === 16 ? 4 : division === 8 ? 2 : 1;
      const rawPattern = Array.isArray(item.pattern) ? item.pattern : [];
      const normalized = rawPattern
        .map((value) =>
          value === "rest" || value === "tie" || value === "tieNote" ? value : "note",
        )
        .slice(0, expectedLength);
      while (normalized.length < expectedLength) {
        normalized.push("note");
      }
      if (division !== 16) {
        return {
          division,
          pattern: normalized.map((value, index) => {
            if (value === "rest") return "rest";
            if (value === "tieNote" && index === 0) return "tieNote";
            return "note";
          }),
        };
      }
      if (normalized[0] === "tie") {
        normalized[0] = "note";
      }
      return { division, pattern: normalized };
    };
    return Array.from({ length: beats }, (_, index) => normalizeItem(source[index]));
  }

  /**
   * 1拍分のリズム配列を生成する。
   */
  buildRhythmFromPattern(patternItem) {
    const division = patternItem.division;
    const pattern = Array.isArray(patternItem.pattern) ? patternItem.pattern : ["note"];
    if (division === 1) {
      if (pattern[0] === "rest") {
        return ["r1"];
      }
      if (pattern[0] === "tieNote") {
        return ["t1"];
      }
      return ["1"];
    }
    if (division === 2) {
      if (pattern[0] === "rest") {
        return ["r2"];
      }
      if (pattern[0] === "tieNote") {
        return ["t2"];
      }
      return ["2"];
    }
    if (division === 4) {
      if (pattern[0] === "rest") {
        return ["r4"];
      }
      if (pattern[0] === "tieNote") {
        return ["t4"];
      }
      return ["4"];
    }
    if (division === 8) {
      return pattern.slice(0, 2).map((value, index) => {
        if (value === "rest") return "r8";
        if (index === 0 && value === "tieNote") return "t8";
        return "8";
      });
    }
    const converted = [];
    let lastType = null;
    pattern.slice(0, 4).forEach((value, index) => {
      if (value === "tie") {
        // 休符の後ろにタイが来た場合は休符が続く扱いにする。
        if (lastType === "rest") {
          converted.push("r16");
          lastType = "rest";
          return;
        }
        converted.push("t16");
        lastType = "tie";
        return;
      }
      const nextValue = value === "rest" ? "r16" : "16";
      if (index === 0 && value === "tieNote") {
        converted.push("t16");
        lastType = "tie";
        return;
      }
      converted.push(nextValue);
      lastType = value === "rest" ? "rest" : "note";
    });
    return converted;
  }

  buildDefaultRhythm() {
    const beats = this.getBeatCount();
    const patterns = this.normalizeBeatPatterns();
    const rhythm = [];
    for (let i = 0; i < beats; i += 1) {
      const patternItem = patterns[i] || { division: 4, pattern: ["note"] };
      rhythm.push(...this.buildRhythmFromPattern(patternItem));
    }
    return rhythm;
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
