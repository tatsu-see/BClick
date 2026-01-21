import { ConfigStore } from "./store.js";
import {
  buildScoreDataFromObject,
  mergeBars,
  readScoreFile,
} from "./scoreButtonUtils.js";

document.addEventListener("DOMContentLoaded", () => {
  const mergeButton = document.getElementById("mergeScore");
  const mergeInput = document.getElementById("mergeScoreFile");
  if (!mergeButton || !mergeInput) return;

  /**
   * 追加ボタンの処理。
   */
  const handleMergeClick = () => {
    mergeInput.value = "";
    mergeInput.click();
  };

  /**
   * 追加ファイル選択後の処理。
   */
  const handleMergeChange = async () => {
    const file = mergeInput.files && mergeInput.files[0];
    if (!file) return;
    try {
      const rawData = await readScoreFile(file);
      const incomingScore = buildScoreDataFromObject(rawData);
      const store = new ConfigStore();
      const currentBars = store.getScoreBars();
      const mergedBars = mergeBars(currentBars, incomingScore.bars);
      const mergedMeasures = mergedBars.length > 0
        ? mergedBars.length
        : store.getScoreMeasures() || incomingScore.measures;
      store.setScoreBars(mergedBars);
      store.setScoreMeasures(mergedMeasures);
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`追加に失敗しました: ${message}`);
    }
  };

  mergeButton.addEventListener("click", handleMergeClick);
  mergeInput.addEventListener("change", handleMergeChange);
});


