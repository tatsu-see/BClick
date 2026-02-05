// Ver. 3.0.0

/**
 * 現在の言語が指定の言語かチェックする。
 * @param {string} lang - チェックする言語コード ('ja' または 'en')
 */
export function isLanguage( lang ) {
  const userLang = navigator.language || navigator.userLanguage;

  return userLang.startsWith( lang );
}

/**
 * 言語設定に応じたメッセージを返す。
 * @param {string} ja - 日本語メッセージ
 * @param {string} en - 英語メッセージ
 * @returns {string}
 */
export function getLangMsg( ja, en ) {
  return isLanguage( 'ja' ) ? ja : en;
}

/**
 * 言語設定で、表示を切り替える。
 */
export let LANG_PRE_FIX = null;

export function setLanguage() {
  LANG_PRE_FIX = isLanguage('ja') ? 'ja' : 'en';

  // CSS 側の data-lang 切り替えで表示制御する
  document.documentElement.dataset.lang = LANG_PRE_FIX;
}

/**
 * DOM構築完了後に言語を初期化する。
 */
window.addEventListener('DOMContentLoaded', () => {

  // 言語切り替え処理を動かす。
  setLanguage();
});
