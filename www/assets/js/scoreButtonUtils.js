import ScoreData from "./ScoreModel.js";

const DEFAULT_SETTINGS = {
  tempo: 60,
  clickCount: 4,
  countIn: 4,
  timeSignature: "4/4",
  progression: "",
  measures: 8,
  barsPerRow: 2,
  scoreEnabled: true,
};

//##Spec
// JSON保存形式のバージョン定義。
const SCORE_JSON_VERSION = 0;

//##Spec
// JSON保存形式の仕様（v1） ※将来の予約用
//
// JSON保存形式の仕様（v0）
// {
//   "schemaVersion": 0,
//   "score": {
//     "tempo": 60,
//     "clickCount": 4,
//     "countIn": 4,
//     "timeSignature": "4/4",
//     "measures": 8,
//     "progression": "G C Em",
//     "barsPerRow": 2,
//     "scoreEnabled": true,
//     "beatPatterns": [
//       { "division": 4, "pattern": ["note"] }
//     ],
//     "bars": [
//       { "chord": ["G", "", "", ""], "rhythm": ["4", "4", "4", "4"] }
//     ]
//   }
// }
//
// キーの説明
// - schemaVersion: JSON保存形式のバージョン
// - score: 楽譜データ本体
//   - tempo: BPMテンポ
//   - clickCount: クリック数（拍数）
//   - countIn: カウントイン（拍数）
//   - timeSignature: 拍子（例 "4/4"）
//   - measures: 小節数
//   - progression: コード進行（スペース区切り）
//   - barsPerRow: 1段あたりの小節数
//   - scoreEnabled: リズム表示のON/OFF
//   - beatPatterns: リズム設定（拍ごとの分割/パターン配列）
//   - bars: 小節配列（chord: 拍ごとのコード配列, rhythm: 音符トークン配列）
//
// 読込・保存に対応していない設定項目
// - clickVolume: クリック音量

/**
 * 初期設定値を取得する。
 */
export const getDefaultSettings = () => ({ ...DEFAULT_SETTINGS });

/**
 * 拍子から拍数を取得する。
 */
export const getBeatCountFromTimeSignature = (timeSignature) => {
  const [numeratorRaw] = String(timeSignature || "").split("/");
  const numerator = Number.parseInt(numeratorRaw, 10);
  return Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
};

/**
 * 1拍ごとのデフォルトリズムパターンを生成する。
 */
export const buildDefaultBeatPatterns = (beatCount) =>
  Array.from({ length: beatCount }, () => ({ division: 4, pattern: ["note"] }));

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
  const storedBeatPatterns = store.getScoreBeatPatterns();
  const beatPatterns = Array.isArray(storedBeatPatterns) && storedBeatPatterns.length > 0
    ? storedBeatPatterns
    : buildDefaultBeatPatterns(beatCount);
  const bars = resetBars ? null : store.getScoreBars();

  return new ScoreData({
    tempo,
    clickCount,
    countIn,
    timeSignature,
    measures,
    barsPerRow,
    scoreEnabled,
    progression,
    beatPatterns,
    bars,
  });
};

/**
 * JSON読み込み用にScoreDataを生成する。
 */
export const buildScoreDataFromObject = (source) => {
  if (!source || typeof source !== "object") {
    throw new Error("JSONデータが不正です。");
  }
  if (source.schemaVersion !== SCORE_JSON_VERSION || !source.score || typeof source.score !== "object") {
    throw new Error("JSONデータが不正です。");
  }
  const normalized = source.score;
  const defaults = getDefaultSettings();
  const tempoRaw = Number.parseInt(normalized.tempo, 10);
  const tempo = Number.isNaN(tempoRaw) ? defaults.tempo : tempoRaw;
  const clickCountRaw = Number.parseInt(normalized.clickCount, 10);
  const clickCount = Number.isNaN(clickCountRaw) ? defaults.clickCount : clickCountRaw;
  const countInRaw = Number.parseInt(normalized.countIn, 10);
  const countIn = Number.isNaN(countInRaw) ? defaults.countIn : countInRaw;
  const timeSignature = typeof normalized.timeSignature === "string" && normalized.timeSignature.length > 0
    ? normalized.timeSignature
    : defaults.timeSignature;
  const measuresRaw = Number.parseInt(normalized.measures, 10);
  const measures = Number.isNaN(measuresRaw) ? defaults.measures : measuresRaw;
  const barsPerRowRaw = Number.parseInt(normalized.barsPerRow, 10);
  const barsPerRow = Number.isNaN(barsPerRowRaw) ? defaults.barsPerRow : barsPerRowRaw;
  const scoreEnabled = typeof normalized.scoreEnabled === "boolean"
    ? normalized.scoreEnabled
    : defaults.scoreEnabled;
  const progression = typeof normalized.progression === "string" ? normalized.progression : defaults.progression;
  const beatCount = getBeatCountFromTimeSignature(timeSignature);
  const beatPatterns = Array.isArray(normalized.beatPatterns) && normalized.beatPatterns.length > 0
    ? normalized.beatPatterns
    : buildDefaultBeatPatterns(beatCount);
  const bars = Array.isArray(normalized.bars) ? normalized.bars : null;

  return new ScoreData({
    tempo,
    clickCount,
    countIn,
    timeSignature,
    measures,
    barsPerRow,
    scoreEnabled,
    progression,
    beatPatterns,
    bars,
  });
};

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
  if (Array.isArray(scoreData.beatPatterns)) {
    store.setScoreBeatPatterns(scoreData.beatPatterns);
  }
  if (Array.isArray(scoreData.bars)) {
    store.setScoreBars(scoreData.bars);
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
  store.setScoreTimeSignature(defaults.timeSignature);
  store.setScoreProgression(defaults.progression);
  store.setScoreMeasures(defaults.measures);
  if (typeof store.setScoreBarsPerRow === "function") {
    store.setScoreBarsPerRow(defaults.barsPerRow);
  }
  store.setScoreEnabled(defaults.scoreEnabled);
  store.setScoreBeatPatterns(
    buildDefaultBeatPatterns(getBeatCountFromTimeSignature(defaults.timeSignature)),
  );
  if (typeof store.removeSettings === "function" && store.keys?.ScoreBars) {
    store.removeSettings(store.keys.ScoreBars);
  }
};

/**
 * editScore.html を開く。
 */
export const openEditScorePage = () => {
  window.location.href = "/editScore.html";
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

/**
 * ScoreDataをJSONとしてダウンロードする。
 */
export const downloadScoreJson = (scoreData) => {
  const payload = {
    schemaVersion: SCORE_JSON_VERSION,
    score: scoreData,
  };
  const data = JSON.stringify(payload, null, 2);
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

/**
 * JSONファイルを読み込む。
 */
export const readScoreFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error("ファイルの読み込みに失敗しました。"));
    };
    reader.readAsText(file);
  });

/**
 * 小節情報を結合する。
 */
export const mergeBars = (currentBars, nextBars) => {
  const base = Array.isArray(currentBars) ? currentBars : [];
  const extra = Array.isArray(nextBars) ? nextBars : [];
  return base.concat(extra);
};
