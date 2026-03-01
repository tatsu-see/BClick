/**
 * tips.js
 * Tips ボタンと dialog を関連付け、画面内で補足説明を開閉する。
 */

document.addEventListener("DOMContentLoaded", () => {
  const tipButtons = document.querySelectorAll("[data-tip-target]");
  if (tipButtons.length === 0) return;

  /**
   * 対象 dialog を開く。
   * @param {HTMLDialogElement} dialog
   */
  const openDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }
    dialog.setAttribute("open", "");
  };

  /**
   * 対象 dialog を閉じる。
   * @param {HTMLDialogElement} dialog
   */
  const closeDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.close === "function") {
      dialog.close();
      return;
    }
    dialog.removeAttribute("open");
  };

  tipButtons.forEach((button) => {
    const targetId = button.getAttribute("data-tip-target");
    if (!targetId) return;
    const dialog = document.getElementById(targetId);
    if (!(dialog instanceof HTMLDialogElement)) return;

    button.addEventListener("click", () => {
      openDialog(dialog);
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        closeDialog(dialog);
      }
    });

    dialog.querySelectorAll("[data-tip-close]").forEach((closeButton) => {
      closeButton.addEventListener("click", () => {
        closeDialog(dialog);
      });
    });
  });
});
