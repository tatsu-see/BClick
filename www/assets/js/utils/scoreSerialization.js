/**
 * スコアのJSON保存形式に関する変換処理をまとめる。
 */
import ScoreData from "../models/ScoreModel.js";
import { getLangMsg } from "../../lib/Language.js";

const DEFAULT_SETTINGS = {
  tempo: 60,
  clickCount: 4,
  countIn: 4,
  timeSignature: "4/4",
  progression: "",
  measures: 8,
  barsPerRow: 2,
  scoreEnabled: true,
};

//##Spec
// JSON保存形式のバージョン定義。
export const SCORE_JSON_VERSION = 0;

//##Spec
// JSON保存形式の仕様（v0）
// {
//   "schemaVersion": 0,
//   "score": {
//     "tempo": 60,
//     "clickCount": 4,
//     "countIn": 4,
//     "timeSignature": "4/4",
//     "measures": 8,
//     "progression": "G C Em",
//     "barsPerRow": 2,
//     "scoreEnabled": true,
//     "rhythmPattern": ["4", "4", "4", "4"],
//     "bars": [
//       { "chord": ["G", "", "", ""], "rhythm": ["4", "4", "4", "4"] }
//     ]
//   }
// }
//
// キーの説明
// - schemaVersion: JSON保存形式のバージョン
// - score: 楽譜データ本体
//   - tempo: BPMテンポ
//   - clickCount: クリック数（拍数）
//   - countIn: カウントイン（拍数）
//   - timeSignature: 拍子（例 "4/4"）
//   - measures: 小節数
//   - progression: コード進行（スペース区切り）
//   - barsPerRow: 1段あたりの小節数
//   - scoreEnabled: リズム表示のON/OFF
//   - rhythmPattern: 小節内の音価トークン配列
//   - bars: 小節配列（chord: 拍ごとのコード配列, rhythm: 音符トークン配列）
//
// 楽譜の読込・保存に対応していない設定項目
// - clickVolume: クリック音量
// - editScore 画面の 調節のトグルスイッチ

/**
 * 初期設定値を取得する。
 */
export const getDefaultSettings = () => ({ ...DEFAULT_SETTINGS });

/**
 * 拍子から拍数を取得する。
 */
export const getBeatCountFromTimeSignature = (timeSignature) => {
  const [numeratorRaw] = String(timeSignature || "").split("/");
  const numerator = Number.parseInt(numeratorRaw, 10);
  return Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
};

/**
 * 1小節分のデフォルトリズムパターンを生成する。
 */
export const buildDefaultRhythmPattern = (beatCount) =>
  Array.from({ length: beatCount }, () => "4");

/**
 * JSON読み込み用にScoreDataを生成する。
 */
export const buildScoreDataFromObject = (source) => {
  if (!source || typeof source !== "object") {
    throw new Error(getLangMsg("JSONデータが不正です。", "Invalid JSON data."));
  }
  if (source.schemaVersion !== SCORE_JSON_VERSION || !source.score || typeof source.score !== "object") {
    throw new Error(getLangMsg("JSONデータが不正です。", "Invalid JSON data."));
  }
  const normalized = source.score;
  const defaults = getDefaultSettings();
  const tempoRaw = Number.parseInt(normalized.tempo, 10);
  const tempo = Number.isNaN(tempoRaw) ? defaults.tempo : tempoRaw;
  const clickCountRaw = Number.parseInt(normalized.clickCount, 10);
  const clickCount = Number.isNaN(clickCountRaw) ? defaults.clickCount : clickCountRaw;
  const countInRaw = Number.parseInt(normalized.countIn, 10);
  const countIn = Number.isNaN(countInRaw) ? defaults.countIn : countInRaw;
  const timeSignature = typeof normalized.timeSignature === "string" && normalized.timeSignature.length > 0
    ? normalized.timeSignature
    : defaults.timeSignature;
  const measuresRaw = Number.parseInt(normalized.measures, 10);
  const measures = Number.isNaN(measuresRaw) ? defaults.measures : measuresRaw;
  const barsPerRowRaw = Number.parseInt(normalized.barsPerRow, 10);
  const barsPerRow = Number.isNaN(barsPerRowRaw) ? defaults.barsPerRow : barsPerRowRaw;
  const scoreEnabled = typeof normalized.scoreEnabled === "boolean"
    ? normalized.scoreEnabled
    : defaults.scoreEnabled;
  const progression = typeof normalized.progression === "string" ? normalized.progression : defaults.progression;
  const beatCount = getBeatCountFromTimeSignature(timeSignature);
  const rhythmPattern = Array.isArray(normalized.rhythmPattern) && normalized.rhythmPattern.length > 0
    ? normalized.rhythmPattern
    : buildDefaultRhythmPattern(beatCount);
  const bars = Array.isArray(normalized.bars) ? normalized.bars : null;

  return new ScoreData({
    tempo,
    clickCount,
    countIn,
    timeSignature,
    measures,
    barsPerRow,
    scoreEnabled,
    progression,
    rhythmPattern,
    bars,
  });
};

