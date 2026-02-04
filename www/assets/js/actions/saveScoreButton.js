/**
 * PDF保存ボタンの処理を担当する。
 */
import { ConfigStore } from "../utils/store.js";
import { buildScoreDataFromStore } from "../utils/scoreButtonUtils.js";
import { buildScorePdfBlob } from "../utils/scorePdf.js";
import { getLangMsg } from "../../lib/Language.js";

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
      window.alert(
        getLangMsg(
          "譜面の描画が見つかりませんでした。",
          "The score rendering was not found.",
        ),
      );
      return;
    }
    window.alert(
      getLangMsg(
        "PDFが表示されるので保存してください。",
        "A PDF will be shown. Please save it.",
      ),
    );
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      window.alert(
        getLangMsg(
          "PDFを開けませんでした。ポップアップブロックを確認してください。",
          "Could not open the PDF. Please check your popup blocker.",
        ),
      );
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
      window.alert(
        getLangMsg(
          `PDFの生成に失敗しました: ${message}`,
          `Failed to generate the PDF: ${message}`,
        ),
      );
    }
  };

  saveButton.addEventListener("click", handleSave);
});
