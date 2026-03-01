/**
 * configApp.js
 * アプリ設定画面（configApp.html）の Back / Done ボタンを制御する。
 * Back: 設定を保存せずに前の画面へ戻る。
 * Done: 設定を保存して前の画面へ戻る。
 */
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";
import { ConfigStore } from "../utils/store.js";

/**
 * クリック音量(0.0-2.0)を表示レベル(0-10)に変換する。
 * @param {number} volume
 * @returns {number}
 */
const volumeToLevel = (volume) => Math.round((volume / 2) * 10);

/**
 * 表示レベル(0-10)をクリック音量(0.0-2.0)に変換する。
 * @param {number} level
 * @returns {number}
 */
const levelToVolume = (level) => (level / 10) * 2;

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const store = new ConfigStore();
  const backButton = document.getElementById("saveConfigApp");
  const doneButton = document.getElementById("closePage");
  const clickVolumeRange = document.getElementById("clickVolumeRange");
  const clickVolumeValue = document.getElementById("clickVolumeValue");

  // ボリュームスライダーの初期化
  if (clickVolumeRange) {
    const savedClickVolume = store.getClickVolume();
    if (savedClickVolume !== null) {
      clickVolumeRange.value = volumeToLevel(savedClickVolume).toString();
    }
    if (clickVolumeValue) {
      clickVolumeValue.textContent = clickVolumeRange.value;
    }
    clickVolumeRange.addEventListener("input", () => {
      if (clickVolumeValue) {
        clickVolumeValue.textContent = clickVolumeRange.value;
      }
    });
  }

  // Back ボタン: 保存せずに戻る
  if (backButton) {
    backButton.addEventListener("click", () => {
      goBackWithFallback();
    });
  }

  /**
   * 設定を保存して前の画面へ戻る。
   */
  const saveAndGoBack = () => {
    if (clickVolumeRange) {
      const levelNumber = Number.parseInt(clickVolumeRange.value, 10);
      if (!Number.isNaN(levelNumber)) {
        store.setClickVolume(levelToVolume(levelNumber));
      }
    }
    goBackWithFallback();
  };

  // Done ボタン: 設定を保存して戻る
  if (doneButton) {
    doneButton.addEventListener("click", () => {
      saveAndGoBack();
    });
  }
});
