/**
 * スコアPDF生成に関する処理をまとめる。
 */
import { buildScoreJsonString } from "./scoreSerialization.js";

/**
 * SVGの描画サイズを取得する。
 */
const getSvgSize = (svgEl) => {
  const viewBox = svgEl.viewBox && svgEl.viewBox.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const widthAttr = parseFloat(svgEl.getAttribute("width"));
  const heightAttr = parseFloat(svgEl.getAttribute("height"));
  if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr)) {
    return { width: widthAttr, height: heightAttr };
  }
  const rect = svgEl.getBoundingClientRect();
  return {
    width: rect.width > 0 ? rect.width : 800,
    height: rect.height > 0 ? rect.height : 600,
  };
};

/**
 * SVGをPNGのUint8Arrayに変換する。
 */
const convertSvgToPngBytes = (svgEl) =>
  new Promise((resolve, reject) => {
    const { width, height } = getSvgSize(svgEl);
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute("width", String(width));
    cloned.setAttribute("height", String(height));

    const serializer = new XMLSerializer();
    let svgText = serializer.serializeToString(cloned);
    if (!svgText.includes("xmlns=")) {
      svgText = svgText.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!svgText.includes("xmlns:xlink=")) {
      svgText = svgText.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = window.URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      window.URL.revokeObjectURL(svgUrl);
      const scale = window.devicePixelRatio || 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("キャンバスの初期化に失敗しました。"));
        return;
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error("PNG生成に失敗しました。"));
          return;
        }
        pngBlob.arrayBuffer().then((buffer) => {
          resolve(new Uint8Array(buffer));
        }).catch(reject);
      }, "image/png");
    };
    image.onerror = () => {
      window.URL.revokeObjectURL(svgUrl);
      reject(new Error("SVGの読み込みに失敗しました。"));
    };
    image.src = svgUrl;
  });

/**
 * SVGとJSONを埋め込んだPDF Blobを生成する。
 */
export const buildScorePdfBlob = async ({
  svgEl,
  scoreData,
  jsonFileName,
  title,
} = {}) => {
  if (!window.PDFLib || !window.PDFLib.PDFDocument) {
    throw new Error("PDFライブラリの読み込みに失敗しました。");
  }
  if (!svgEl) {
    throw new Error("譜面の描画が見つかりませんでした。");
  }
  const pngBytes = await convertSvgToPngBytes(svgEl);
  const jsonText = buildScoreJsonString(scoreData);
  const jsonBytes = new TextEncoder().encode(jsonText);

  const pdfDoc = await window.PDFLib.PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(pngBytes);
  const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pngImage.width,
    height: pngImage.height,
  });
  if (title) {
    pdfDoc.setTitle(title);
  }
  if (jsonFileName) {
    pdfDoc.attach(jsonBytes, jsonFileName, {
      mimeType: "application/json",
      description: "B.Click score data",
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};
