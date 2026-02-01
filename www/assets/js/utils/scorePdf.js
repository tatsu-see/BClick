/**
 * スコアPDF生成に関する処理をまとめる。
 * 
 * Spec PDF保存の仕様
 * ・印刷する紙 A4縦 とする
 * ・A4紙の、上下には 30mm 程の余白を用意し、左右には 15mm 程の余白を用意する。
 * ・A4紙の、上詰めに楽譜を配置する。
 * ・リズム楽譜のSVGをPDFに載せる。
 *
 * 重要な技術的注記：alphaTab の font-size スケーリング補正について
 * ・alphaTab は display.scale: 0.95 の設定により、テキト要素（ト音記号、拍子など）に
 *   style="font-size: 95%" を適用する。これは相対単位である。
 * ・SVG → Image → Canvas 変換時、相対単位の font-size は、親要素の font-size に依存する。
 * ・ブラウザ表示時と PDF 出力時で親要素が異なるため、相対値の計算結果が異なり、
 *   テキトサイズの齟齬が発生する。
 * ・修正方法：SVG クローン時に、元の SVG 要素から window.getComputedStyle() で
 *   計算済みのフォントサイズ（絶対値、px単位）を取得し、クローン要素の
 *   style="font-size: 95%" をその絶対値に置き換える。これにより、PDF出力時に
 *   ブラウザ表示と同じサイズが保証される。
 */
import { buildScoreJsonString } from "./scoreSerialization.js";

// A4縦（mm）→ PDFポイント換算用
const MM_TO_PT = 72 / 25.4;
const A4_WIDTH_PT = 210 * MM_TO_PT;
const A4_HEIGHT_PT = 297 * MM_TO_PT;
const A4_MARGIN_TOP_BOTTOM_PT = 30 * MM_TO_PT;
const A4_MARGIN_LEFT_RIGHT_PT = 15 * MM_TO_PT;
const ALPHATAB_FONT_FAMILY = "alphaTab";
const ALPHATAB_FONT_FILE_CANDIDATES = [
  { file: "Bravura.woff2", format: "woff2", mime: "font/woff2" },
  { file: "Bravura.woff", format: "woff", mime: "font/woff" },
  { file: "Bravura.ttf", format: "truetype", mime: "font/ttf" },
];
let cachedAlphaTabFontCss = null;

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
 * alphaTabフォントディレクトリを推定する。
 */
const getAlphaTabFontDirectory = () => {
  if (typeof window.ALPHATAB_FONT === "string" && window.ALPHATAB_FONT.length > 0) {
    return window.ALPHATAB_FONT;
  }
  const scripts = Array.from(document.scripts || []);
  const alphaTabScript = scripts.find((script) =>
    script.src && /alphaTab(\.min)?\.js/i.test(script.src),
  );
  if (!alphaTabScript || !alphaTabScript.src) return null;
  return alphaTabScript.src.replace(/alphaTab(\.min)?\.js.*$/i, "font/");
};

/**
 * ArrayBufferをBase64へ変換する。
 */
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

/**
 * alphaTabフォントを埋め込むための @font-face CSS を生成する。
 */
const loadAlphaTabFontFaceCss = async () => {
  if (cachedAlphaTabFontCss !== null) return cachedAlphaTabFontCss;
  const fontDir = getAlphaTabFontDirectory();
  if (!fontDir) {
    cachedAlphaTabFontCss = "";
    return cachedAlphaTabFontCss;
  }
  for (const candidate of ALPHATAB_FONT_FILE_CANDIDATES) {
    try {
      const response = await fetch(`${fontDir}${candidate.file}`, { cache: "force-cache" });
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      cachedAlphaTabFontCss = [
        "@font-face {",
        `  font-family: '${ALPHATAB_FONT_FAMILY}';`,
        `  src: url(data:${candidate.mime};base64,${base64}) format('${candidate.format}');`,
        "  font-weight: normal;",
        "  font-style: normal;",
        "}",
      ].join("\n");
      return cachedAlphaTabFontCss;
    } catch (error) {
      // 次の候補を試す。
    }
  }
  cachedAlphaTabFontCss = "";
  return cachedAlphaTabFontCss;
};

/**
 * SVG内で使用しているフォントの読み込みを待つ。
 */
const ensureSvgFontsReady = async (svgEl) => {
  if (!document.fonts || typeof document.fonts.load !== "function") return;
  const fontFamilies = new Set();
  svgEl.querySelectorAll("text, tspan").forEach((node) => {
    const style = window.getComputedStyle(node);
    if (!style || !style.fontFamily) return;
    style.fontFamily.split(",").forEach((raw) => {
      const trimmed = raw.trim().replace(/^["']|["']$/g, "");
      if (trimmed) {
        fontFamilies.add(trimmed);
      }
    });
  });
  const loaders = Array.from(fontFamilies).map((family) =>
    document.fonts.load(`16px ${family}`),
  );
  if (loaders.length > 0) {
    await Promise.allSettled(loaders);
  }
  await document.fonts.ready;
};

/**
 * @font-face をSVGへ埋め込むためにCSSを収集する。
 */
const collectFontFaceCss = () => {
  if (!document.styleSheets) return "";
  const chunks = [];
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const rules = sheet.cssRules || [];
      Array.from(rules).forEach((rule) => {
        if (rule.type === CSSRule.FONT_FACE_RULE) {
          chunks.push(rule.cssText);
        }
      });
    } catch (error) {
      // CORSで参照できないスタイルシートは無視する。
    }
  });
  return chunks.join("\n");
};

/**
 * SVG内のテキストにフォント情報をインライン化する。
 */
