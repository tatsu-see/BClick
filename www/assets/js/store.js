
import { LocalStore } from '../lib/LocalStore.js';

/**
 * 設定の保存・読込用のclass
 */
export class ConfigStore extends LocalStore {
  constructor() {
    super();
    this.keys = {
    };
  }

  /**
   * カウントイン秒数のI/O
   * @returns 
   */
  getCountInSec() {
    const saved = this.getSettings(this.keys.CountInSec);
    return typeof saved === 'number' && !Number.isNaN(saved) ? saved : null;
  }

  setCountInSec(value) {
    if (!Number.isFinite(value) || value < 0) return;
    this.saveSettings(this.keys.CountInSec, Math.trunc(value));
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
   * アプリ設定をリセットする。
   */
  resetAppSettings() {
  }
}
