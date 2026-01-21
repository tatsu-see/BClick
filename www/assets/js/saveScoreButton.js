import { ConfigStore } from "./store.js";
import {
  buildScoreDataFromStore,
  downloadScoreJson,
} from "./scoreButtonUtils.js";

document.addEventListener("DOMContentLoaded", () => {
  const saveButton = document.getElementById("saveScore");
  if (!saveButton) return;

  /**
   * 保存ボタンの処理。
   */
  const handleSave = () => {
    const store = new ConfigStore();
    const scoreData = buildScoreDataFromStore(store);
    downloadScoreJson(scoreData);
  };

  saveButton.addEventListener("click", handleSave);
});
