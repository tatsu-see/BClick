
import { LocalStore } from '../../lib/LocalStore.js';
import { APP_LIMITS, ALLOWED_TIME_SIGNATURES, ALLOWED_CLICK_TONES } from "../constants/appConstraints.js";
import { isIntegerInRange, isNumberInRange } from "./validators.js";

const getProgressionChordCount = (value) => {
  if (typeof value !== "string") return 0;
  const tokens = value.trim().split(/\s+/).filter((token) => token.length > 0);
  return tokens.length;
};

/**
 * 拍数をクリック設定の上限下限に収めて返す。
 * @param {unknown} value
 * @returns {number|null}
 */
const normalizeBeatCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  return Math.max(APP_LIMITS.clickCount.min, Math.min(APP_LIMITS.clickCount.max, parsed));
};

/**
 * クリック音色パターンの既定値を生成する。
 * 1,5,9,13拍目はA5、それ以外はA4。
 * @param {number} beatCount
 * @returns {string[]}
 */
const buildDefaultClickTonePattern = (beatCount) =>
  Array.from({ length: beatCount }, (_, index) => (index % 4 === 0 ? "A5" : "A4"));

/**
 * クリック音色パターンを拍数に合わせて正規化する。
 * 不正値や不足分は既定値で補う。
 * @param {unknown} value
 * @param {unknown} beatCount
 * @returns {string[]|null}
 */
const normalizeClickTonePattern = (value, beatCount) => {
  const count = normalizeBeatCount(beatCount);
  if (!count) return null;
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: count }, (_, index) => {
    const tone = source[index];
    return ALLOWED_CLICK_TONES.includes(tone) ? tone : (index % 4 === 0 ? "A5" : "A4");
  });
};

/**
 * 設定の保存・読込用のclass
 */
export class ConfigStore extends LocalStore {
  constructor() {
    super();

      //Spec 下記のkeysは同一画面の項目を近接配置する。画面が切り替わる場合は空行を入れる。
      this.keys = {
        // index / configBeat / editScore: テンポ
        Tempo: 'bclick.tempo',
        // index: 楽譜表示ON/OFF
        ScoreEnabled: 'bclick.score.enabled',

        // configBeat: クリック拍数
        ClickCount: 'bclick.clickCount',
        // configBeat: カウントイン
        Countdown: 'bclick.countdown',
        // configBeat: ボリューム(UI)
        ClickVolume: 'bclick.clickVolume',
        // configBeat: クリック音の音色パターン
        ClickTonePattern: 'bclick.clickTonePattern',

        // configScore: 拍子
        ScoreTimeSignature: 'bclick.score.timeSignature',
        // configScore: 小節数
        ScoreMeasures: 'bclick.score.measures',
        // configScore: リズムパターン
        ScoreRhythmPattern: 'bclick.score.rhythmPattern',
        // configScore / editMeasure: コード進行
        ScoreProgression: 'bclick.score.progression',

        // editMeasure: コードダイアグラム表示用コード
        CodeDiagramChord: 'bclick.codeDiagram.chord',

        // editScore: 調節トグル（テンポ設定の表示ON/OFF）
        EditScoreSettingsEnabled: 'bclick.editScore.settings.enabled',
        // editScore: 1段当たり表示小節数
        ScoreBarsPerRow: 'bclick.score.barsPerRow',
        // editScore: 小節配列
        ScoreBars: 'bclick.score.bars',
      };
    }

  getNumberSetting(key) {
    const saved = this.getSettings(key);
    return typeof saved === 'number' && !Number.isNaN(saved) ? saved : null;
  }

  setNumberSetting(key, value) {
    if (!Number.isFinite(value)) return;
    this.saveSettings(key, Math.trunc(value));
  }

  /**
   * BPMテンポのI/O
   */
  getTempo() {
    const saved = this.getNumberSetting(this.keys.Tempo);
    return isIntegerInRange(saved, APP_LIMITS.tempo.min, APP_LIMITS.tempo.max) ? saved : null;
  }

