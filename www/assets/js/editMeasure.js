
import { ConfigStore } from "./store.js";
import ScoreData from "./ScoreData.js";

document.addEventListener("DOMContentLoaded", () => {
  const closePageButton = document.getElementById("closePage");
  const saveButton = document.getElementById("saveConfigScore");
  const chordButtons = Array.from(document.querySelectorAll(".chipButton"));
  const store = new ConfigStore();

  const params = new URLSearchParams(window.location.search);
  const barParam = Number.parseInt(params.get("bar"), 10);
  const barIndex = Number.isNaN(barParam) ? 0 : Math.max(0, barParam);

  const savedTimeSignature = store.getScoreTimeSignature();
  const savedMeasures = store.getScoreMeasures();
  const savedProgression = store.getScoreProgression();
  const savedBars = store.getScoreBars();
  const scoreData = new ScoreData({
    timeSignature: savedTimeSignature || "4/4",
    measures: savedMeasures || 2,
    progression: savedProgression || "",
    bars: savedBars || null,
  });

  const bars = scoreData.bars;
  const safeBarIndex = Math.min(barIndex, Math.max(0, bars.length - 1));
  const currentChord = bars[safeBarIndex]?.chord || "";
  let selectedChord = currentChord;

  const updateSelection = (value) => {
    selectedChord = value;
    chordButtons.forEach((button) => {
      button.classList.toggle(
        "isSelected",
        (button.dataset.chord || button.textContent.trim()) === selectedChord,
      );
    });
  };

  updateSelection(currentChord);

  chordButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const chord = button.dataset.chord || button.textContent.trim();
      if (!chord) return;
      updateSelection(chord);
    });
  });

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      const targetBar = bars[safeBarIndex];
      if (targetBar && selectedChord) {
        targetBar.chord = selectedChord;
      }
      store.setScoreBars(bars);
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }
});
