import { ConfigStore } from "./store.js";
import { resetScoreSettings } from "./scoreButtonUtils.js";

document.addEventListener("DOMContentLoaded", () => {
  const initButton = document.getElementById("initScore");
  if (!initButton) return;

  /**
   * 初期化ボタンの処理。
   */
  const handleInit = () => {
    const confirmed = window.confirm("現在の楽譜は破棄されます。初期化しますか？");
    if (!confirmed) return;
    const store = new ConfigStore();
    resetScoreSettings(store);
    window.location.reload();
  };

  initButton.addEventListener("click", handleInit);
});
