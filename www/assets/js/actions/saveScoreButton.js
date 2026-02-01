/**
 * PDF保存ボタンの処理を担当する。
 */
import { ConfigStore } from "../utils/store.js";
import { buildScoreDataFromStore } from "../utils/scoreButtonUtils.js";
import { buildScorePdfBlob } from "../utils/scorePdf.js";

const PDF_FILE_NAME = "BClick-Score.pdf";
const JSON_FILE_NAME = "BClick-Score.json";

document.addEventListener("DOMContentLoaded", () => {
  const saveButton = document.getElementById("saveScore");
  if (!saveButton) return;

  /**
   * 表示中の譜面SVG要素を取得する。
   */
  const getScoreSvgElements = () => Array.from(document.querySelectorAll("#scoreArea svg"));

  /**
   * 保存ボタンの処理。
   */
  const handleSave = async () => {
    const scoreSvgs = getScoreSvgElements();
    if (scoreSvgs.length === 0) {
      window.alert("譜面の描画が見つかりませんでした。");
      return;
    }
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      window.alert("PDFを開けませんでした。ポップアップブロックを確認してください。");
      return;
    }
    const store = new ConfigStore();
    const scoreData = buildScoreDataFromStore(store);
    try {
      const pdfBlob = await buildScorePdfBlob({
        svgEls: scoreSvgs,
        scoreData,
        jsonFileName: JSON_FILE_NAME,
        title: "B.Click Score",
      });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      previewWindow.document.title = PDF_FILE_NAME;
      previewWindow.location.href = pdfUrl;
      window.setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl);
      }, 60000);
    } catch (error) {
      previewWindow.close();
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`PDFの生成に失敗しました: ${message}`);
    }
  };

  saveButton.addEventListener("click", handleSave);
});
