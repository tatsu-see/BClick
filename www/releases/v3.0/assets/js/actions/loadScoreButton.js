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
  const dropZone = document.querySelector("main.pageFrame");
  let dropEnterCount = 0;
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
   * DataTransfer がファイルを含んでいるか判定する。
   * @param {DataTransfer | null | undefined} dataTransfer
   * @returns {boolean}
   */
  const hasFilePayload = (dataTransfer) => {
    if (!dataTransfer) return false;
    const types = Array.from(dataTransfer.types || []);
    return types.includes("Files");
  };

  /**
   * ドロップ対象の強調表示を切り替える。
   * @param {boolean} isActive
   */
  const setDropZoneActive = (isActive) => {
    if (!dropZone) return;
    dropZone.classList.toggle("isFileDragOver", isActive);
  };

  /**
   * 指定ファイルを読み込んで、現在の編集状態へ反映する。
   * @param {File} file
   */
  const loadSelectedFile = async (file) => {
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
            clickCount: scoreData.clickCount,
            countIn: scoreData.countIn,
            timeSignature: scoreData.timeSignature,
            progression: scoreData.progression,
            rhythmPattern: scoreData.rhythmPattern,
            bars: scoreData.bars,
            measures: scoreData.measures,
            barsPerRow: scoreData.barsPerRow,
            scoreEnabled: scoreData.scoreEnabled,
            clickTonePattern: Array.isArray(scoreData.clickTonePattern)
              ? scoreData.clickTonePattern.slice()
              : null,
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

  /**
   * ファイル選択後の処理。
   */
  const handleLoadChange = async () => {
    const file = loadInput.files && loadInput.files[0];
    await loadSelectedFile(file);
  };

  /**
   * ドラッグ中にブラウザがファイルを直接開かないよう抑止する。
   * @param {DragEvent} event
   */
  const handleWindowDragOver = (event) => {
    if (!hasFilePayload(event.dataTransfer)) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  /**
   * 画面外や対象外にドロップされた場合も、ブラウザのファイル直接表示を抑止する。
   * @param {DragEvent} event
   */
  const handleWindowDrop = (event) => {
    if (!hasFilePayload(event.dataTransfer)) return;
    event.preventDefault();
    dropEnterCount = 0;
    setDropZoneActive(false);
  };

  /**
   * ドロップ対象へ入ったときの処理。
   * @param {DragEvent} event
   */
  const handleDropZoneDragEnter = (event) => {
    if (!hasFilePayload(event.dataTransfer)) return;
    event.preventDefault();
    dropEnterCount += 1;
    setDropZoneActive(true);
  };

  /**
   * ドロップ対象上をドラッグ中の処理。
   * @param {DragEvent} event
   */
  const handleDropZoneDragOver = (event) => {
    if (!hasFilePayload(event.dataTransfer)) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setDropZoneActive(true);
  };

  /**
   * ドロップ対象から離れたときの処理。
   * @param {DragEvent} event
   */
  const handleDropZoneDragLeave = (event) => {
    if (!hasFilePayload(event.dataTransfer) && dropEnterCount === 0) return;
    event.preventDefault();
    dropEnterCount = Math.max(0, dropEnterCount - 1);
    if (dropEnterCount === 0) {
      setDropZoneActive(false);
    }
  };

  /**
   * ドロップされたファイルを読み込む。
   * @param {DragEvent} event
   */
  const handleDropZoneDrop = async (event) => {
    if (!hasFilePayload(event.dataTransfer)) return;
    event.preventDefault();
    dropEnterCount = 0;
    setDropZoneActive(false);
    const file = event.dataTransfer?.files && event.dataTransfer.files[0];
    await loadSelectedFile(file);
  };

  loadButton.addEventListener("click", handleLoadClick);
  loadInput.addEventListener("change", handleLoadChange);
  window.addEventListener("dragover", handleWindowDragOver);
  window.addEventListener("drop", handleWindowDrop);
  if (dropZone) {
    dropZone.addEventListener("dragenter", handleDropZoneDragEnter);
    dropZone.addEventListener("dragover", handleDropZoneDragOver);
    dropZone.addEventListener("dragleave", handleDropZoneDragLeave);
    dropZone.addEventListener("drop", handleDropZoneDrop);
  }
});
