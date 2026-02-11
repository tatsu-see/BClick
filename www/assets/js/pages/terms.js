/**
 * 利用規約画面の戻る操作と同意設定ダイアログを制御する。
 */
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";
import { initConsentDialog } from "../../lib/consentManager.js";

document.addEventListener("DOMContentLoaded", () => {
  if (document.referrer) {
    if (!ensureInAppNavigation()) return;
  }

  const closePageButton = document.getElementById("closePage");

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      goBackWithFallback();
    });
  }

  initConsentDialog({
    openButtonId: "openConsentDialog",
    dialogId: "consentDialog",
    acceptId: "consentAccept",
    declineId: "consentDecline",
    statusId: "consentStatus",
  });
});
