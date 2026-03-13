/**
 * スコアの生成/保存/読み込みに関する共通ユーティリティ。
 */
import ScoreData from "../models/ScoreModel.js";
import {
  buildDefaultRhythmPattern,
  buildScoreDataFromObject,
  buildScoreJsonString,
  getBeatCountFromTimeSignature,
  getDefaultSettings,
  readScoreFileAsJson,
} from "./scoreSerialization.js";

// configBeat の既定値ルールと揃えて、初期化時の音色パターンを生成する。
const buildDefaultClickTonePattern = (count) =>
  Array.from({ length: count }, (_, index) => (index % 4 === 0 ? "A5" : "A4"));

/**
 * 保存済み設定からScoreDataを自動生成する。
 */
/* Spec 自動生成する楽譜の仕様
  ・楽譜の拍子は configScore.html で選択した拍子となる。  例）4/4
  ・自動生成する楽譜は、同じ一小節を繰り返した楽譜となる。
  ・自動生成する楽譜の最大小節数は、 configScore.html で設定した数となる。
  ・configScore.html で 進行 にコードが設定してあれば、１小節ごとにコードを割り振って配置する。
    例）進行が G C Em の3つの場合、1小節目 G、2小節目 C、3小節目 Em、4小節目 G、（以降繰り返し）
  ・１小節に配置する音符は、configScore.html のリズム で設定した音符を配置する。
    例）4/4拍の場合、設定により "4分音符、4分音符、8分音符、16分音符" を配置するなど。
 */
export const buildScoreDataFromStore = (store, { resetBars = false } = {}) => {
  const defaults = getDefaultSettings();
  const timeSignature = store.getScoreTimeSignature() || defaults.timeSignature;
  const measures = store.getScoreMeasures() || defaults.measures;
  const barsPerRow = store.getScoreBarsPerRow ? (store.getScoreBarsPerRow() || defaults.barsPerRow) : defaults.barsPerRow;
  const storedScoreEnabled = store.getScoreEnabled ? store.getScoreEnabled() : null;
  const scoreEnabled = typeof storedScoreEnabled === "boolean" ? storedScoreEnabled : defaults.scoreEnabled;
  const progression = typeof store.getScoreProgression() === "string"
    ? store.getScoreProgression()
    : defaults.progression;
  const tempo = store.getTempo ? (store.getTempo() || defaults.tempo) : defaults.tempo;
  const clickCount = store.getClickCount ? (store.getClickCount() || defaults.clickCount) : defaults.clickCount;
  const countIn = store.getCountInSec ? (store.getCountInSec() || defaults.countIn) : defaults.countIn;
  const beatCount = getBeatCountFromTimeSignature(timeSignature);
  const storedRhythmPattern = store.getScoreRhythmPattern();
  const rhythmPattern = Array.isArray(storedRhythmPattern) && storedRhythmPattern.length > 0
    ? storedRhythmPattern
    : buildDefaultRhythmPattern(beatCount);
  const bars = resetBars ? null : store.getScoreBars();
  //##Spec clickTonePattern は store から取得する。
  // store が未対応の場合や保存データが存在しない場合は null になり、
  // ScoreModel 側で null として保持される（PDF保存時にはストアの値を優先するため影響なし）。
  const clickTonePattern = store.getClickTonePattern ? store.getClickTonePattern(clickCount) : null;

  return new ScoreData({
    tempo,
    clickCount,
    countIn,
    timeSignature,
    measures,
    barsPerRow,
    scoreEnabled,
    progression,
    rhythmPattern,
    bars,
    clickTonePattern,
  });
};

export { buildScoreDataFromObject };

/**
 * ScoreDataをLocalStorageへ保存する。
 */
export const saveScoreDataToStore = (store, scoreData) => {
  if (typeof store.setTempo === "function") {
    store.setTempo(scoreData.tempo);
  }
  if (typeof store.setClickCount === "function") {
    store.setClickCount(scoreData.clickCount);
  }
  if (typeof store.setCountInSec === "function") {
    store.setCountInSec(scoreData.countIn);
  }
  store.setScoreTimeSignature(scoreData.timeSignature);
  store.setScoreProgression(scoreData.progression);
  store.setScoreMeasures(scoreData.measures);
  if (typeof store.setScoreBarsPerRow === "function") {
    store.setScoreBarsPerRow(scoreData.barsPerRow);
  }
  if (typeof store.setScoreEnabled === "function") {
    store.setScoreEnabled(scoreData.scoreEnabled);
  }
  if (Array.isArray(scoreData.rhythmPattern)) {
    store.setScoreRhythmPattern(scoreData.rhythmPattern);
  }
  if (Array.isArray(scoreData.bars)) {
    store.setScoreBars(scoreData.bars);
  }
  //##Spec clickTonePattern が存在する場合のみ store へ保存する。
  // 旧データ読込時は normalizeClickTonePatternFromJson が既定値を補完した上で
  // ScoreData に設定されているため、ここでは null チェックのみ行う。
  if (typeof store.setClickTonePattern === "function" && Array.isArray(scoreData.clickTonePattern)) {
    store.setClickTonePattern(scoreData.clickTonePattern, scoreData.clickCount);
  }
};

/**
 * スコア関連の設定を初期化する。
 */
export const resetScoreSettings = (store) => {
  const defaults = getDefaultSettings();
  store.setTempo(defaults.tempo);
  store.setClickCount(defaults.clickCount);
  store.setCountInSec(defaults.countIn);
  if (typeof store.setClickTonePattern === "function") {
    store.setClickTonePattern(buildDefaultClickTonePattern(defaults.clickCount), defaults.clickCount);
  }
  store.setScoreTimeSignature(defaults.timeSignature);
  store.setScoreProgression(defaults.progression);
  store.setScoreMeasures(defaults.measures);
  if (typeof store.setScoreBarsPerRow === "function") {
    store.setScoreBarsPerRow(defaults.barsPerRow);
  }
  store.setScoreEnabled(defaults.scoreEnabled);
  if (typeof store.setEditScoreSettingsEnabled === "function") {
    // editScore の調節トグルは初期値(OFF)へ戻す
    store.setEditScoreSettingsEnabled(false);
  }
  store.setScoreRhythmPattern(
    buildDefaultRhythmPattern(getBeatCountFromTimeSignature(defaults.timeSignature)),
  );
  if (typeof store.removeSettings === "function" && store.keys?.ScoreBars) {
    store.removeSettings(store.keys.ScoreBars);
  }
};

/**
 * editScore.html を開く。
 */
export const openEditScorePage = () => {
  window.location.href = "editScore.html";
};

/**
 * JSONファイル名を生成する。
 */
export const buildScoreFileName = () => {
  const now = new Date();
  // 日付文字列用のゼロ埋め関数。
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `bclick-score-${stamp}.json`;
};

export { buildScoreJsonString };

/**
 * ScoreDataをJSONとしてダウンロードする。
 */
export const downloadScoreJson = (scoreData) => {
  const data = buildScoreJsonString(scoreData);
  const blob = new Blob([data], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildScoreFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 0);
};

export const readScoreFile = (file) => readScoreFileAsJson(file);

/**
 * 小節情報を結合する。
 */
export const mergeBars = (currentBars, nextBars) => {
  const base = Array.isArray(currentBars) ? currentBars : [];
  const extra = Array.isArray(nextBars) ? nextBars : [];
  return base.concat(extra);
};
