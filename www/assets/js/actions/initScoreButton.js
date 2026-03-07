import { ConfigStore } from "../utils/store.js";
import { resetScoreSettings } from "../utils/scoreButtonUtils.js";
import { getLangMsg } from "../../lib/Language.js";

const TIPS_INTRO_DISMISSED_KEY = "bclick.tips.intro.dismissed.v1";
const TIPS_INTRO_SESSION_KEY = `${TIPS_INTRO_DISMISSED_KEY}.session`;

document.addEventListener("DOMContentLoaded", () => {
  const initButton = document.getElementById("initScore");
  if (!initButton) return;

  /**
   * 初期化ボタンの処理。
   */
  const handleInit = () => {

//Spec アプリデータなどを初期化する。
// ・テンポ設定
// ・楽譜設定
// ・楽譜データ
// ・index画面のチュートリアルTips

    const confirmed = window.confirm(
      getLangMsg(
        "現在のテンポや楽譜は破棄されます。初期化してアプリ画面に戻りますか？",
        "All settings and score will be reset. Initialize and return to the app?",
      ),
    );
    if (!confirmed) return;
    const store = new ConfigStore();

    // スコア関連の設定を既定値に戻す（テンポ・拍子・進行など）
    resetScoreSettings(store);

    // クリック音量も既定値(内部値: 1.0、表示上は0〜10で5)へ戻す
    if (typeof store.setClickVolume === "function") {
      store.setClickVolume(1.0);
    }

    // 初回チュートリアル表示抑制フラグを消して、次回起動時にヒント表示状態をリセット
    try {
      localStorage.removeItem(TIPS_INTRO_DISMISSED_KEY);
    } catch (error) {
      ;
    }

    // セッション内のチュートリアル抑制状態も初期化
    try {
      sessionStorage.removeItem(TIPS_INTRO_SESSION_KEY);
    } catch (error) {
      ;
    }
    // 初期化後は index.html へ戻る
    window.location.href = "index.html";
  };

  initButton.addEventListener("click", handleInit);
});
