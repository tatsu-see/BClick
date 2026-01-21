import { ConfigStore } from "./store.js";
import {
  buildScoreDataFromObject,
  readScoreFile,
  saveScoreDataToStore,
} from "./scoreButtonUtils.js";

document.addEventListener("DOMContentLoaded", () => {
  const loadButton = document.getElementById("loadScore");
  const loadInput = document.getElementById("loadScoreFile");
  if (!loadButton || !loadInput) return;

  /**
   * 読み込みボタンの処理。
   */
  const handleLoadClick = () => {
    loadInput.value = "";
    loadInput.click();
  };

  /**
   * ファイル選択後の処理。
   */
  const handleLoadChange = async () => {
    const file = loadInput.files && loadInput.files[0];
    if (!file) return;
    try {
      const rawData = await readScoreFile(file);
      const scoreData = buildScoreDataFromObject(rawData);
      const store = new ConfigStore();
      saveScoreDataToStore(store, scoreData);
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`読み込みに失敗しました: ${message}`);
    }
  };

  loadButton.addEventListener("click", handleLoadClick);
  loadInput.addEventListener("change", handleLoadChange);
});
