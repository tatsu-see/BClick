/**
 * ブックマーク直開きなどの直アクセスは index.html へ戻す。
 * @returns {boolean} アプリ内遷移であれば true
 */
export function ensureInAppNavigation() {
  const referrer = document.referrer;
  if (!referrer) {
    window.location.href = "/";
    return false;
  }
  try {
    const refUrl = new URL(referrer);
    if (refUrl.origin !== window.location.origin) {
      window.location.href = "/";
      return false;
    }
  } catch (error) {
    window.location.href = "/";
    return false;
  }
  return true;
}

/**
 * 履歴があれば戻る。無ければ index.html へ戻す。
 */
export function goBackWithFallback() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = "/";
}
