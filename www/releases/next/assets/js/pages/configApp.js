/**
 * configApp.js
 * アプリ設定画面（configApp.html）の Back / Done ボタンを制御する。
 * Back: 設定を保存せずに前の画面へ戻る。
 * Done: 設定を保存して前の画面へ戻る。
 * ※現時点では保存対象の設定項目がないため、Back / Done ともに前の画面へ戻る動作となる。
 */
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const backButton = document.getElementById("saveConfigApp");
  const doneButton = document.getElementById("closePage");

  // Back ボタン: 保存せずに戻る
  if (backButton) {
    backButton.addEventListener("click", () => {
      goBackWithFallback();
    });
  }

  // Done ボタン: 設定を保存して戻る
  if (doneButton) {
    doneButton.addEventListener("click", () => {
      // 将来ここに設定保存処理を追加する
      goBackWithFallback();
    });
  }
});
