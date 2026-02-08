/**
 * editScoreDraft.js
 * editScore / editMeasure 間で共有する一時編集データを管理する。
 */

const DRAFT_KEY = "bclick.editScore.draft";

/**
 * 一時編集データを読み込む。
 * @returns {object|null}
 */
export const loadEditScoreDraft = () => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
};

/**
 * 一時編集データを保存する。
 * @param {object} draft
 */
export const saveEditScoreDraft = (draft) => {
  if (!draft || typeof draft !== "object") return;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    ;
  }
};

/**
 * 一時編集データを削除する。
 */
export const clearEditScoreDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    ;
  }
};
