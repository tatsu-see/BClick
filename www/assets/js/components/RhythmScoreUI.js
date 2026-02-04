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
    this.activeMenuBarIndex = null;
    this.overlayRenderPending = false;
    this.overlayObserver = null;
    this.overlayObserverTimer = null;
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
    if (this.container && window.MutationObserver && !this.overlayObserver) {
      //Spec alphaTab の描画が遅れて追加されるため、DOM変化でオーバーレイを更新する
      this.overlayObserver = new MutationObserver((mutations) => {
        const shouldRefresh = mutations.some((mutation) => {
          return Array.from(mutation.addedNodes).some((node) => !this.isOverlayUiNode(node));
        });
        if (!shouldRefresh) return;
        this.requestOverlayRefreshFromMutation();
      });
      this.overlayObserver.observe(this.container, { childList: true, subtree: true });
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
    if (this.overlayObserver) {
      this.overlayObserver.disconnect();
      this.overlayObserver = null;
    }
    if (this.overlayObserverTimer) {
      clearTimeout(this.overlayObserverTimer);
      this.overlayObserverTimer = null;
    }
  }

  /**
   * オーバーレイUI由来のDOM変化かを判定する。
   * @param {Node} node
   * @returns {boolean}
   */
  isOverlayUiNode(node) {
    const element = node.nodeType === 1 ? node : node.parentElement;
    if (!element || !element.closest) return false;
    return !!element.closest(".scoreChordOverlayLayer, .scoreContextMenu");
  }

  /**
   * DOM変化を検知した時のオーバーレイ再描画を予約する。
   */
  requestOverlayRefreshFromMutation() {
    if (this.overlayObserverTimer) {
      clearTimeout(this.overlayObserverTimer);
    }
    //Spec alphaTabの描画が落ち着くまで少し待ってから重ね直す
    this.overlayObserverTimer = window.setTimeout(() => {
      this.handleOverlayRefresh();
      this.overlayObserverTimer = null;
    }, 120);
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
   * メニューアイコンの名前を取得する。
   * @param {string} key
   * @returns {string}
   */
  getMenuIconName(key) {
    const icons = {
      edit: "edit_note",
      copy: "content_copy",
      duplicate: "copy_all",
      paste: "content_paste",
      delete: "delete",
    };
    return icons[key] || "more_horiz";
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
      const icon = document.createElement("span");
      icon.className = "material-symbols-rounded";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = this.getMenuIconName(action);
      const label = document.createElement("span");
      label.className = "scoreContextMenuItemLabel";
      label.textContent = this.getMenuLabel(action);
      item.append(icon, label);
      item.addEventListener("click", () => {
        if (item.classList.contains("isDisabled")) return;
        const menuAction = item.dataset.action;
        this.runMenuAction(menuAction, this.activeMenuBarIndex);
        this.closeContextMenu();
      });
      list.appendChild(item);
    });
    menu.appendChild(list);
    menu.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    this.container.appendChild(menu);
    this.contextMenu = menu;
    this.contextMenuItems = Array.from(menu.querySelectorAll(".scoreContextMenuItem"));
  }

  /**
   * contextMenu のアクションを実行する。
   * @param {string} action
   * @param {number|null} barIndex
   */
  runMenuAction(action, barIndex) {
    if (!action || barIndex === null || barIndex === undefined) return;
    if (action === "delete") {
      if (!window.confirm(this.getDeleteConfirmMessage())) {
        return;
      }
    }
    this.onAction?.(action, barIndex);
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
  openContextMenu({ left, top, anchorRect, barIndex }) {
    if (!this.container) return;
    this.ensureContextMenu();
    if (!this.contextMenu) return;
    this.activeMenuBarIndex = barIndex ?? null;
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

    //Spec contextMenu のサイズ調整（必要な場合にだけ拡大する）
    const menuSizeAdjustX = 0;
    const menuSizeAdjustY = 0;

    const adjustedMenuWidth = menuRect.width + menuSizeAdjustX;
    const adjustedMenuHeight = menuRect.height + menuSizeAdjustY;

    if (menuSizeAdjustX !== 0) {
      this.contextMenu.style.width = `${adjustedMenuWidth}px`;
    }
    if (menuSizeAdjustY !== 0) {
      this.contextMenu.style.height = `${adjustedMenuHeight}px`;
    }

    const maxLeft = Math.max(0, containerRect.width - adjustedMenuWidth - 4);
    const maxTop = Math.max(0, containerRect.height - adjustedMenuHeight - 4);

    let desiredLeft = left;
    let desiredTop = top;
    if (anchorRect) {
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      desiredLeft = anchorCenterX - containerRect.left - adjustedMenuWidth / 2;
      //Spec contextMenu は小節番号の上に表示し、右端では左寄せで折り返さない
      //Spec contextMenu の表示位置は少し上にずらして指で隠れにくくする
      const menuOffsetY = 8;
      desiredTop = anchorRect.top - containerRect.top - adjustedMenuHeight - menuOffsetY;
    }

    //Spec contextMenu が右端からはみ出す場合は左に寄せて文字の縦書きを防ぐ
    const overflowRight = desiredLeft + adjustedMenuWidth - (containerRect.width - 4);
    if (overflowRight > 0) {
      desiredLeft -= overflowRight;
    }

    const clampedLeft = Math.max(4, Math.min(desiredLeft, maxLeft));
    const clampedTop = Math.max(4, Math.min(desiredTop, maxTop));

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
      if (this.overlayRenderPending) return;
      this.overlayRenderPending = true;
      //Spec 描画タイミングを少し遅らせてちらつきを抑える
      this.renderOverlayAfterPaint()
        .then((done) => {
          if (done || attempts >= 30) {
            clearInterval(this.overlayTimer);
            this.overlayTimer = null;
          }
        })
        .finally(() => {
          this.overlayRenderPending = false;
        });
    }, 50);
  }

  /**
   * オーバーレイ描画を少し遅らせて実行する。
   * @returns {Promise<boolean>}
   */
  async renderOverlayAfterPaint() {
    //Spec alphaTab の描画・フォント反映後に重ねて描画する
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // フォント待機に失敗しても描画は続行する
      }
    }
    return this.renderOverlay();
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
        // editMeasure から戻った直後に、最後に編集した小節を一時的に強調する。
        if (window.bclickLastEditedBarIndex === resolvedIndex) {
          badge.classList.add("isLastEdited");
        }

        badge.addEventListener("contextmenu", (event) => {
          event.preventDefault();
        });
        badge.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          const badgeRect = badge.getBoundingClientRect();
          const containerRect = this.container.getBoundingClientRect();
          const left = badgeRect.right - containerRect.left + 6;
          const top = badgeRect.top - containerRect.top;

          this.openContextMenu({
            left,
            top,
            anchorRect: badgeRect,
            barIndex: resolvedIndex,
          });
          this.handleOutsidePointerDown = (downEvent) => {
            if (!this.contextMenu) return;
            if (this.contextMenu.contains(downEvent.target)) return;
            this.closeContextMenu();
          };
          window.addEventListener("pointerdown", this.handleOutsidePointerDown, true);
        });

        //Spec 小節番号オーバーレイのサイズ調整（必要な場合にだけ拡大する）
        const overlaySizeAdjustX = 0.1;
        const overlaySizeAdjustY = 0.1;
        //Spec 小節番号オーバーレイのフォント倍率（必要な場合にだけ拡大する）
        const overlayFontScale = 1.5;

        const doubledHeight = entry.height * (2.5 + overlaySizeAdjustY);
        const expandedWidth = entry.width * (1.2 + overlaySizeAdjustX);
        const overlayShiftX = 4;

        badge.style.left = `${entry.left - (expandedWidth - entry.width) / 2 - overlayShiftX}px`;
        badge.style.top = `${entry.top - entry.height / 2}px`;
        badge.style.width = `${expandedWidth}px`;
        badge.style.height = `${doubledHeight}px`;
        badge.style.fontSize = `${entry.fontSize * overlayFontScale}px`;
        overlay.appendChild(badge);
      });

    this.container.appendChild(overlay);
    return true;
  }
}

export default RhythmScoreUI;
