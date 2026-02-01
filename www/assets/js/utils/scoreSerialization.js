/**
 * スコアのJSON保存形式に関する変換処理をまとめる。
 */
import ScoreData from "../models/ScoreModel.js";

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
export const SCORE_JSON_VERSION = 0;

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
 * ScoreDataをJSON文字列に変換する。
 */
export const buildScoreJsonString = (scoreData) => {
  const payload = {
    schemaVersion: SCORE_JSON_VERSION,
    score: scoreData,
  };
  return JSON.stringify(payload, null, 2);
};

/**
 * JSONファイルを読み込む。
 */
export const readScoreFileAsJson = (file) =>
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
