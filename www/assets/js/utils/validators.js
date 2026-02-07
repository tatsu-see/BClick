/**
 * validators.js
 * アプリ全体で使う入力値検証（バリデーション）関数を提供する。
 */

/**
 * 値が整数で、指定範囲内にあるか判定する。
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export const isIntegerInRange = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max;

/**
 * 値が有限数で、指定範囲内にあるか判定する。
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export const isNumberInRange = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max;
