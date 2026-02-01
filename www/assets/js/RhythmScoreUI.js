/**
 * RhythmScoreUI.js
 * リズム譜のオーバーレイとコンテキストメニューUIを担当するクラス
 */

class RhythmScoreUI {
  constructor(container, { getSvgs, onAction, canPaste } = {}) {
    this.container = container;
    this.getSvgs = getSvgs;
    this.onAction = onAction;
    this.canPaste = canPaste;
    this.overlayTimer = null;
    this.contextMenu = null;
    this.contextMenuItems = [];
    this.contextMenuPointerId = null;
    this.handleMenuPointerMove = null;
    this.handleMenuPointerUp = null;
    this.handleOutsidePointerDown = null;
    this.handleOverlayRefresh = () => {
      this.clearOverlay();
      this.startOverlayPoll();
    };
  }

  /**
   * UIイベントを登録する。
   */
  attach() {
    window.addEventListener("resize", this.handleOverlayRefresh);
    window.addEventListener("scroll", this.handleOverlayRefresh, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.handleOverlayRefresh);
    }
  }

  /**
   * UIイベントを解除する。
   */
  detach() {
    window.removeEventListener("resize", this.handleOverlayRefresh);
    window.removeEventListener("scroll", this.handleOverlayRefresh);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", this.handleOverlayRefresh);
    }
  }

  /**
   * 現在の言語を取得する。
   * @returns {string}
   */
  getPreferredLang() {
    const lang = navigator.language || navigator.userLanguage || "en";
    return lang.startsWith("ja") ? "ja" : "en";
  }

  /**
   * メニュー表示用の文字列を取得する。
   * @param {string} key
   * @returns {string}
   */
  getMenuLabel(key) {
    const isJa = this.getPreferredLang() === "ja";
    const labels = {
      edit: { ja: "編集", en: "Edit" },
      copy: { ja: "コピー", en: "Copy" },
      duplicate: { ja: "複製", en: "Duplicate" },
      paste: { ja: "貼り付け", en: "Paste" },
      delete: { ja: "削除", en: "Delete" },
    };
    return labels[key] ? labels[key][isJa ? "ja" : "en"] : key;
  }

  /**
   * 確認ダイアログの文字列を取得する。
   * @returns {string}
   */
  getDeleteConfirmMessage() {
    return this.getPreferredLang() === "ja"
      ? "この小節を削除しますか？"
      : "Delete this bar?";
  }

  /**
   * SVG内のコード文字だけを拡大する。
   * @param {SVGElement[]} svgs
   * @param {number} scalePercent
   */
  scaleSvgChordText(svgs, scalePercent = 150) {
    const svgList = Array.isArray(svgs) ? svgs : [];
    if (svgList.length === 0) return;
    const multiplier = scalePercent / 100;
    svgList.forEach((svg) => {
      svg.querySelectorAll("text").forEach((node) => {
        const raw = node.textContent?.trim();
        if (!raw || !/^[A-Za-z][A-Za-z0-9#b]{0,7}$/.test(raw)) return;
        let baseSize = node.dataset.baseFontSize;
        if (!baseSize) {
          const currentSize = node.style.fontSize
            || (window.getComputedStyle ? window.getComputedStyle(node).fontSize : "");
          const match = String(currentSize).trim().match(/^([\d.]+)([a-z%]+)$/i);
          if (!match) return;
          baseSize = `${match[1]}${match[2]}`;
          node.dataset.baseFontSize = baseSize;
        }
        const baseMatch = String(baseSize).trim().match(/^([\d.]+)([a-z%]+)$/i);
        if (!baseMatch) return;
        const value = Number.parseFloat(baseMatch[1]);
        const unit = baseMatch[2];
        if (!Number.isFinite(value) || !unit) return;
        node.style.fontSize = `${value * multiplier}${unit}`;
      });
    });
  }

  /**
   * contextMenu を生成する。
   */
  ensureContextMenu() {
    if (!this.container) return;
    if (this.contextMenu && this.container.contains(this.contextMenu)) return;
    const menu = document.createElement("div");
    menu.className = "scoreContextMenu";
    menu.setAttribute("role", "menu");

    const list = document.createElement("div");
    list.className = "scoreContextMenuList";
    const actions = ["edit", "copy", "duplicate", "paste", "delete"];
    actions.forEach((action) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "scoreContextMenuItem";
      item.dataset.action = action;
      item.setAttribute("role", "menuitem");
      item.textContent = this.getMenuLabel(action);
      list.appendChild(item);
    });
    menu.appendChild(list);
    menu.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    this.container.appendChild(menu);
    this.contextMenu = menu;
    this.contextMenuItems = Array.from(menu.querySelectorAll(".scoreContextMenuItem"));
  }

  /**
   * contextMenu を閉じる。
   */
  closeContextMenu() {
    if (!this.contextMenu) return;
    this.contextMenu.classList.remove("isVisible");
    this.setActiveMenuItem(null);
    if (this.handleMenuPointerMove) {
      window.removeEventListener("pointermove", this.handleMenuPointerMove);
    }
    if (this.handleMenuPointerUp) {
      window.removeEventListener("pointerup", this.handleMenuPointerUp);
      window.removeEventListener("pointercancel", this.handleMenuPointerUp);
    }
    if (this.handleOutsidePointerDown) {
      window.removeEventListener("pointerdown", this.handleOutsidePointerDown, true);
    }
  }

  /**
   * contextMenu のアクティブ表示を更新する。
   * @param {HTMLElement|null} targetItem
   */
  setActiveMenuItem(targetItem) {
    this.contextMenuItems.forEach((item) => {
      const isActive = item === targetItem;
      item.classList.toggle("isActive", isActive);
    });
  }

  /**
   * ドラッグ位置からメニューを選択する。
   * @param {number} clientX
   * @param {number} clientY
   */
  updateActiveMenuFromPoint(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    const item = target ? target.closest(".scoreContextMenuItem") : null;
    if (item && item.classList.contains("isDisabled")) {
      this.setActiveMenuItem(null);
      return;
    }
    this.setActiveMenuItem(item);
  }

  /**
   * contextMenu を表示する。
   * @param {object} params
   */
  openContextMenu({ left, top }) {
    if (!this.container) return;
    this.ensureContextMenu();
    if (!this.contextMenu) return;
    const canPaste = typeof this.canPaste === "function" ? this.canPaste() : false;
    this.contextMenuItems.forEach((item) => {
      const isPaste = item.dataset.action === "paste";
      item.classList.toggle("isDisabled", isPaste && !canPaste);
    });
    this.contextMenu.style.left = `${left}px`;
    this.contextMenu.style.top = `${top}px`;
    this.contextMenu.classList.add("isVisible");

    const menuRect = this.contextMenu.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const maxLeft = Math.max(0, containerRect.width - menuRect.width - 4);
    const maxTop = Math.max(0, containerRect.height - menuRect.height - 4);
    const clampedLeft = Math.max(4, Math.min(left, maxLeft));
    const clampedTop = Math.max(4, Math.min(top, maxTop));
    this.contextMenu.style.left = `${clampedLeft}px`;
    this.contextMenu.style.top = `${clampedTop}px`;
  }

  /**
   * オーバーレイを消去する。
   */
  clearOverlay() {
    if (!this.container) return;
    this.container.querySelectorAll(".scoreChordOverlayLayer").forEach((layer) => layer.remove());
    if (this.overlayTimer) {
      clearInterval(this.overlayTimer);
      this.overlayTimer = null;
    }
  }

  /**
   * オーバーレイの描画を待つ。
   */
  startOverlayPoll() {
    if (this.overlayTimer) return;
    let attempts = 0;
    this.overlayTimer = setInterval(() => {
      attempts += 1;
      const done = this.renderOverlay();
      if (done || attempts >= 30) {
        clearInterval(this.overlayTimer);
        this.overlayTimer = null;
      }
    }, 50);
  }

  /**
   * オーバーレイを描画する。
   * @returns {boolean}
   */
  renderOverlay() {
    if (!this.container) return false;
    const svgs = typeof this.getSvgs === "function" ? this.getSvgs() : [];
    if (!Array.isArray(svgs) || svgs.length === 0) return false;
    this.container.querySelectorAll(".scoreChordOverlayLayer").forEach((layer) => layer.remove());
    this.scaleSvgChordText(svgs, 150);
    const overlay = document.createElement("div");
    overlay.className = "scoreChordOverlayLayer";

    const containerRect = this.container.getBoundingClientRect();
    const entries = [];

    svgs.forEach((svg) => {
      svg.querySelectorAll("text").forEach((node) => {
        const raw = node.textContent?.trim();
        if (!raw || !/^\d+$/.test(raw)) return;
        const fillColor = node.getAttribute("fill") || node.style.fill;
        if (fillColor !== "#C80000") return;
        const parsedBarIndex = Number.parseInt(raw, 10);
        if (Number.isNaN(parsedBarIndex)) return;
        const barIndex = Math.max(parsedBarIndex - 1, 0);
        const rect = node.getBoundingClientRect();
        const left = rect.left - containerRect.left;
        const top = rect.top - containerRect.top;
        entries.push({
          label: raw,
          barIndex,
          left,
          top,
          width: rect.width,
          height: rect.height,
          fontSize: rect.height,
        });
      });
    });

    if (entries.length === 0) return false;

    entries
      .sort((a, b) => {
        if (a.top !== b.top) return a.top - b.top;
        return a.left - b.left;
      })
      .forEach((entry, index) => {
        const resolvedIndex = entry.barIndex !== null ? entry.barIndex : index;
        const badge = document.createElement("span");
        badge.className = "scoreChordOverlayLabel";
        badge.textContent = entry.label;
        badge.dataset.barIndex = String(resolvedIndex);
        if (window.bclickActiveChordIndex === resolvedIndex) {
          badge.classList.add("isActiveChord");
        }

        badge.addEventListener("contextmenu", (event) => {
          event.preventDefault();
        });
        badge.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        badge.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();

          const badgeRect = badge.getBoundingClientRect();
          const containerRect = this.container.getBoundingClientRect();
          const left = badgeRect.right - containerRect.left + 6;
          const top = badgeRect.top - containerRect.top;

          this.openContextMenu({ left, top });

          this.contextMenuPointerId = event.pointerId;
          this.handleMenuPointerMove = (moveEvent) => {
            if (this.contextMenuPointerId !== moveEvent.pointerId) return;
            this.updateActiveMenuFromPoint(moveEvent.clientX, moveEvent.clientY);
          };
          this.handleMenuPointerUp = (upEvent) => {
            if (this.contextMenuPointerId !== upEvent.pointerId) return;
            this.updateActiveMenuFromPoint(upEvent.clientX, upEvent.clientY);
            const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
            const item = target ? target.closest(".scoreContextMenuItem") : null;
            if (item && !item.classList.contains("isDisabled")) {
              const action = item.dataset.action;
              if (action === "delete") {
                if (!window.confirm(this.getDeleteConfirmMessage())) {
                  this.closeContextMenu();
                  return;
                }
              }
              this.onAction?.(action, resolvedIndex);
            }
            this.closeContextMenu();
          };
          this.handleOutsidePointerDown = (downEvent) => {
            if (!this.contextMenu) return;
            if (this.contextMenu.contains(downEvent.target)) return;
            this.closeContextMenu();
          };
          window.addEventListener("pointermove", this.handleMenuPointerMove);
          window.addEventListener("pointerup", this.handleMenuPointerUp);
          window.addEventListener("pointercancel", this.handleMenuPointerUp);
          window.addEventListener("pointerdown", this.handleOutsidePointerDown, true);
        });

        const doubledHeight = entry.height * 2.5;
        const expandedWidth = entry.width * 1.2;
        const overlayShiftX = 4;

        badge.style.left = `${entry.left - (expandedWidth - entry.width) / 2 - overlayShiftX}px`;
        badge.style.top = `${entry.top - entry.height / 2}px`;
        badge.style.width = `${expandedWidth}px`;
        badge.style.height = `${doubledHeight}px`;
        badge.style.fontSize = `${entry.fontSize}px`;
        overlay.appendChild(badge);
      });

    this.container.appendChild(overlay);
    return true;
  }
}

export default RhythmScoreUI;
