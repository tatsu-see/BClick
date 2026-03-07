import { ConfigStore } from "../utils/store.js";
import {
  buildScoreDataFromStore,
  openEditScorePage,
  saveScoreDataToStore,
} from "../utils/scoreButtonUtils.js";
import { getLangMsg } from "../../lib/Language.js";

document.addEventListener("DOMContentLoaded", () => {
  const createButton = document.getElementById("setClick");
  if (!createButton) return;

  /**
   * 新規作成ボタンの処理。
   */
  const handleCreate = () => {
    const confirmed = window.confirm(
      getLangMsg(
        "現在の楽譜は保存せずに破棄されます。新規作成しますか？",
        "The current score will be discarded without saving. Create a new score?",
      ),
    );
    if (!confirmed) return;
    const store = new ConfigStore();
    const scoreData = buildScoreDataFromStore(store, { resetBars: true });
    if (typeof store.setEditScoreSettingsEnabled === "function") {
      // 新規作成時は調節トグルを初期値(OFF)へ戻す
      store.setEditScoreSettingsEnabled(false);
    }
    saveScoreDataToStore(store, scoreData);
    openEditScorePage();
  };

  createButton.addEventListener("click", handleCreate);
});
