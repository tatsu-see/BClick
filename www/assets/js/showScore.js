import { ConfigStore } from "./store.js";
import RhythmScore from "./RhythmScore.js";
import ScoreData from "./ScoreData.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const scoreElement = document.getElementById("score");
  const scoreArea = document.getElementById("scoreArea");
  const saveButton = document.getElementById("saveShowScore");
  const backButton = document.getElementById("backShowScore");
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

  /**
   * 戻るボタンの処理。(現状は未実装のため空にしておく。)
   */
  const handleBack = () => {
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
  if (store.getScoreEnabled() === false) {
    // 仕様: リズム表示がOFFならクリックUIのみ表示し、楽譜エリアは隠す。
    if (scoreArea) {
      scoreArea.hidden = true;
    }
  } else if (scoreElement && window.alphaTab) {
    window.bclickActiveChordIndex = -1;
    rhythmScore = new RhythmScore("score", {
      timeSignature: currentScoreData.timeSignature,
      chord: "E",
      measures: currentScoreData.measures,
      progression: currentScoreData.progression,
      bars: currentScoreData.bars,
    });
    window.bclickRhythmScore = rhythmScore;
    if (Array.isArray(currentScoreData.bars)) {
      window.bclickScoreBarCount = currentScoreData.bars.length;
    }
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

  if (backButton) {
    backButton.addEventListener("click", handleBack);
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", closePage);
  }
});
