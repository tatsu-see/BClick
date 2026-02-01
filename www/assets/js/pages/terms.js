import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";

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
});
