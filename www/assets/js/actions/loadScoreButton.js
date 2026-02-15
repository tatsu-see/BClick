import { ConfigStore } from "../utils/store.js";
import {
  buildScoreDataFromObject,
  mergeBars,
  readScoreFile,
  saveScoreDataToStore,
} from "../utils/scoreButtonUtils.js";
import { showMessage } from "../../lib/ShowMessageBox.js";
import { getLangMsg } from "../../lib/Language.js";
import { loadEditScoreDraft, saveEditScoreDraft } from "../utils/editScoreDraft.js";

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
      const draft = loadEditScoreDraft();
      if (useMerge) {
        const currentBars = Array.isArray(draft?.bars) ? draft.bars : store.getScoreBars();
        const mergedBars = mergeBars(currentBars, scoreData.bars);
        const mergedMeasures = mergedBars.length > 0
          ? mergedBars.length
          : (typeof draft?.measures === "number" ? draft.measures : (store.getScoreMeasures() || scoreData.measures));
        if (draft && typeof draft === "object") {
          const nextDraft = {
            ...draft,
            bars: mergedBars,
            measures: mergedMeasures,
          };
          saveEditScoreDraft(nextDraft);
        } else {
          store.setScoreBars(mergedBars);
          store.setScoreMeasures(mergedMeasures);
        }
      } else {
        if (draft && typeof draft === "object") {
          const nextDraft = {
            ...draft,
            tempo: scoreData.tempo,
            timeSignature: scoreData.timeSignature,
            progression: scoreData.progression,
            rhythmPattern: scoreData.rhythmPattern,
            bars: scoreData.bars,
            measures: scoreData.measures,
            barsPerRow: scoreData.barsPerRow,
          };
          saveEditScoreDraft(nextDraft);
        } else {
          saveScoreDataToStore(store, scoreData);
        }
      }
      document.dispatchEvent(new CustomEvent("bclick:scoreloaded", { detail: { merged: useMerge } }));
      showMessage(useMerge ? "mergeScoreMessage" : "loadScoreMessage", 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("スコア読み込みエラー詳細:", error);
      window.alert(
        getLangMsg(
          `${useMerge ? "追加" : "読み込み"}に失敗しました:\n\n${message}\n\nコンソールをご確認ください。`,
          `Failed to ${useMerge ? "merge" : "load"}:\n\n${message}\n\nPlease check the console.`,
        ),
      );
    }
  };

  loadButton.addEventListener("click", handleLoadClick);
  loadInput.addEventListener("change", handleLoadChange);
});
