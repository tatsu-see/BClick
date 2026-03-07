/**
 * tips.js
 * Tips ボタンと dialog を関連付け、画面内で補足説明を開閉する。
 */

document.addEventListener("DOMContentLoaded", () => {
  const tipButtons = document.querySelectorAll("[data-tip-target]");
  const introDialogs = document.querySelectorAll("[data-tip-intro-key]");

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

  /**
   * 初回案内ダイアログの「次回から表示しない」を保存する。
   * @param {HTMLDialogElement} dialog
   */
  const persistIntroDismissal = (dialog) => {
    if (!(dialog instanceof HTMLDialogElement)) return;
    const storageKey = dialog.getAttribute("data-tip-intro-key");
    if (!storageKey) return;

    const checkbox = dialog.querySelector("[data-tip-intro-dismiss]");
    if (!(checkbox instanceof HTMLInputElement)) return;
    if (!checkbox.checked) return;

    try {
      localStorage.setItem(storageKey, "true");
    } catch (error) {
      ;
    }
  };

  /**
   * dialog の共通閉じる操作を結び付ける。
   * @param {HTMLDialogElement} dialog
   */
  const attachDialogCloseHandlers = (dialog) => {
    if (!(dialog instanceof HTMLDialogElement)) return;

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        persistIntroDismissal(dialog);
        closeDialog(dialog);
      }
    });

    dialog.querySelectorAll("[data-tip-close]").forEach((closeButton) => {
      closeButton.addEventListener("click", () => {
        persistIntroDismissal(dialog);
        closeDialog(dialog);
      });
    });
  };

  tipButtons.forEach((button) => {
    const targetId = button.getAttribute("data-tip-target");
    if (!targetId) return;
    const dialog = document.getElementById(targetId);
    if (!(dialog instanceof HTMLDialogElement)) return;

    button.addEventListener("click", () => {
      openDialog(dialog);
    });
    attachDialogCloseHandlers(dialog);
  });

  introDialogs.forEach((dialog) => {
    if (!(dialog instanceof HTMLDialogElement)) return;
    const storageKey = dialog.getAttribute("data-tip-intro-key");
    if (!storageKey) return;
    const sessionKey = `${storageKey}.session`;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey) === "true";
    } catch (error) {
      dismissed = false;
    }
    if (dismissed) return;

    let shownThisSession = false;
    try {
      shownThisSession = sessionStorage.getItem(sessionKey) === "true";
    } catch (error) {
      shownThisSession = false;
    }
    if (shownThisSession) return;

    try {
      sessionStorage.setItem(sessionKey, "true");
    } catch (error) {
      ;
    }

    attachDialogCloseHandlers(dialog);

    dialog.addEventListener("cancel", () => {
      persistIntroDismissal(dialog);
    });

    dialog.addEventListener("close", () => {
      persistIntroDismissal(dialog);
    });

    openDialog(dialog);
  });
});
