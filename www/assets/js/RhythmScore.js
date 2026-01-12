/**
 * RhythmScore.js
 * alphaTabでリズム譜を表示するクラス
 * 
 * alphaTabは以下のサイトで情報公開している。
 * https://www.alphatab.net/docs/alphatex/bar-metadata#ts。
 */

class RhythmScore {
  constructor(containerId, {
    timeSignature = "4/4",
    chord = "E",
    measures = 2,
    progression = "",
    bars = [],
  } = {}) {
    this.container = document.getElementById(containerId);
    this.timeSignature = timeSignature;
    this.chord = chord;
    this.measures = measures;
    this.progression = this.normalizeProgression(progression);
    this.bars = Array.isArray(bars) ? bars : [];
    this.overlayTimer = null;
    this.handleOverlayRefresh = () => {
      this.clearOverlay();
      this.startOverlayPoll();
    };
    window.addEventListener("resize", this.handleOverlayRefresh);
    window.addEventListener("scroll", this.handleOverlayRefresh, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.handleOverlayRefresh);
    }
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

  setBars(value) {
    this.bars = Array.isArray(value) ? value : [];
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
    const [numeratorRaw, denominatorRaw] = this.timeSignature.split("/");
    const numeratorValue = Number.parseInt(numeratorRaw, 10);
    const denominatorValue = Number.parseInt(denominatorRaw, 10);
    const numerator = Number.isNaN(numeratorValue) || numeratorValue <= 0 ? 4 : numeratorValue;
    const denominator = Number.isNaN(denominatorValue) || denominatorValue <= 0 ? 4 : denominatorValue;
    const beats = numerator;
    const bars = [];
    const barSource = Array.isArray(this.bars) && this.bars.length > 0 ? this.bars : null;
    const barCount = barSource ? barSource.length : this.measures;

    for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
      const notes = [];
      const barData = barSource ? barSource[barIndex] : null;
      const barChord = barData && typeof barData.chord === "string"
        ? barData.chord
        : (this.progression.length > 0
          ? this.progression[barIndex % this.progression.length]
          : this.chord);
      const rhythm = barData && Array.isArray(barData.rhythm) && barData.rhythm.length > 0
        ? barData.rhythm
        : Array.from({ length: beats }, () => "4");
      rhythm.forEach((value, index) => {
        const hasChordLabel = index === 0 && barChord;
        const noteValue = value === "8" ? "0.8" : "0.6";
        const props = hasChordLabel ? `slashed txt "CHORD:${barChord}"` : "slashed";
        notes.push(`${noteValue} { ${props} }`);
      });
      bars.push(notes.join(" "));
    }

    return [
      `\\ts ${numerator} ${denominator}`,
      ".",
      `:${denominator} ${bars.join(" | ")} |`,
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
    const barChords = Array.isArray(this.bars)
      ? this.bars.map((bar) => (typeof bar?.chord === "string" ? bar.chord : ""))
      : [];
    const chordSet = new Set(
      [...barChords, ...this.progression, this.chord].filter((value) => typeof value === "string" && value.length > 0),
    );
    if (chordSet.size === 0) return true;

    this.container.querySelectorAll(".scoreChordOverlayLayer").forEach((layer) => layer.remove());
    const overlay = document.createElement("div");
    overlay.className = "scoreChordOverlayLayer";

    const containerRect = this.container.getBoundingClientRect();
    let found = false;
    let barIndex = 0;

    svgs.forEach((svg) => {
      svg.querySelectorAll("text").forEach((node) => {
        const raw = node.textContent?.trim();
        if (!raw || !raw.startsWith("CHORD:")) return;
        const label = raw.replace("CHORD:", "");
        if (!chordSet.has(label)) return;
        const rect = node.getBoundingClientRect();
        const left = rect.left - containerRect.left;
        const top = rect.top - containerRect.top;
        const currentIndex = barIndex;
        barIndex += 1;

        found = true;
        node.style.opacity = "0";
        node.style.fill = "transparent";
        node.setAttribute("visibility", "hidden");

        const badge = document.createElement("span");
        badge.className = "scoreChordOverlayLabel";
        badge.textContent = label;
        badge.dataset.barIndex = String(currentIndex);
        badge.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          window.location.href = `/editMeasure.html?bar=${currentIndex}`;
        });
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
