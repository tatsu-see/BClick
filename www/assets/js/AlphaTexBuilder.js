/**
 * AlphaTexBuilder.js
 * スコアデータから alphaTex 文字列を生成するクラス
 */

class AlphaTexBuilder {
  /**
   * コード表記から危険文字を取り除く。
   * @param {string} value
   * @returns {string}
   */
  sanitizeChordLabel(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.replace(/["\\]/g, "");
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
   * alphaTab に表示する楽譜用の文字列を作成する。
   * @param {object} params
   * @param {string} params.timeSignature
   * @param {number} params.measures
   * @param {number|null} params.barsPerRow
   * @param {string[]|string} params.progression
   * @param {Array} params.bars
   * @returns {string}
   */
  buildAlphaTex({ timeSignature, measures, barsPerRow, progression, bars } = {}) {
    const signature = typeof timeSignature === "string" ? timeSignature : "4/4";
    const [numeratorRaw, denominatorRaw] = signature.split("/");
    const numeratorValue = Number.parseInt(numeratorRaw, 10);
    const denominatorValue = Number.parseInt(denominatorRaw, 10);
    const numerator = Number.isNaN(numeratorValue) || numeratorValue <= 0 ? 4 : numeratorValue;
    const denominator = Number.isNaN(denominatorValue) || denominatorValue <= 0 ? 4 : denominatorValue;
    const beats = numerator;
    const barSource = Array.isArray(bars) && bars.length > 0 ? bars : null;
    const barCount = barSource ? barSource.length : Number.isFinite(measures) ? measures : 2;
    const progressionList = this.normalizeProgression(progression);
    const progressionSource = progressionList.length > 0 ? progressionList : null;

    const barTokens = [];
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
        const fallback = progressionSource ? progressionSource[barIndex % progressionSource.length] : "";
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

      rhythm.forEach((value) => {
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
            const divisionToken = currentBeatDivision !== lastBeatDivision
              ? ` :${currentBeatDivision}`
              : "";
            notes[lastNoteIndex] = `${notes[lastNoteIndex]}${divisionToken} - { slashed }`;
            beatProgress += beatLength;
            handledTie = true;
          } else if (isBarHead && barIndex > 0) {
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
          const noteValue = duration === "16" ? "r.16" : duration === "8" ? "r.8" : "r.4";
          const noteText = `${noteValue} { slashed }`;
          notes.push(noteText);
          lastNoteIndex = null;
          beatProgress += beatLength;
        } else {
          const noteValue = duration === "16" ? "C4.16" : duration === "8" ? "C4.8" : "C4.4";
          let props = "slashed";
          if (beatChordLabel && !chordAttached) {
            props += ` ch "${beatChordLabel}"`;
            chordAttached = true;
          }
          const noteText = `${noteValue} { ${props} }`;
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
      });
      barTokens.push(notes.join(" "));
    }

    const layoutLine = Number.isFinite(barsPerRow) && barsPerRow > 0
      ? `\\track { defaultSystemsLayout ${barsPerRow} }`
      : null;

    return [
      layoutLine,
      `\\ts ${numerator} ${denominator}`,
      ".",
      `:${denominator} ${barTokens.join(" | ")} |`,
    ].filter(Boolean).join("\n");
  }
}

export default AlphaTexBuilder;
