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
        "現在の楽譜は破棄されます。初期化しますか？",
        "The current score will be discarded. Initialize?",
      ),
    );
    if (!confirmed) return;
    const store = new ConfigStore();
    resetScoreSettings(store);
    window.location.reload();
  };

  initButton.addEventListener("click", handleInit);
});
