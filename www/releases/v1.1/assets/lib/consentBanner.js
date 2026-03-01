/**
 * index.html の同意バナーを初期化するライブラリ。
 *
 * 【使い方】
 * - consentManager.js を読み込んだ上でこのファイルを読み込む。
 * - initConsentBanner(...) を DOMContentLoaded で呼ぶ。
 */
import { initConsentBanner } from "./consentManager.js";

document.addEventListener("DOMContentLoaded", () => {
  initConsentBanner({
    bannerId: "consentBanner",
    acceptId: "consentAccept",
    declineId: "consentDecline",
    measurementId: "G-GW9DB782DZ",
  });
});