/**
 * ScoreDataをJSON文字列に変換する。
 */
export const buildScoreJsonString = (scoreData) => {
  const payload = {
    schemaVersion: SCORE_JSON_VERSION,
    score: scoreData,
  };
  return JSON.stringify(payload, null, 2);
};

/**
 * JSONファイルを読み込む。
 */
const readJsonFileAsObject = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => {
      reject(
        reader.error
          || new Error(getLangMsg("ファイルの読み込みに失敗しました。", "Failed to read the file.")),
      );
    };
    reader.readAsText(file);
  });

//##Spec
// PDF内部の名前オブジェクトは PDF独自形式になることがあるため、
// decodeText/asString に対応している場合はそれを優先し、最後は文字列化する。
const decodePdfString = (value) => {
  if (!value) return "";
  if (typeof value.decodeText === "function") {
    return value.decodeText();
  }
  if (typeof value.asString === "function") {
    return value.asString();
  }
  return String(value);
};

const readPdfAttachmentJson = async (file) => {
  //##Spec
  // 保存時にPDFへ添付したJSONを復元するための「正」の実装。
  // 添付の格納場所はPDFによって差があるため、複数経路で探索する。
  /**
   * PDF添付ファイル抽出処理
   * 
   * 重要な技術的注記：
   * ================================================
   * 1. PDF保存時の圧縮について
   *    - scorePdf.js の pdfDoc.attach(jsonBytes, jsonFileName) では
   *      圧縮オプションを明示的に指定していない
   *    - pdf-libはデフォルトでFlate圧縮を適用する
   *    - そのため、読み込み時に解凍が必須
   * 
   * 2. embeddedFileStreamの構造
   *    - fileSpec.EF.F（またはFileStream）から取得
   *    - `contents` プロパティに圧縮済みバイト列が格納
   *    - 例：249バイト（圧縮） → 864バイト（解凍後）
   * 
   * 3. Flate解凍方法
   *    - 利用可能：Blob.stream().pipeThrough(DecompressionStream("deflate"))
   *    - ⚠️ Uint8Array.stream() は存在しない
   *    - ⚠️ decodePDFRawStream() はUndefinedを返すため不可
   *    - 必ず Blob オブジェクトに変換してから stream() を呼び出す
   * 
   * 4. フォールバック戦略
   *    - 優先度1: Blob.stream() + DecompressionStream で解凍
   *    - 優先度2: getContents()
   *    - 優先度3: decodePDFRawStream()
   *    - 優先度4: 他のプロパティ
   *    - 例外：解凍失敗時は圧縮なしとみなしてそのまま使用
   * ================================================
   */
  if (!window.PDFLib || !window.PDFLib.PDFDocument) {
    throw new Error(
      getLangMsg("PDFライブラリの読み込みに失敗しました。", "Failed to load the PDF library."),
    );
  }
  const { PDFDocument, PDFName, PDFDict, PDFArray, decodePDFRawStream } = window.PDFLib;
  const pdfBytes = await file.arrayBuffer();
  
  console.log("[PDF] ファイル読み込み開始:", file.name, "サイズ:", pdfBytes.byteLength);
  
  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(pdfBytes);
    } catch (error) {
      console.error("[PDF] PDF読み込みエラー:", error);
      throw new Error(
        getLangMsg(
          `PDF読み込み失敗: ${error instanceof Error ? error.message : String(error)}`,
          `Failed to load PDF: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }

  console.log("[PDF] PDF読み込み成功");
  
  const catalog = pdfDoc.catalog;
    if (!catalog) {
      console.error("[PDF] カタログが見つかりません");
      throw new Error(
        getLangMsg(
          "PDF内の構造を読み込めませんでした。",
          "Could not read the PDF internal structure.",
        ),
      );
    }
  console.log("[PDF] PDFカタログ取得成功");

  const normalizeToUint8Array = (value) => {
    if (!value) return null;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (Array.isArray(value)) return Uint8Array.from(value);
    if (value && typeof value === "object" && value.buffer instanceof ArrayBuffer) {
      return new Uint8Array(value.buffer, value.byteOffset || 0, value.byteLength || value.length || 0);
    }
    // バイト列が文字列の場合の変換
    if (typeof value === "string") {
      return new TextEncoder().encode(value);
    }
    return null;
  };

  const readBytesFromFileStream = async (fileStream) => {
    /**
     * ファイルストリームからバイト列を抽出・解凍する
     * 
     * 処理フロー：
     * 1. fileStream.contents から圧縮済みバイト列を取得
     * 2. Uint8Array → Blob に変換（stream()メソッド使用のため必須）
     * 3. Blob.stream().pipeThrough(DecompressionStream("deflate")) で解凍
     * 4. 解凍に失敗→圧縮なしのデータとして使用
     */
    if (!fileStream) {
      console.log("[PDF] readBytesFromFileStream: fileStreamがnull");
      return null;
    }
    console.log("[PDF] readBytesFromFileStream: 開始", typeof fileStream, fileStream?.constructor?.name);
    
    let bytes = null;
    
    // 方法1: contentsプロパティから取得＆Flate解凍
    // ★重要★ PDF保存時がFlate圧縮されているため、これが最優先
    if (fileStream.contents) {
      try {
        console.log("[PDF] readBytesFromFileStream: contents試行");
        bytes = fileStream.contents;
        if (bytes) {
          console.log("[PDF] readBytesFromFileStream: contents取得成功", bytes?.length || bytes?.byteLength);
          
          // Uint8Arrayに正規化
          const bytesArray = normalizeToUint8Array(bytes);
          if (bytesArray) {
            // Flate圧縮を試して解凍
            try {
              console.log("[PDF] readBytesFromFileStream: Flate解凍試行");
              // ★重要★ stream() メソッドは Blob にしかない
              // Uint8Array.stream() は存在しないため、必ず Blob でラップする
              const blob = new Blob([bytesArray], { type: "application/octet-stream" });
              const decompressedStream = blob.stream().pipeThrough(
                new DecompressionStream("deflate")
              );
              const reader = decompressedStream.getReader();
              const chunks = [];
              let done = false;
              while (!done) {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;
                if (value) {
                  chunks.push(value);
                }
              }
              const decompressed = new Uint8Array(
                chunks.reduce((acc, chunk) => acc + chunk.length, 0)
              );
              let offset = 0;
              for (const chunk of chunks) {
                decompressed.set(chunk, offset);
                offset += chunk.length;
              }
              if (decompressed.length > 0) {
                console.log("[PDF] readBytesFromFileStream: Flate解凍成功", decompressed.length);
                return decompressed;
              }
            } catch (e) {
              console.log("[PDF] readBytesFromFileStream: Flate解凍失敗", e instanceof Error ? e.message : String(e));
              // 圧縮されていない可能性あり、そのまま使用
              if (bytesArray.length > 0) {
                console.log("[PDF] readBytesFromFileStream: 圧縮なしと判定、そのまま使用", bytesArray.length);
                return bytesArray;
              }
            }
          }
        }
      } catch (e) {
        console.log("[PDF] readBytesFromFileStream: contents失敗", e instanceof Error ? e.message : String(e));
      }
    }
    
    // フォールバック: getContentsを使用
    if (!bytes && typeof fileStream.getContents === "function") {
      try {
        console.log("[PDF] readBytesFromFileStream: getContents試行");
        const result = fileStream.getContents();
        if (result && typeof result.then === "function") {
          bytes = await result;
        } else {
          bytes = result;
        }
        if (bytes) {
          console.log("[PDF] readBytesFromFileStream: getContents成功", bytes?.length || bytes?.byteLength);
        }
      } catch (e) {
        console.log("[PDF] readBytesFromFileStream: getContents失敗", e instanceof Error ? e.message : String(e));
      }
    }

    // フォールバック: decodePDFRawStream
    // ⚠️ 注：現在の環境では undefined を返すため、最後の手段
    if (!bytes && typeof decodePDFRawStream === "function") {
      try {
        console.log("[PDF] readBytesFromFileStream: decodePDFRawStream試行");
        const result = decodePDFRawStream(fileStream);
        if (result && typeof result.then === "function") {
          bytes = await result;
        } else {
          bytes = result;
        }
        if (bytes) {
          console.log("[PDF] readBytesFromFileStream: decodePDFRawStream成功", bytes?.length || bytes?.byteLength);
        }
      } catch (e) {
        console.log("[PDF] readBytesFromFileStream: decodePDFRawStream失敗", e instanceof Error ? e.message : String(e));
      }
    }

    // フォールバック: その他のプロパティ
    if (!bytes && fileStream.decodedStream) {
      try {
        console.log("[PDF] readBytesFromFileStream: decodedStream試行");
        bytes = fileStream.decodedStream;
        if (bytes) {
          console.log("[PDF] readBytesFromFileStream: decodedStream成功", bytes?.length || bytes?.byteLength);
        }
      } catch (e) {
        console.log("[PDF] readBytesFromFileStream: decodedStream失敗", e instanceof Error ? e.message : String(e));
      }
    }

    if (!bytes) {
      console.log("[PDF] readBytesFromFileStream: 全方法失敗");
      return null;
    }

    const normalized = normalizeToUint8Array(bytes);
    if (normalized) {
      console.log("[PDF] readBytesFromFileStream: 正規化成功", normalized.length);
    } else {
      console.log("[PDF] readBytesFromFileStream: 正規化失敗");
    }
    return normalized;
  };

  const extractAttachmentFromFileSpec = async (fileSpec, nameObj = null) => {
    if (!fileSpec) {
      console.log("[PDF] extractAttachmentFromFileSpec: fileSpecがnull");
      return null;
    }
    console.log("[PDF] extractAttachmentFromFileSpec: 開始");
    console.log("[PDF] extractAttachmentFromFileSpec: fileSpecプロパティ", Object.keys(fileSpec || {}).slice(0, 20));
    
    // fileSpec.lookupが無い場合は直接アクセスを試す
    const lookup = typeof fileSpec.lookup === "function" 
      ? fileSpec.lookup.bind(fileSpec)
      : (key) => fileSpec.get ? fileSpec.get(key) : fileSpec[String(key).toLowerCase()];
    
    const fileName =
      decodePdfString(nameObj)
      || decodePdfString(lookup(PDFName.of("UF")))
      || decodePdfString(lookup(PDFName.of("F")))
      || "attachment";
    
    console.log("[PDF] extractAttachmentFromFileSpec: ファイル名 =", fileName);
    
    // EFDictを取得
    const efDict = lookup(PDFName.of("EF"));
    console.log("[PDF] extractAttachmentFromFileSpec: EFDict取得 =", !!efDict);
    
    if (!efDict) {
      console.log("[PDF] extractAttachmentFromFileSpec: EFDict見つかりません");
      return null;
    }
    
    // EFDict内のF または UF キーから実ファイルスペックを取得
    const efLookup = typeof efDict.lookup === "function" 
      ? efDict.lookup.bind(efDict)
      : (key) => efDict.get ? efDict.get(key) : efDict[String(key).toLowerCase()];
    
    const embeddedFileStream = efLookup(PDFName.of("F")) || efLookup(PDFName.of("UF"));
    console.log("[PDF] extractAttachmentFromFileSpec: embeddedFileStream取得 =", !!embeddedFileStream);
    console.log("[PDF] extractAttachmentFromFileSpec: embeddedFileStreamプロパティ", Object.keys(embeddedFileStream || {}).slice(0, 20));
    
    // embeddedFileStreamがPDFRef の場合、実オブジェクトを取得
    if (embeddedFileStream && typeof embeddedFileStream.obj === "function") {
      console.log("[PDF] extractAttachmentFromFileSpec: embeddedFileStreamはPDFRef、解決中...");
      try {
        const resolved = embeddedFileStream.obj();
        console.log("[PDF] extractAttachmentFromFileSpec: 解決後:", resolved?.constructor?.name);
        console.log("[PDF] extractAttachmentFromFileSpec: 解決後プロパティ", Object.keys(resolved || {}).slice(0, 20));
        
        // 解決されたオブジェクトからデータを取得
        const resolvedLookup = typeof resolved.lookup === "function" 
          ? resolved.lookup.bind(resolved)
          : (key) => resolved.get ? resolved.get(key) : resolved[String(key).toLowerCase()];
        
        const fileStream = resolvedLookup(PDFName.of("EF")) || resolved;
        console.log("[PDF] extractAttachmentFromFileSpec: 解決後fileStream取得 =", !!fileStream);
        
        const bytes = await readBytesFromFileStream(fileStream);
        console.log("[PDF] extractAttachmentFromFileSpec: bytes取得 =", !!bytes, "長さ =", bytes?.length);
        
        if (bytes && bytes.length > 0) {
          console.log("[PDF] extractAttachmentFromFileSpec: 成功");
          return { name: fileName, bytes };
        }
      } catch (e) {
        console.log("[PDF] extractAttachmentFromFileSpec: PDF Ref解決失敗", e instanceof Error ? e.message : String(e));
      }
    }
    
    // 通常のファイルストリームから取得
    console.log("[PDF] extractAttachmentFromFileSpec: 通常のファイルストリーム処理");
    console.log("[PDF] extractAttachmentFromFileSpec: embeddedFileStreamの完全構造:", {
      keys: Object.keys(embeddedFileStream || {}),
      hasContents: !!embeddedFileStream?.contents,
      contentsType: typeof embeddedFileStream?.contents,
      contentsLength: embeddedFileStream?.contents?.length || embeddedFileStream?.contents?.byteLength,
      hasDict: !!embeddedFileStream?.dict,
      dictKeys: embeddedFileStream?.dict ? Object.keys(embeddedFileStream.dict) : null
    });
    
    const fileStream = embeddedFileStream;
    const bytes = await readBytesFromFileStream(fileStream);
    console.log("[PDF] extractAttachmentFromFileSpec: bytes取得 =", !!bytes, "長さ =", bytes?.length);
    
    if (!bytes || bytes.length === 0) {
      console.log("[PDF] extractAttachmentFromFileSpec: bytes取得失敗");
      return null;
    }
    
    console.log("[PDF] extractAttachmentFromFileSpec: 成功");
    return { name: fileName, bytes };
  };

  const attachments = [];
  
  // 方法1: Names配列を使用した標準的な方法
  console.log("[PDF] 方法1: Names配列から検索開始");
  try {
    if (typeof catalog.lookup === "function") {
      const names = catalog.lookup(PDFName.of("Names"), PDFDict);
      console.log("[PDF] Names取得:", !!names);
      
      const embeddedFiles = names ? names.lookup(PDFName.of("EmbeddedFiles"), PDFDict) : null;
      console.log("[PDF] EmbeddedFiles取得:", !!embeddedFiles);
      
      const nameArray = embeddedFiles ? embeddedFiles.lookup(PDFName.of("Names"), PDFArray) : null;
      console.log("[PDF] Names配列取得:", !!nameArray, nameArray ? nameArray.size?.() : "N/A");
      
      if (nameArray && typeof nameArray.size === "function") {
        const size = nameArray.size();
        console.log("[PDF] Names配列サイズ:", size);
        
        for (let i = 0; i < size; i += 2) {
          try {
            const nameObj = nameArray.lookup(i);
            const fileSpec = nameArray.lookup(i + 1, PDFDict) || nameArray.lookup(i + 1);
            console.log(`[PDF] 要素[${i}]:`, decodePdfString(nameObj));
            
            const attachment = await extractAttachmentFromFileSpec(fileSpec, nameObj);
            if (attachment) {
              console.log("[PDF] 添付ファイル発見:", attachment.name, "サイズ:", attachment.bytes.length);
              attachments.push(attachment);
            }
          } catch (e) {
            console.log(`[PDF] 要素[${i}]処理失敗:`, e instanceof Error ? e.message : String(e));
          }
        }
      }
    }
  } catch (e) {
    console.log("[PDF] 方法1失敗:", e instanceof Error ? e.message : String(e));
  }
  
  console.log("[PDF] 方法1の結果: 添付ファイル数", attachments.length);

  // 方法2: 全オブジェクトをスキャン（より時間がかかるが確実）
  if (attachments.length === 0 && pdfDoc.context?.enumerateIndirectObjects) {
    console.log("[PDF] 方法2: 全オブジェクトスキャン開始");
    try {
      let scanCount = 0;
      let filespecCount = 0;
      for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
        scanCount += 1;
        if (!(obj instanceof PDFDict)) continue;
        
        const type = obj.get(PDFName.of("Type"));
        const typeStr = String(type || "");
        
        if (typeStr.indexOf("Filespec") !== -1 || typeStr.indexOf("EmbeddedFile") !== -1) {
          filespecCount += 1;
          console.log("[PDF] Filespec発見 (型:" + typeStr + ")");
          
          try {
            const attachment = await extractAttachmentFromFileSpec(obj);
            if (attachment) {
              console.log("[PDF] 添付ファイル抽出成功:", attachment.name);
              attachments.push(attachment);
            }
          } catch (e) {
            console.log("[PDF] 添付ファイル抽出失敗:", e instanceof Error ? e.message : String(e));
          }
        }
      }
      console.log("[PDF] 方法2: スキャン結果 - 総オブジェクト数:", scanCount, "- Filespec数:", filespecCount);
    } catch (e) {
      console.log("[PDF] 方法2スキャン失敗:", e instanceof Error ? e.message : String(e));
    }
  }

  // 方法3: より広い範囲でEFダイクショナリを持つオブジェクトを探す
  if (attachments.length === 0 && pdfDoc.context?.enumerateIndirectObjects) {
    console.log("[PDF] 方法3: EFダイクショナリから検索開始");
    try {
      let efCount = 0;
      for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
        if (!(obj instanceof PDFDict)) continue;
        
        const ef = obj.get(PDFName.of("EF"));
        if (!ef) continue;
        
        efCount += 1;
        console.log("[PDF] EF発見 (EFオブジェクト数:" + efCount + ")");
        
        try {
          const attachment = await extractAttachmentFromFileSpec(obj);
          if (attachment) {
            console.log("[PDF] 添付ファイル抽出成功:", attachment.name);
            attachments.push(attachment);
          }
        } catch (e) {
          console.log("[PDF] 添付ファイル抽出失敗:", e instanceof Error ? e.message : String(e));
        }
      }
      console.log("[PDF] 方法3: EF発見数:", efCount);
    } catch (e) {
      console.log("[PDF] 方法3失敗:", e instanceof Error ? e.message : String(e));
    }
  }

  // 方法4: PDFのストリームコンテンツから直接JSONを抽出
  if (attachments.length === 0) {
    console.log("[PDF] 方法4: PDFストリームから直接抽出開始");
    try {
      const pages = pdfDoc.getPages ? pdfDoc.getPages() : [];
      console.log("[PDF] ページ数:", pages.length);
      
      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const page = pages[pageIdx];
        if (!page || !page.getContents) continue;
        
        try {
          console.log(`[PDF] ページ${pageIdx}: コンテンツ取得中`);
          const contents = page.getContents();
          if (contents) {
            const contentBytes = normalizeToUint8Array(contents);
            if (contentBytes && contentBytes.length > 0) {
              console.log(`[PDF] ページ${pageIdx}: コンテンツサイズ ${contentBytes.length} バイト`);
              try {
                const text = new TextDecoder().decode(contentBytes);
                if (text.includes('"schemaVersion"') || text.includes('"score"')) {
                  console.log(`[PDF] ページ${pageIdx}: JSON形式テキスト発見`);
                  const jsonMatch = text.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
                  if (jsonMatch) {
                    console.log("[PDF] JSON抽出成功");
                    attachments.push({
                      name: "embedded.json",
                      bytes: normalizeToUint8Array(jsonMatch[0])
                    });
                    break;
                  }
                }
              } catch (e) {
                console.log(`[PDF] ページ${pageIdx}: テキスト処理失敗`, e instanceof Error ? e.message : String(e));
              }
            }
          }
        } catch (e) {
          console.log(`[PDF] ページ${pageIdx}: 処理エラー`, e instanceof Error ? e.message : String(e));
        }
      }
    } catch (e) {
      console.log("[PDF] 方法4失敗:", e instanceof Error ? e.message : String(e));
    }
  }

  console.log("[PDF] 全方法実施完了: 添付ファイル発見数", attachments.length);

  if (attachments.length === 0) {
    throw new Error(
      getLangMsg(
        "PDF内に添付ファイルが見つかりませんでした。複数の方法で検索を試みましたが、JSON形式のデータを取得できませんでした。",
        "No attachments were found in the PDF. Multiple search methods were tried, but JSON data could not be retrieved.",
      ),
    );
  }

  // JSONファイルを優先、なければ最初のファイル
  const jsonAttachment = attachments.find((item) => {
    const name = String(item.name || "").toLowerCase();
    return name.endsWith(".json") || name.includes("score") || name.includes("json");
  }) || attachments[0];

  if (!jsonAttachment) {
    throw new Error(
      getLangMsg(
        "添付ファイルが見つかりましたが、処理できません。",
        "An attachment was found but could not be processed.",
      ),
    );
  }

  console.log("[PDF] 処理対象の添付ファイル:", jsonAttachment.name, "サイズ:", jsonAttachment.bytes.length);

  try {
    const text = new TextDecoder().decode(jsonAttachment.bytes);
    console.log("[PDF] デコード成功 テキスト長:", text.length);
    console.log("[PDF] JSON解析中...");
    const parsed = JSON.parse(text);
    console.log("[PDF] JSON解析成功");
    return parsed;
  } catch (error) {
    console.error("[PDF] JSON解析失敗:", error);
    console.log("[PDF] テキスト先頭 500 文字:", (new TextDecoder().decode(jsonAttachment.bytes)).substring(0, 500));
    throw new Error(
      getLangMsg(
        `JSON解析エラー: ${error instanceof Error ? error.message : String(error)}`,
        `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
};

/**
 * JSONまたはPDF内添付JSONを読み込む。
 */
export const readScoreFileAsJson = async (file) => {
  //##Spec
  // PDF: 添付JSONを抽出して解析する。
  // JSON: そのまま読み込む。
  // 判定は拡張子(.pdf)とMIME(application/pdf)の両方を見る。
  const name = typeof file?.name === "string" ? file.name.toLowerCase() : "";
  const isPdf = file?.type === "application/pdf" || name.endsWith(".pdf");
  if (isPdf) {
    return readPdfAttachmentJson(file);
  }
  return readJsonFileAsObject(file);
};
