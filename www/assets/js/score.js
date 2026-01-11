/**
 * score.js
 * alphaTabでリズム譜を表示するクラス。
 */

class RhythmScore {
  constructor(containerId, {
    timeSignature = "4/4",
    chord = "E",
    measures = 2,
  } = {}) {
    this.container = document.getElementById(containerId);
    this.timeSignature = timeSignature;
    this.chord = chord;
    this.measures = measures;
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

  buildAlphaTex() {
    const numerator = Number.parseInt(this.timeSignature.split("/")[0], 10);
    const beats = Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
    const bars = [];

    for (let barIndex = 0; barIndex < this.measures; barIndex += 1) {
      const notes = [];
      for (let beatIndex = 0; beatIndex < beats; beatIndex += 1) {
        const hasChordLabel = barIndex === 0 && beatIndex === 0 && this.chord;
        const props = hasChordLabel ? `slashed txt "${this.chord}"` : "slashed";
        notes.push(`0.6 { ${props} }`);
      }
      bars.push(notes.join(" "));
    }

    return [
      "\\title \"Rhythm\"",
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
      },
    };

    this.container.textContent = this.buildAlphaTex();
    new window.alphaTab.AlphaTabApi(this.container, settings);
  }
}

window.RhythmScore = RhythmScore;

document.addEventListener("DOMContentLoaded", () => {
  if (!window.alphaTab) return;
  if (!document.getElementById("score")) return;

  // リズム譜を表示する。
  new RhythmScore("score", { timeSignature: "4/4", chord: "E", measures: 2 });
});