  setTempo(value) {
    const normalized = Math.trunc(value);
    if (!isIntegerInRange(normalized, APP_LIMITS.tempo.min, APP_LIMITS.tempo.max)) return;
    this.setNumberSetting(this.keys.Tempo, value);
  }

  loadTempoInput(inputEl) {
    const saved = this.getTempo();
    if (saved === null) return;
    inputEl.value = saved.toString();
  }

  saveTempoInput(inputEl) {
    const value = parseInt(inputEl.value, 10);
    if (Number.isNaN(value) || value < 0) return;
    this.setTempo(value);
  }

  /**
   * クリック数のI/O
   */
  getClickCount() {
    const saved = this.getNumberSetting(this.keys.ClickCount);
    return isIntegerInRange(saved, APP_LIMITS.clickCount.min, APP_LIMITS.clickCount.max) ? saved : null;
  }

  setClickCount(value) {
    const normalized = Math.trunc(value);
    if (!isIntegerInRange(normalized, APP_LIMITS.clickCount.min, APP_LIMITS.clickCount.max)) return;
    this.setNumberSetting(this.keys.ClickCount, value);
  }

  loadClickCountInput(inputEl) {
    const saved = this.getClickCount();
    if (saved === null) return;
    inputEl.value = saved.toString();
  }

  saveClickCountInput(inputEl) {
    const value = parseInt(inputEl.value, 10);
    if (Number.isNaN(value) || value < 0) return;
    this.setClickCount(value);
  }

  /**
   * クリック音量のI/O
   */
  getClickVolume() {
    const saved = this.getNumberSetting(this.keys.ClickVolume);
    return isNumberInRange(saved, APP_LIMITS.clickVolume.min, APP_LIMITS.clickVolume.max) ? saved : null;
  }

  setClickVolume(value) {
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(APP_LIMITS.clickVolume.max, Math.max(APP_LIMITS.clickVolume.min, value));
    const rounded = Math.round(clamped * 10) / 10;
    this.saveSettings(this.keys.ClickVolume, rounded);
  }

  /**
   * クリック音色パターンのI/O
   */
  getClickTonePattern(beatCount) {
    const count =
      normalizeBeatCount(beatCount)
      || this.getClickCount()
      || APP_LIMITS.clickCount.min;
    // 拍数が未指定でも、保存済みクリック数を使って配列長を決定する。
    // （旧バージョンの保存状態では ClickTonePattern キーが存在しないため、    ）
    // （その場合は未保存扱いとして既定値(A5/A4パターン)を返して動作を継続する。）
    // （以後 configBeat の Done 保存時に、現行形式の配列が保存される。       ）
    const saved = this.getSettings(this.keys.ClickTonePattern);
    const normalized = normalizeClickTonePattern(saved, count);
    return normalized || buildDefaultClickTonePattern(count);
  }

  setClickTonePattern(value, beatCount) {
    const count =
      normalizeBeatCount(beatCount)
      || (Array.isArray(value) ? value.length : null)
      || this.getClickCount()
      || APP_LIMITS.clickCount.min;
    // 保存時に拍数と配列長がズレても、ここで拍数に合わせて整形して保存する。
    const normalized = normalizeClickTonePattern(value, count);
    if (!normalized) return;
    this.saveSettings(this.keys.ClickTonePattern, normalized);
  }

  /**
   * editScore の調節トグルのI/O
   */
  getEditScoreSettingsEnabled() {
    const saved = this.getSettings(this.keys.EditScoreSettingsEnabled);
    return typeof saved === 'boolean' ? saved : null;
  }

  setEditScoreSettingsEnabled(value) {
    if (typeof value !== 'boolean') return;
    this.saveSettings(this.keys.EditScoreSettingsEnabled, value);
  }

  /**
   * カウントイン秒数のI/O
   * @returns 
   */
  getCountInSec() {
    const saved = this.getNumberSetting(this.keys.Countdown);
    return isIntegerInRange(saved, APP_LIMITS.countIn.min, APP_LIMITS.countIn.max) ? saved : null;
  }

  setCountInSec(value) {
    const normalized = Math.trunc(value);
    if (!isIntegerInRange(normalized, APP_LIMITS.countIn.min, APP_LIMITS.countIn.max)) return;
    this.setNumberSetting(this.keys.Countdown, value);
  }

