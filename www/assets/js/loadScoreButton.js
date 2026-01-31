import { ConfigStore } from "./store.js";
import {
  buildScoreDataFromObject,
  mergeBars,
  readScoreFile,
  saveScoreDataToStore,
} from "./scoreButtonUtils.js";
import { showMessage } from "../lib/ShowMessageBox.js";

document.addEventListener("DOMContentLoaded", () => {
  const MERGE_TOGGLE_KEY = "bclick.score.merge";
  const loadButton = document.getElementById("loadScore");
  const loadInput = document.getElementById("loadScoreFile");
  const mergeToggle = document.getElementById("mergeToggle");
  if (!loadButton || !loadInput) return;

  /**
   * ローカルストレージからトグル設定を取得する。
   */
  const getToggleSetting = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) === true;
    } catch (error) {
      return null;
    }
  };

  /**
   * ローカルストレージへトグル設定を保存する。
   */
  const setToggleSetting = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(Boolean(value)));
    } catch (error) {
      ;
    }
  };

  if (mergeToggle) {
    const savedMerge = getToggleSetting(MERGE_TOGGLE_KEY);
    if (savedMerge !== null) {
      mergeToggle.checked = savedMerge;
    }
    mergeToggle.addEventListener("change", () => {
      setToggleSetting(MERGE_TOGGLE_KEY, mergeToggle.checked);
    });
  }

  /**
   * 読み込みボタンの処理。
   */
  const handleLoadClick = () => {
    loadInput.value = "";
    loadInput.click();
  };

  /**
   * ファイル選択後の処理。
   */
  const handleLoadChange = async () => {
    const file = loadInput.files && loadInput.files[0];
    if (!file) return;
    const useMerge = Boolean(mergeToggle && mergeToggle.checked);
    try {
      const rawData = await readScoreFile(file);
      const scoreData = buildScoreDataFromObject(rawData);
      const store = new ConfigStore();
      if (useMerge) {
        const currentBars = store.getScoreBars();
        const mergedBars = mergeBars(currentBars, scoreData.bars);
        const mergedMeasures = mergedBars.length > 0
          ? mergedBars.length
          : store.getScoreMeasures() || scoreData.measures;
        store.setScoreBars(mergedBars);
        store.setScoreMeasures(mergedMeasures);
      } else {
        saveScoreDataToStore(store, scoreData);
      }
      document.dispatchEvent(new CustomEvent("bclick:scoreloaded", { detail: { merged: useMerge } }));
      showMessage("loadScoreMessage", 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`${useMerge ? "追加" : "読み込み"}に失敗しました: ${message}`);
    }
  };

  loadButton.addEventListener("click", handleLoadClick);
  loadInput.addEventListener("change", handleLoadChange);
});
