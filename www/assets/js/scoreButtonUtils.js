import ScoreData from "./ScoreData.js";

const DEFAULT_SETTINGS = {
  tempo: 60,
  clickCount: 4,
  countIn: 4,
  timeSignature: "4/4",
  progression: "",
  measures: 8,
  scoreEnabled: false,
};

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
 * 保存済み設定からScoreDataを生成する。
 */
export const buildScoreDataFromStore = (store, { resetBars = false } = {}) => {
  const defaults = getDefaultSettings();
  const timeSignature = store.getScoreTimeSignature() || defaults.timeSignature;
  const measures = store.getScoreMeasures() || defaults.measures;
  const progression = typeof store.getScoreProgression() === "string"
    ? store.getScoreProgression()
    : defaults.progression;
  const beatCount = getBeatCountFromTimeSignature(timeSignature);
  const storedBeatPatterns = store.getScoreBeatPatterns();
  const beatPatterns = Array.isArray(storedBeatPatterns) && storedBeatPatterns.length > 0
    ? storedBeatPatterns
    : buildDefaultBeatPatterns(beatCount);
  const bars = resetBars ? null : store.getScoreBars();

  return new ScoreData({
    timeSignature,
    measures,
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
  const defaults = getDefaultSettings();
  const timeSignature = typeof source.timeSignature === "string" && source.timeSignature.length > 0
    ? source.timeSignature
    : defaults.timeSignature;
  const measuresRaw = Number.parseInt(source.measures, 10);
  const measures = Number.isNaN(measuresRaw) ? defaults.measures : measuresRaw;
  const progression = typeof source.progression === "string" ? source.progression : defaults.progression;
  const beatCount = getBeatCountFromTimeSignature(timeSignature);
  const beatPatterns = Array.isArray(source.beatPatterns) && source.beatPatterns.length > 0
    ? source.beatPatterns
    : buildDefaultBeatPatterns(beatCount);
  const bars = Array.isArray(source.bars) ? source.bars : null;

  return new ScoreData({
    timeSignature,
    measures,
    progression,
    beatPatterns,
    bars,
  });
};

/**
 * ScoreDataをLocalStorageへ保存する。
 */
export const saveScoreDataToStore = (store, scoreData) => {
  store.setScoreTimeSignature(scoreData.timeSignature);
  store.setScoreProgression(scoreData.progression);
  store.setScoreMeasures(scoreData.measures);
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
  const newTab = window.open("/editScore.html", "_blank", "noopener,noreferrer");
  if (!newTab) {
    // noop: iOS Safari などで window.open が null を返す場合がある。

    //##Spec ここの noop は、ポップアップブロッカー対策です。
    // windows の Edge は newTab がnullなので、ここに alert() は入れないで。
  }
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
  const data = JSON.stringify(scoreData, null, 2);
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



