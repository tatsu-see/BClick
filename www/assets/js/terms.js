import { ensureInAppNavigation, goBackWithFallback } from "./navigationGuard.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const closePageButton = document.getElementById("closePage");

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      goBackWithFallback();
    });
  }
});
