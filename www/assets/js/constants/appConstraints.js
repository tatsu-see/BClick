/**
 * appConstraints.js
 * アプリ全体で共有する設定値の制約（上限・下限・許可値）を定義する。
 */

export const APP_LIMITS = {
  tempo: { min: 30, max: 240 },
  clickCount: { min: 1, max: 8 },
  countIn: { min: 0, max: 10 },
  clickVolume: { min: 0, max: 2 },
  scoreMeasures: { min: 1, max: 50 },
  barsPerRow: { min: 1, max: 4 },
  progressionMaxChords: 10,
};

export const ALLOWED_TIME_SIGNATURES = ["2/4", "3/4", "4/4"];

export const RHYTHM_TOKEN_REGEX = /^(?:[rt])?(?:1|2|4|8|16)$/;