const inlineSvgFontStyles = (sourceSvg, targetSvg) => {
  const sourceNodes = sourceSvg.querySelectorAll("text, tspan");
  const targetNodes = targetSvg.querySelectorAll("text, tspan");
  const count = Math.min(sourceNodes.length, targetNodes.length);
  for (let i = 0; i < count; i += 1) {
    const source = sourceNodes[i];
    const target = targetNodes[i];
    const style = window.getComputedStyle(source);
    if (!style) continue;
    if (style.fontFamily) {
      target.setAttribute("font-family", style.fontFamily);
    }
    if (style.fontSize) {
      target.setAttribute("font-size", style.fontSize);
    }
    if (style.fontWeight) {
      target.setAttribute("font-weight", style.fontWeight);
    }
    if (style.fontStyle) {
      target.setAttribute("font-style", style.fontStyle);
    }
  }
};

/**
 * SVGへ @font-face の style を注入する。
 */
const injectFontFaceCss = (svgEl, cssText) => {
  if (!cssText) return;
  const defs = svgEl.querySelector("defs") || svgEl.insertBefore(
    document.createElementNS("http://www.w3.org/2000/svg", "defs"),
    svgEl.firstChild,
  );
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = cssText;
  defs.appendChild(style);
};

/**
 * SVGをPNGのUint8Arrayに変換する。
 */
const convertSvgToPngBytes = async (svgEl) => {
  await ensureSvgFontsReady(svgEl);
  const alphaTabFontCss = await loadAlphaTabFontFaceCss();
  return new Promise((resolve, reject) => {
    const { width, height } = getSvgSize(svgEl);
    const cloned = svgEl.cloneNode(true);
    cloned.setAttribute("width", String(width));
    cloned.setAttribute("height", String(height));
    inlineSvgFontStyles(svgEl, cloned);
    
    // テキト要素の相対 font-size: 95% を、計算済みの絶対値に変換
    // これにより、PDF出力時にもブラウザ表示と同じサイズが保証される
    const origTextElements = svgEl.querySelectorAll("text, tspan");
    const clonedTextElements = cloned.querySelectorAll("text, tspan");
    const count = Math.min(origTextElements.length, clonedTextElements.length);
    for (let i = 0; i < count; i += 1) {
      const origEl = origTextElements[i];
      const clonedEl = clonedTextElements[i];
      
      // ブラウザで計算済みのスタイルを取得
      const origComputed = window.getComputedStyle(origEl);
      const origFontSize = origComputed.fontSize; // "34.2px" など
      
      if (origFontSize) {
        // クローンの style を更新：相対値 95% を絶対値に置き換え
        let style = clonedEl.getAttribute("style") || "";
        if (style.includes("font-size")) {
          style = style.replace(/font-size:\s*95%/gi, `font-size: ${origFontSize}`);
          clonedEl.setAttribute("style", style);
        }
      }
    }
    
    const fontCss = [collectFontFaceCss(), alphaTabFontCss].filter(Boolean).join("\n");
    injectFontFaceCss(cloned, fontCss);

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
};

/**
 * A4用紙の描画領域を計算する。
 */
const getA4ContentBox = () => {
  const width = A4_WIDTH_PT - A4_MARGIN_LEFT_RIGHT_PT * 2;
  const height = A4_HEIGHT_PT - A4_MARGIN_TOP_BOTTOM_PT * 2;
  return {
    pageWidth: A4_WIDTH_PT,
    pageHeight: A4_HEIGHT_PT,
    contentX: A4_MARGIN_LEFT_RIGHT_PT,
    contentY: A4_MARGIN_TOP_BOTTOM_PT,
    contentWidth: width,
    contentHeight: height,
  };
};

/**
 * SVGとJSONを埋め込んだPDF Blobを生成する。
 */
export const buildScorePdfBlob = async ({
  svgEl,
  svgEls,
  scoreData,
  jsonFileName,
  title,
} = {}) => {
  if (!window.PDFLib || !window.PDFLib.PDFDocument) {
    throw new Error("PDFライブラリの読み込みに失敗しました。");
  }
  const svgList = Array.isArray(svgEls) && svgEls.length > 0
    ? svgEls
    : (svgEl ? [svgEl] : []);
  if (svgList.length === 0) {
    throw new Error("譜面の描画が見つかりませんでした。");
  }
  const jsonText = buildScoreJsonString(scoreData);
  const jsonBytes = new TextEncoder().encode(jsonText);

  const pdfDoc = await window.PDFLib.PDFDocument.create();
  const {
    pageWidth,
    pageHeight,
    contentX,
    contentY,
    contentWidth,
    contentHeight,
  } = getA4ContentBox();
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const pngBytesList = [];
  for (const svg of svgList) {
    // eslint-disable-next-line no-await-in-loop
    const pngBytes = await convertSvgToPngBytes(svg);
    // eslint-disable-next-line no-await-in-loop
    const pngImage = await pdfDoc.embedPng(pngBytes);
    pngBytesList.push(pngImage);
  }

  const baseScales = pngBytesList.map((image) => contentWidth / image.width);
  const totalHeight = pngBytesList.reduce((sum, image, index) => {
    const scale = baseScales[index];
    return sum + image.height * scale;
  }, 0);
  const extraScale = totalHeight > 0 ? Math.min(1, contentHeight / totalHeight) : 1;

  let cursorY = contentY + contentHeight;
  pngBytesList.forEach((image, index) => {
    const scale = baseScales[index] * extraScale;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = contentX + (contentWidth - drawWidth) / 2;
    cursorY -= drawHeight;
    page.drawImage(image, {
      x: drawX,
      y: cursorY,
      width: drawWidth,
      height: drawHeight,
    });
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

/**
 * PDF保存用にalphaTabフォントを事前読み込みする。
 */
export const preloadAlphaTabFonts = async () => {
  await loadAlphaTabFontFaceCss();
};
