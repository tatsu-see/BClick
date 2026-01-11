/**
 * score.js
 * 画面側のスコア表示ロジック。
 */

import { ConfigStore } from "./store.js";
import RhythmScore from "./RhythmScore.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!window.alphaTab) return;
  const scoreElement = document.getElementById("score");
  if (!scoreElement) return;
  const setClickButton = document.getElementById("setClick");
  const store = new ConfigStore();

  const loadSettings = () => {
    const savedTimeSignature = store.getScoreTimeSignature();
    const savedMeasures = store.getScoreMeasures();
    return {
      timeSignature: savedTimeSignature || "4/4",
      measures: savedMeasures || 2,
    };
  };

  // リズム譜を表示する。
  const initialSettings = loadSettings();
  const score = new RhythmScore("score", {
    timeSignature: initialSettings.timeSignature,
    chord: "E",
    measures: initialSettings.measures,
  });

  if (setClickButton) {
    setClickButton.addEventListener("click", () => {
      const nextSettings = loadSettings();
      score.setTimeSignature(nextSettings.timeSignature);
      score.setMeasures(nextSettings.measures);
    });
  }
});