  loadCountInSecInput(inputEl) {
    const saved = this.getCountInSec();
    if (saved === null) return;
    inputEl.value = saved.toString();
  }

  saveCountInSecInput(inputEl) {
    const value = parseInt(inputEl.value, 10);
    if (Number.isNaN(value) || value < 0) return;
    this.setCountInSec(value);
  }

  /**
   * スコア設定のI/O
   */
  getScoreTimeSignature() {
    const saved = this.getSettings(this.keys.ScoreTimeSignature);
    if (typeof saved !== "string") return null;
    return ALLOWED_TIME_SIGNATURES.includes(saved) ? saved : null;
  }

  setScoreTimeSignature(value) {
    if (typeof value !== "string" || !ALLOWED_TIME_SIGNATURES.includes(value)) return;
    this.saveSettings(this.keys.ScoreTimeSignature, value);
  }

  getScoreProgression() {
    const saved = this.getSettings(this.keys.ScoreProgression);
    if (typeof saved !== "string") return "";
    return getProgressionChordCount(saved) <= APP_LIMITS.progressionMaxChords ? saved : "";
  }

  setScoreProgression(value) {
    if (typeof value !== "string") return;
    if (getProgressionChordCount(value) > APP_LIMITS.progressionMaxChords) return;
    this.saveSettings(this.keys.ScoreProgression, value);
  }

  getCodeDiagramChord() {
    const saved = this.getSettings(this.keys.CodeDiagramChord);
    return typeof saved === 'string' ? saved : '';
  }

  setCodeDiagramChord(value) {
    if (typeof value !== 'string' || value.length === 0) return;
    this.saveSettings(this.keys.CodeDiagramChord, value);
  }

  getScoreMeasures() {
    const saved = this.getNumberSetting(this.keys.ScoreMeasures);
    return isIntegerInRange(saved, APP_LIMITS.scoreMeasures.min, APP_LIMITS.scoreMeasures.max) ? saved : null;
  }

  setScoreMeasures(value) {
    const normalized = Math.trunc(value);
    if (!isIntegerInRange(normalized, APP_LIMITS.scoreMeasures.min, APP_LIMITS.scoreMeasures.max)) return;
    this.setNumberSetting(this.keys.ScoreMeasures, value);
  }

  getScoreBarsPerRow() {
    const saved = this.getNumberSetting(this.keys.ScoreBarsPerRow);
    return isIntegerInRange(saved, APP_LIMITS.barsPerRow.min, APP_LIMITS.barsPerRow.max) ? saved : null;
  }

  setScoreBarsPerRow(value) {
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(APP_LIMITS.barsPerRow.min, Math.min(APP_LIMITS.barsPerRow.max, value));
    this.setNumberSetting(this.keys.ScoreBarsPerRow, clamped);
  }

  getScoreRhythmPattern() {
    const saved = this.getSettings(this.keys.ScoreRhythmPattern);
    return Array.isArray(saved) ? saved : null;
  }

  setScoreRhythmPattern(value) {
    if (!Array.isArray(value)) return;
    this.saveSettings(this.keys.ScoreRhythmPattern, value);
  }

  getScoreBars() {
    const saved = this.getSettings(this.keys.ScoreBars);
    if (!Array.isArray(saved)) return null;
    if (saved.length > APP_LIMITS.scoreMeasures.max) return null;
    return saved;
  }

  setScoreBars(value) {
    if (!Array.isArray(value)) return;
    if (value.length > APP_LIMITS.scoreMeasures.max) return;
    this.saveSettings(this.keys.ScoreBars, value);
  }

  getScoreEnabled() {
    const saved = this.getSettings(this.keys.ScoreEnabled);
    return typeof saved === 'boolean' ? saved : null;
  }

  setScoreEnabled(value) {
    if (typeof value !== 'boolean') return;
    this.saveSettings(this.keys.ScoreEnabled, value);
  }

  /**
   * アプリ設定をリセットする。
   */
  resetAppSettings() {
  }
}
