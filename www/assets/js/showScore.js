import { ConfigStore } from "./store.js";
import RhythmScore from "./RhythmScore.js";
import ScoreData from "./ScoreData.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const scoreElement = document.getElementById("score");
  const scoreArea = document.getElementById("scoreArea");
  const saveButton = document.getElementById("saveShowScore");
  const closePageButton = document.getElementById("closePage");
  const showCodeDiagramButton = document.getElementById("showCodeDiagram");
  let currentScoreData = null;
  let rhythmScore = null;

  const loadSettings = (resetBars = false) => {
    const savedTimeSignature = store.getScoreTimeSignature();
    const savedMeasures = store.getScoreMeasures();
    const savedProgression = store.getScoreProgression();
    const savedBeatPatterns = store.getScoreBeatPatterns();
    const savedBars = resetBars ? null : store.getScoreBars();
    return new ScoreData({
      timeSignature: savedTimeSignature || "4/4",
      measures: savedMeasures || 2,
      progression: savedProgression || "",
      beatPatterns: savedBeatPatterns || null,
      bars: savedBars || null,
    });
  };

  const closePage = () => {
    window.close();
    if (!window.closed) {
      window.location.href = "/";
    }
  };

  if (showCodeDiagramButton) {
    showCodeDiagramButton.addEventListener("click", () => {
      const newTab = window.open("/codeDiagram.html", "_blank", "noopener,noreferrer");
      if (!newTab) {
      // window.location.href = "/codeDiagram.html";
      }
    });
  }

  currentScoreData = loadSettings(true);
  if (scoreElement && window.alphaTab) {
    window.bclickActiveChordIndex = 0;
    rhythmScore = new RhythmScore("score", {
      timeSignature: currentScoreData.timeSignature,
      chord: "E",
      measures: currentScoreData.measures,
      progression: currentScoreData.progression,
      bars: currentScoreData.bars,
    });
    window.bclickRhythmScore = rhythmScore;
  }

  if (scoreArea && rhythmScore) {
    scoreArea.addEventListener("scroll", () => {
      rhythmScore.handleOverlayRefresh();
    }, { passive: true });
  }

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      if (currentScoreData) {
        store.setScoreBars(currentScoreData.bars);
      }
      closePage();
    });
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", closePage);
  }
});
