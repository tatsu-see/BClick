/**
 * GDPR同意の状態をCookieで管理し、Consent Mode v2 と GA読み込みを制御するライブラリ。
 *
 * 【使い方】
 * - index.html で initConsentBanner(...) を呼び出す。
 * - terms.html で initConsentDialog(...) を呼び出す。
 * - 同意は Cookie に保存される（キー名: bclick.consent.analytics / 有効期限: 12か月）。
 *
 * 【注意事項】
 * - 同意前は gtag.js を読み込まない設計。
 * - 同意後のみ gtag.js を動的に読み込んで計測を開始する。
 * - 言語表示は Language.js の getLangMsg() を利用するため、Language.js の読み込みが必要。
 * - バナーやダイアログの表示はCSS（consentManager.css）で行う。
 */
import { getLangMsg } from "./Language.js";

const CONSENT_COOKIE_NAME = "bclick.consent.analytics";
const CONSENT_GRANTED = "granted";
const CONSENT_DENIED = "denied";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const GTAG_SCRIPT_ID = "bclick-gtag";

/**
 * Cookieに保存された同意状態を取得する。
 * @returns {"granted"|"denied"|null} 同意状態
 */
export function getStoredConsent() {
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (!trimmed.startsWith(`${CONSENT_COOKIE_NAME}=`)) continue;
    const value = trimmed.substring(CONSENT_COOKIE_NAME.length + 1);
    return normalizeConsentValue(value);
  }
  return null;
}

/**
 * 同意状態をCookieへ保存する。
 * @param {"granted"|"denied"} value - 保存する同意状態
 */
export function saveConsent(value) {
  const normalized = normalizeConsentValue(value);
  if (!normalized) return;
  document.cookie = buildConsentCookie(normalized);
}

/**
 * index.html の同意バナーを初期化する。
 * @param {object} options - 初期化オプション
 * @param {string} options.bannerId - バナー要素のID
 * @param {string} options.acceptId - 同意ボタンID
 * @param {string} options.declineId - 拒否ボタンID
 * @param {string} options.measurementId - GA測定ID
 */
export function initConsentBanner({ bannerId, acceptId, declineId, measurementId }) {
  const banner = document.getElementById(bannerId);
  if (!banner) return;
  const acceptButton = document.getElementById(acceptId);
  const declineButton = document.getElementById(declineId);

  ensureGtagStub();
  setDefaultConsent();

  const stored = getStoredConsent();
  if (stored === CONSENT_GRANTED) {
    applyConsentToGtag(CONSENT_GRANTED);
    loadGtag(measurementId);
    return;
  }
  if (stored === CONSENT_DENIED) {
    applyConsentToGtag(CONSENT_DENIED);
    return;
  }

  banner.hidden = false;

  if (acceptButton) {
    acceptButton.addEventListener("click", () => {
      saveConsent(CONSENT_GRANTED);
      applyConsentToGtag(CONSENT_GRANTED);
      loadGtag(measurementId);
      banner.hidden = true;
    });
  }

  if (declineButton) {
    declineButton.addEventListener("click", () => {
      saveConsent(CONSENT_DENIED);
      applyConsentToGtag(CONSENT_DENIED);
      banner.hidden = true;
    });
  }

  window.addEventListener("pageshow", () => {
    const refreshed = getStoredConsent();
    if (refreshed === CONSENT_GRANTED) {
      applyConsentToGtag(CONSENT_GRANTED);
      loadGtag(measurementId);
      banner.hidden = true;
    }
    if (refreshed === CONSENT_DENIED) {
      applyConsentToGtag(CONSENT_DENIED);
      banner.hidden = true;
    }
  });
}

/**
 * terms.html の同意設定ダイアログを初期化する。
 * @param {object} options - 初期化オプション
 * @param {string} options.openButtonId - ダイアログを開くボタンID
 * @param {string} options.dialogId - dialog要素のID
 * @param {string} options.acceptId - 同意ボタンID
 * @param {string} options.declineId - 拒否ボタンID
 * @param {string} options.statusId - 現在状態表示のID
 */
export function initConsentDialog({ openButtonId, dialogId, acceptId, declineId, statusId }) {
  const openButton = document.getElementById(openButtonId);
  const dialog = document.getElementById(dialogId);
  const acceptButton = document.getElementById(acceptId);
  const declineButton = document.getElementById(declineId);
  const statusLabel = document.getElementById(statusId);

  if (!openButton || !dialog) return;

  const updateStatusLabel = () => {
    if (!statusLabel) return;
    const current = getStoredConsent();
    statusLabel.textContent = buildStatusMessage(current);
  };

  openButton.addEventListener("click", () => {
    updateStatusLabel();
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    }
  });

  if (acceptButton) {
    acceptButton.addEventListener("click", () => {
      saveConsent(CONSENT_GRANTED);
      updateStatusLabel();
      dialog.close();
    });
  }

  if (declineButton) {
    declineButton.addEventListener("click", () => {
      saveConsent(CONSENT_DENIED);
      updateStatusLabel();
      dialog.close();
    });
  }

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  updateStatusLabel();
}

/**
 * gtag の初期スタブを用意する。
 */
function ensureGtagStub() {
  if (!window.dataLayer) {
    window.dataLayer = [];
  }
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

/**
 * Consent Mode v2 の初期値を denied に設定する。
 */
function setDefaultConsent() {
  window.gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

/**
 * Consent Mode v2 の更新値を適用する。
 * @param {"granted"|"denied"} value - 更新する同意状態
 */
function applyConsentToGtag(value) {
  const normalized = normalizeConsentValue(value);
  if (!normalized) return;
  const target = normalized === CONSENT_GRANTED ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: target,
    analytics_storage: target,
    ad_user_data: target,
    ad_personalization: target,
  });
}

/**
 * GAのgtag.jsを読み込み、計測を初期化する。
 * @param {string} measurementId - GA測定ID
 */
function loadGtag(measurementId) {
  if (!measurementId) return;
  if (document.getElementById(GTAG_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = GTAG_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
}

/**
 * 同意状態の文字列を正規化する。
 * @param {string} value - 入力値
 * @returns {"granted"|"denied"|null}
 */
function normalizeConsentValue(value) {
  if (value === CONSENT_GRANTED) return CONSENT_GRANTED;
  if (value === CONSENT_DENIED) return CONSENT_DENIED;
  return null;
}

/**
 * Cookie用の文字列を組み立てる。
 * @param {"granted"|"denied"} value - 保存する同意状態
 * @returns {string} Cookie文字列
 */
function buildConsentCookie(value) {
  const secureFlag = window.location.protocol === "https:" ? ";Secure" : "";
  return `${CONSENT_COOKIE_NAME}=${value};max-age=${CONSENT_MAX_AGE_SECONDS};path=/;SameSite=Lax${secureFlag}`;
}

/**
 * 同意状態の表示文言を作成する。
 * @param {"granted"|"denied"|null} value - 同意状態
 * @returns {string} 表示文言
 */
function buildStatusMessage(value) {
  if (value === CONSENT_GRANTED) {
    return getLangMsg("現在の状態: 同意", "Current status: Accepted");
  }
  if (value === CONSENT_DENIED) {
    return getLangMsg("現在の状態: 拒否", "Current status: Declined");
  }
  return getLangMsg("現在の状態: 未設定", "Current status: Not set");
}
