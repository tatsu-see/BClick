/**
 * score.js
 * 画面側のスコア表示ロジック。
 */

import { ConfigStore } from "../utils/store.js";
import RhythmScore from "../components/RhythmScore.js";
import ScoreData from "../models/ScoreModel.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!window.alphaTab) return;
  const scoreElement = document.getElementById("score");
  if (!scoreElement) return;
  const setClickButton = document.getElementById("setClick");
  const scoreToggle = document.getElementById("scoreToggle");
  const scoreDataOutput = document.getElementById("scoreData");
  const store = new ConfigStore();

  const loadSettings = (resetBars = false) => {
    const savedTimeSignature = store.getScoreTimeSignature();
    const savedMeasures = store.getScoreMeasures();
    const savedProgression = store.getScoreProgression();
    const savedBeatPatterns = store.getScoreBeatPatterns();
    const savedBarsPerRow = store.getScoreBarsPerRow();
    const savedBars = resetBars ? null : store.getScoreBars();
    return new ScoreData({
      timeSignature: savedTimeSignature || "4/4",
      measures: savedMeasures || 8,
      progression: savedProgression || "",
      beatPatterns: savedBeatPatterns || null,
      bars: savedBars || null,
      barsPerRow: savedBarsPerRow || 2,
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
    score.setBarsPerRow(data.barsPerRow || 2);
  };

  const initialSettings = loadSettings();
  const score = new RhythmScore("score", {
    timeSignature: initialSettings.timeSignature,
    chord: "E",
    measures: initialSettings.measures,
    progression: initialSettings.progression,
    bars: initialSettings.bars,
    barsPerRow: initialSettings.barsPerRow || 2,
  });
  renderScoreData(initialSettings);

  if (setClickButton) {
    setClickButton.addEventListener("click", () => {
      if (scoreToggle) {
        if (!scoreToggle.checked) return;
      } else if (store.getScoreEnabled() === false) {
        return;
      }
      const nextSettings = loadSettings(true);
      store.setScoreBars(nextSettings.bars);
      renderScoreData(nextSettings);
      applyScoreData(nextSettings);
    });
  }
});

