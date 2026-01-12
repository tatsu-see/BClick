/**
 * score.js
 * 画面側のスコア表示ロジック。
 */

import { ConfigStore } from "./store.js";
import RhythmScore from "./RhythmScore.js";
import ScoreData from "./ScoreData.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!window.alphaTab) return;
  const scoreElement = document.getElementById("score");
  if (!scoreElement) return;
  const setClickButton = document.getElementById("setClick");
  const scoreDataOutput = document.getElementById("scoreData");
  const store = new ConfigStore();

  const loadSettings = (resetBars = false) => {
    const savedTimeSignature = store.getScoreTimeSignature();
    const savedMeasures = store.getScoreMeasures();
    const savedProgression = store.getScoreProgression();
    const savedBars = resetBars ? null : store.getScoreBars();
    return new ScoreData({
      timeSignature: savedTimeSignature || "4/4",
      measures: savedMeasures || 2,
      progression: savedProgression || "",
      bars: savedBars || null,
    });
  };

  const renderScoreData = (data) => {
    if (!scoreDataOutput || !data) return;
    scoreDataOutput.value = JSON.stringify(data, null, 2);
  };

  const applyScoreData = (data) => {
    if (!data) return;
    score.setTimeSignature(data.timeSignature);
    score.setMeasures(data.measures);
    score.setProgression(data.progression);
    score.setBars(data.bars);
  };

  const initialSettings = loadSettings();
  const score = new RhythmScore("score", {
    timeSignature: initialSettings.timeSignature,
    chord: "E",
    measures: initialSettings.measures,
    progression: initialSettings.progression,
    bars: initialSettings.bars,
  });
  renderScoreData(initialSettings);

  if (setClickButton) {
    setClickButton.addEventListener("click", () => {
      const nextSettings = loadSettings(true);
      store.setScoreBars(nextSettings.bars);
      renderScoreData(nextSettings);
      applyScoreData(nextSettings);
    });
  }
});
