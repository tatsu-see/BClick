/**
 * sampleScoreButton.js
 * editScore.html に配置したサンプル楽譜の「Try」ボタンを処理する。
 * クリック時にPDFをfetchして解析し、ドラフトデータへ適用する。
 */
import { ConfigStore } from "../utils/store.js";
import {
  buildScoreDataFromObject,
  readScoreFile,
  saveScoreDataToStore,
} from "../utils/scoreButtonUtils.js";
import { getLangMsg } from "../../lib/Language.js";
import { loadEditScoreDraft, saveEditScoreDraft } from "../utils/editScoreDraft.js?v=20260314";

document.addEventListener("DOMContentLoaded", () => {
  const tryButtons = document.querySelectorAll(".sampleScoreTryButton");
  if (!tryButtons.length) return;

  /**
   * 指定URLのPDFをfetchしてFileオブジェクトとして返す。
   * @param {string} url
   * @returns {Promise<File>}
   */
  const fetchPdfAsFile = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }
    const blob = await response.blob();
    const fileName = url.split("/").pop() || "sample.pdf";
    return new File([blob], fileName, { type: blob.type || "application/pdf" });
  };

  /**
   * サンプル楽譜をドラフトへ適用する。
   * @param {string} url
   */
  const applySampleScore = async (url) => {
    const confirmed = window.confirm(
      getLangMsg(
        "現在の編集内容は破棄されます。サンプル楽譜を適用しますか？",
        "Current edits will be discarded. Apply this sample score?",
      ),
    );
    if (!confirmed) return;

    try {
      const file = await fetchPdfAsFile(url);
      const rawData = await readScoreFile(file);
      const scoreData = buildScoreDataFromObject(rawData);
      const store = new ConfigStore();
      const draft = loadEditScoreDraft();
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
          clickTonePattern: Array.isArray(scoreData.clickTonePattern)
            ? scoreData.clickTonePattern.slice()
            : null,
        };
        saveEditScoreDraft(nextDraft);
      } else {
        saveScoreDataToStore(store, scoreData);
      }
      document.dispatchEvent(new CustomEvent("bclick:scoreloaded", { detail: { merged: false } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("サンプル楽譜適用エラー:", error);
      window.alert(
        getLangMsg(
          `適用に失敗しました:\n\n${message}\n\nコンソールをご確認ください。`,
          `Failed to apply:\n\n${message}\n\nPlease check the console.`,
        ),
      );
    }
  };

  tryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.dataset.sampleUrl;
      if (!url) return;
      applySampleScore(url);
    });
  });
});
