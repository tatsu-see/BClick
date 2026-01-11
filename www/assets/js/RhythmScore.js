/**
 * RhythmScore.js
 * alphaTabでリズム譜を表示するクラス。
 */

class RhythmScore {
  constructor(containerId, {
    timeSignature = "4/4",
    chord = "E",
    measures = 2,
    progression = "",
  } = {}) {
    this.container = document.getElementById(containerId);
    this.timeSignature = timeSignature;
    this.chord = chord;
    this.measures = measures;
    this.progression = this.normalizeProgression(progression);
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

  normalizeProgression(value) {
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === "string" && item.length > 0);
    }
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.split(/\s+/) : [];
  }

  buildAlphaTex() {
    const numerator = Number.parseInt(this.timeSignature.split("/")[0], 10);
    const beats = Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
    const bars = [];

    for (let barIndex = 0; barIndex < this.measures; barIndex += 1) {
      const notes = [];
      const barChord = this.progression.length > 0
        ? this.progression[barIndex % this.progression.length]
        : this.chord;
      for (let beatIndex = 0; beatIndex < beats; beatIndex += 1) {
        const hasChordLabel = beatIndex === 0 && barChord;
        const props = hasChordLabel ? `slashed txt "${barChord}"` : "slashed";
        notes.push(`0.6 { ${props} }`);
      }
      bars.push(notes.join(" "));
    }

    return [
      ".",
      `:4 ${bars.join(" | ")} |`,
    ].join("\n");
  }

  render() {
    if (!this.container || !window.alphaTab) return;
    this.container.textContent = "";

    const settings = {
      tex: true,
      display: {
        staveProfile: window.alphaTab.StaveProfile.Score,
        scale: 0.95,
      },
    };

    this.container.textContent = this.buildAlphaTex();
    new window.alphaTab.AlphaTabApi(this.container, settings);
  }
}

export default RhythmScore;
