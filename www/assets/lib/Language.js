// Ver. 2.0.0

/**
 *  DOMが読み込まれたら window.name をタイトルに設定
 * */
window.addEventListener('DOMContentLoaded', () => {

  // 言語切り替え処理を動かす。
  setLanguage();
});

/**
 * 現在の言語が指定の言語かチェックする。
 * @param {string} lang - チェックする言語コード ('ja' または 'en')
 */
function isLanguage( lang ) {
  const userLang = navigator.language || navigator.userLanguage;

  return userLang.startsWith( lang );
}

/**
 * 言語設定で、表示を切り替える。
 */
let LANG_PRE_FIX = null;

function setLanguage() {
  LANG_PRE_FIX = isLanguage('ja') ? 'ja' : 'en';

  document.querySelectorAll('.lang').forEach(el => {
    el.style.display = (el.dataset.lang === LANG_PRE_FIX) ? 'inline' : 'none';
  });
}

// Expose for other scripts if needed (attach to window)
window.LANG_PRE_FIX = LANG_PRE_FIX;
//window.setLanguage = setLanguage;