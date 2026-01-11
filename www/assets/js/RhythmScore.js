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
    this.overlayTimer = null;
    this.handleResize = () => {
      this.clearOverlay();
      this.startOverlayPoll();
    };
    window.addEventListener("resize", this.handleResize);
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
        const props = hasChordLabel ? `slashed txt "CHORD:${barChord}"` : "slashed";
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
    this.clearOverlay();

    const settings = {
      tex: true,
      display: {
        staveProfile: window.alphaTab.StaveProfile.Score,
        scale: 0.95,
      },
    };

    this.container.textContent = this.buildAlphaTex();
    new window.alphaTab.AlphaTabApi(this.container, settings);
    this.startOverlayPoll();
  }

  clearOverlay() {
    if (!this.container) return;
    this.container.querySelectorAll(".scoreChordOverlayLayer").forEach((layer) => layer.remove());
    if (this.overlayTimer) {
      clearInterval(this.overlayTimer);
      this.overlayTimer = null;
    }
  }

  startOverlayPoll() {
    if (this.overlayTimer) return;
    let attempts = 0;
    this.overlayTimer = setInterval(() => {
      attempts += 1;
      const done = this.renderOverlay();
      if (done || attempts >= 30) {
        clearInterval(this.overlayTimer);
        this.overlayTimer = null;
      }
    }, 50);
  }

  renderOverlay() {
    if (!this.container) return false;
    const svgs = Array.from(this.container.querySelectorAll("svg"));
    if (svgs.length === 0) return false;
    const chordSet = new Set(
      [...this.progression, this.chord].filter((value) => typeof value === "string" && value.length > 0),
    );
    if (chordSet.size === 0) return true;

    this.container.querySelectorAll(".scoreChordOverlayLayer").forEach((layer) => layer.remove());
    const overlay = document.createElement("div");
    overlay.className = "scoreChordOverlayLayer";

    const containerRect = this.container.getBoundingClientRect();
    let found = false;

    svgs.forEach((svg) => {
      svg.querySelectorAll("text").forEach((node) => {
        const raw = node.textContent?.trim();
        if (!raw || !raw.startsWith("CHORD:")) return;
        const label = raw.replace("CHORD:", "");
        if (!chordSet.has(label)) return;
        const rect = node.getBoundingClientRect();
        const left = rect.left - containerRect.left;
        const top = rect.top - containerRect.top;

        found = true;
        node.style.opacity = "0";
        node.style.fill = "transparent";
        node.setAttribute("visibility", "hidden");

        const badge = document.createElement("span");
        badge.className = "scoreChordOverlayLabel";
        badge.textContent = label;
        badge.style.left = `${left}px`;
        badge.style.top = `${top}px`;
        overlay.appendChild(badge);
      });
    });

    if (found) {
      this.container.appendChild(overlay);
    }

    return found;
  }
}

export default RhythmScore;
