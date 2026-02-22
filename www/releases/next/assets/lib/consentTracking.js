/**
 * index.html 以外のページで、同意済みの場合に GA を読み込むライブラリ。
 *
 * 【使い方】
 * - consentManager.js を読み込んだ上でこのファイルを読み込む。
 * - DOMContentLoaded で initConsentTracking(...) を呼ぶ。
 */
import { initConsentTracking } from "./consentManager.js";

document.addEventListener("DOMContentLoaded", () => {
  initConsentTracking({ measurementId: "G-GW9DB782DZ" });
});
