import { ConfigStore } from "../utils/store.js";
import {
  buildScoreDataFromStore,
  openEditScorePage,
  saveScoreDataToStore,
} from "../utils/scoreButtonUtils.js";

document.addEventListener("DOMContentLoaded", () => {
  const createButton = document.getElementById("setClick");
  if (!createButton) return;

  /**
   * 新規作成ボタンの処理。
   */
  const handleCreate = () => {
    const confirmed = window.confirm("現在の楽譜は保存せずに破棄されます。新規作成しますか？");
    if (!confirmed) return;
    const store = new ConfigStore();
    const scoreData = buildScoreDataFromStore(store, { resetBars: true });
    saveScoreDataToStore(store, scoreData);
    openEditScorePage();
  };

  createButton.addEventListener("click", handleCreate);
});
