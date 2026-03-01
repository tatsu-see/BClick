import { ConfigStore } from "../utils/store.js";
import { resetScoreSettings } from "../utils/scoreButtonUtils.js";
import { getLangMsg } from "../../lib/Language.js";

document.addEventListener("DOMContentLoaded", () => {
  const initButton = document.getElementById("initScore");
  if (!initButton) return;

  /**
   * 初期化ボタンの処理。
   */
  const handleInit = () => {
    const confirmed = window.confirm(
      getLangMsg(
        "現在のテンポや楽譜は破棄されます。初期化してアプリ画面に戻りますか？",
        "All settings and score will be reset. Initialize and return to the app?",
      ),
    );
    if (!confirmed) return;
    const store = new ConfigStore();
    resetScoreSettings(store);
    // 初期化後は index.html へ戻る
    window.location.href = "index.html";
  };

  initButton.addEventListener("click", handleInit);
});
