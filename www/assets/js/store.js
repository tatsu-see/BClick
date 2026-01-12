
import { LocalStore } from '../lib/LocalStore.js';

/**
 * 設定の保存・読込用のclass
 */
export class ConfigStore extends LocalStore {
  constructor() {
    super();
    this.keys = {
      Tempo: 'bclick.tempo',
      ClickCount: 'bclick.clickCount',
      Countdown: 'bclick.countdown',
      ScoreTimeSignature: 'bclick.score.timeSignature',
      ScoreProgression: 'bclick.score.progression',
      ScoreMeasures: 'bclick.score.measures',
      ScoreBars: 'bclick.score.bars',
      ScoreBeatPatterns: 'bclick.score.beatPatterns',
      CodeDiagramChord: 'bclick.codeDiagram.chord',
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
    return this.getNumberSetting(this.keys.Tempo);
  }

  setTempo(value) {
    if (!Number.isFinite(value) || value < 0) return;
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
    return this.getNumberSetting(this.keys.ClickCount);
  }

  setClickCount(value) {
    if (!Number.isFinite(value) || value < 0) return;
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
   * カウントイン秒数のI/O
   * @returns 
   */
  getCountInSec() {
    return this.getNumberSetting(this.keys.Countdown);
  }

  setCountInSec(value) {
    if (!Number.isFinite(value) || value < 0) return;
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
    return typeof saved === 'string' ? saved : null;
  }

  setScoreTimeSignature(value) {
    if (typeof value !== 'string' || value.length === 0) return;
    this.saveSettings(this.keys.ScoreTimeSignature, value);
  }

  getScoreProgression() {
    const saved = this.getSettings(this.keys.ScoreProgression);
    return typeof saved === 'string' ? saved : '';
  }

  setScoreProgression(value) {
    if (typeof value !== 'string') return;
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
    return typeof saved === 'number' ? saved : null;
  }

  setScoreMeasures(value) {
    if (!Number.isFinite(value) || value <= 0) return;
    this.setNumberSetting(this.keys.ScoreMeasures, value);
  }

  getScoreBeatPatterns() {
    const saved = this.getSettings(this.keys.ScoreBeatPatterns);
    return Array.isArray(saved) ? saved : null;
  }

  setScoreBeatPatterns(value) {
    if (!Array.isArray(value)) return;
    this.saveSettings(this.keys.ScoreBeatPatterns, value);
  }

  getScoreBars() {
    const saved = this.getSettings(this.keys.ScoreBars);
    return Array.isArray(saved) ? saved : null;
  }

  setScoreBars(value) {
    if (!Array.isArray(value)) return;
    this.saveSettings(this.keys.ScoreBars, value);
  }

  /**
   * アプリ設定をリセットする。
   */
  resetAppSettings() {
  }
}
