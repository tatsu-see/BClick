
import { ConfigStore } from "../utils/store.js";
import RhythmTokenBuilder from "../utils/RhythmTokenBuilder.js";
import ScoreData from "../models/ScoreModel.js";
import RhythmPreviewRenderer from "../components/RhythmPreviewRenderer.js";
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";
import { cMajorDiatonicPool } from "../../lib/guiterCode.js";
import { getLangMsg } from "../../lib/Language.js";
import { APP_LIMITS } from "../constants/appConstraints.js";
import { loadEditScoreDraft, saveEditScoreDraft } from "../utils/editScoreDraft.js";
import { buildCenteredSelectWrap, syncCenteredSelectLabel } from "../utils/centeredSelect.js";

document.addEventListener("DOMContentLoaded", () => {
  const MAX_MEASURES = APP_LIMITS.scoreMeasures.max;
  if (!ensureInAppNavigation()) return;

  const doneButton = document.getElementById("closePage");
  const backButton = document.getElementById("backEditMeasure");
  const chordRootButtons = Array.from(document.querySelectorAll(".chordRoot"));
  const chordSlashToggle = document.querySelector(".chordSlashToggle");
  const chordQualityButtons = Array.from(document.querySelectorAll(".chordQuality"));
  const rhythmPatternBody = document.getElementById("rhythmPatternBody");
  const codeProgressionInput = document.getElementById("codeProgression");
  const backProgressionButton = document.getElementById("backCodeProgression");
  const clearProgressionButton = document.getElementById("clearCodeProgression");
  const addRandom3ChordsButton = document.getElementById("addRandom3Chords");
  const addRandom4ChordsButton = document.getElementById("addRandom4Chords");
  const majorChordSection = document.getElementById("majorChordSection");
  const minorChordSection = document.getElementById("minorChordSection");
  const toggleMajorChords = document.getElementById("toggleMajorChords");
  const toggleMinorChords = document.getElementById("toggleMinorChords");
  const measuresInput = document.getElementById("measures");
  const measuresDownButton = document.getElementById("measuresDown");
  const measuresUpButton = document.getElementById("measuresUp");
  const store = new ConfigStore();

  const params = new URLSearchParams(window.location.search);
  const barParam = Number.parseInt(params.get("bar"), 10);
  const barIndex = Number.isNaN(barParam) ? 0 : Math.max(0, barParam);

  const savedTimeSignature = store.getScoreTimeSignature();
  const savedMeasures = store.getScoreMeasures();
  const savedProgression = store.getScoreProgression();
  const savedRhythmPattern = store.getScoreRhythmPattern();
  const savedBars = store.getScoreBars();
  const draft = loadEditScoreDraft();
  const scoreData = new ScoreData({
    timeSignature: typeof draft?.timeSignature === "string" ? draft.timeSignature : (savedTimeSignature || "4/4"),
    measures: typeof draft?.measures === "number" ? draft.measures : (savedMeasures || 8),
    progression: typeof draft?.progression === "string" ? draft.progression : (savedProgression || ""),
    rhythmPattern: Array.isArray(draft?.rhythmPattern) ? draft.rhythmPattern : (savedRhythmPattern || null),
    bars: Array.isArray(draft?.bars) ? draft.bars : (savedBars || null),
  });

  if (codeProgressionInput && typeof scoreData.progression === "string") {
    codeProgressionInput.value = scoreData.progression;
  }

  const bars = scoreData.bars;
  const safeBarIndex = Math.min(barIndex, Math.max(0, bars.length - 1));
  const currentBarChords = bars[safeBarIndex]?.chord;
  const currentRhythm = Array.isArray(bars[safeBarIndex]?.rhythm)
    ? bars[safeBarIndex].rhythm
    : [];
  let selectedBeatChords = [];
  let selectedBeatPatterns = [];
  // 拍内の最大分割数（16分まで）
  const MAX_SUBDIV = APP_LIMITS.beatSubdivMax;

  const [numeratorRaw] = scoreData.timeSignature.split("/");
  const numerator = Number.parseInt(numeratorRaw, 10);
  const beatCount = Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;

  /**
   * 拍ごとのコード配列を正規化する。
   * @param {string[]|string} value
   * @returns {string[]}
   */
  /**
   * 空の拍内コード配列を生成する。
   * @returns {string[]}
   */
  const buildEmptyChordRow = () => Array.from({ length: MAX_SUBDIV }, () => "");

  /**
   * 拍内コード配列を正規化する。
   * @param {unknown} row
   * @returns {string[]}
   */
  const normalizeChordRow = (row) => {
    if (Array.isArray(row)) {
      const normalized = row.map((item) => (typeof item === "string" ? item : ""));
      while (normalized.length < MAX_SUBDIV) {
        normalized.push("");
      }
      return normalized.slice(0, MAX_SUBDIV);
    }
    if (typeof row === "string" && row.length > 0) {
      return [row, ...Array.from({ length: MAX_SUBDIV - 1 }, () => "")];
    }
    return buildEmptyChordRow();
  };

  /**
   * 拍ごとのコード配列を正規化する。
   * @param {string[][]|string[]|string} value
   * @returns {string[][]}
   */
  const normalizeBeatChords = (value) => {
    const normalized = [];
    if (Array.isArray(value)) {
      const isMatrix = value.some((item) => Array.isArray(item));
      if (isMatrix) {
        value.forEach((row) => normalized.push(normalizeChordRow(row)));
      } else {
        value.forEach((item) => normalized.push(normalizeChordRow(item)));
      }
    } else if (typeof value === "string" && value.length > 0) {
      normalized.push(normalizeChordRow(value));
    }
    while (normalized.length < beatCount) {
      normalized.push(buildEmptyChordRow());
    }
    return normalized.slice(0, beatCount);
  };

  // 拍ごとのコード配列をロード（拍内4分割の配列へ正規化）
  selectedBeatChords = normalizeBeatChords(currentBarChords);

  /**
   * 音価トークンから分割値を取得する。
   * @param {string} value
   * @returns {number}
   */
  const getDivisionFromToken = (value) => {
    if (typeof value !== "string") return 4;
    if (value.endsWith("16")) return 16;
    if (value.endsWith("8")) return 8;
    if (value.endsWith("4")) return 4;
    if (value.endsWith("2")) return 2;
    if (value.endsWith("1")) return 1;
    return 4;
  };

  /**
   * 分割値から必要な拍数を取得する。
   * @param {number} division
   * @returns {number}
   */
  const getBeatSpanFromDivision = (division) => {
    if (division === 1) return 4;
    if (division === 2) return 2;
    return 1;
  };

  /**
   * 分割値からパターン長を取得する。
   * @param {number} division
   * @returns {number}
   */
  const getPatternLengthFromDivision = (division) => {
    if (division === 16) return 4;
    if (division === 8) return 2;
    return 1;
  };

  /**
   * 拍子に応じた分割候補を取得する。
   * @returns {number[]}
   */
  const getAllowedDivisions = () => {
    const signature = scoreData.timeSignature || "4/4";
    const disallowWhole = signature.startsWith("2/4") || signature.startsWith("3/4");
    return disallowWhole ? [2, 4, 8, 16] : [1, 2, 4, 8, 16];
  };

  /**
   * 拍子と拍位置に応じた分割候補を取得する。
   */
  const getAllowedDivisionsForBeat = (beatIndex) => {
    const base = getAllowedDivisions();
    const remain = Math.max(0, beatCount - beatIndex);
    return base.filter((division) => {
      if (division === 1) return remain >= 4;
      if (division === 2) return remain >= 2;
      return true;
    });
  };

  const setActiveQuality = (button) => {
    chordQualityButtons.forEach((qualityButton) => {
      const isActive = qualityButton === button;
      qualityButton.classList.toggle("isActive", isActive);
      qualityButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const getActiveQuality = () =>
    chordQualityButtons.find((button) => button.classList.contains("isActive"));

  const setActiveRoot = (button) => {
    chordRootButtons.forEach((rootButton) => {
      const isActive = rootButton === button;
      rootButton.classList.toggle("isActive", isActive);
      rootButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const getActiveRoot = () => chordRootButtons.find((button) => button.classList.contains("isActive"));

  const buildChord = (rootButton, qualityButton) => {
    const root = rootButton?.dataset.root || rootButton?.textContent.trim() || "";
    const quality = qualityButton?.dataset.quality || "maj";
    const suffix = quality === "min" ? "m" : quality === "dim" ? "dim" : "";
    return `${root}${suffix}`;
  };

  /**
   * 進行入力からコード一覧を取得する。
   * @returns {string[]}
   */
  const getProgressionOptions = () => {
    if (!codeProgressionInput) return [];
    const raw = codeProgressionInput.value.trim();
    if (!raw) return [];
    const options = [];
    const seen = new Set();
    raw.split(/\s+/).forEach((value) => {
      if (!value || seen.has(value)) return;
      seen.add(value);
      options.push(value);
    });
    // コード選択肢は辞書順で並べる
    return options.sort((a, b) => a.localeCompare(b));
  };

  const applyChordOptions = (selectEl, value, options) => {
    selectEl.textContent = "";
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = getLangMsg("なし", "None");
    selectEl.appendChild(emptyOption);
    options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      selectEl.appendChild(option);
    });
    const nextValue = options.includes(value) ? value : "";
    selectEl.value = nextValue;
    return nextValue;
  };

  /**
   * 進行入力に合わせてコード選択肢を再構築する。
   */
  const refreshChordSelectOptions = () => {
    const options = getProgressionOptions();
    const selects = Array.from(document.querySelectorAll(".rhythmChordSelect"));
    selects.forEach((selectEl) => {
      const beatIndex = Number.parseInt(selectEl.dataset.beatIndex, 10);
      const subIndex = Number.parseInt(selectEl.dataset.subIndex, 10);
      const index = Number.isNaN(beatIndex) ? 0 : beatIndex;
      const sub = Number.isNaN(subIndex) ? 0 : subIndex;
      const currentValue = selectedBeatChords[index]?.[sub] || "";
      const nextValue = applyChordOptions(selectEl, currentValue, options);
      if (selectedBeatChords[index]) {
        selectedBeatChords[index][sub] = nextValue;
      }
      syncCenteredSelectLabel(selectEl);
    });
  };

  const appendChord = (chord) => {
    if (!codeProgressionInput) return;
    const trimmedChord = chord.trim();
    if (!trimmedChord) return;
    const prefix = codeProgressionInput.value.length > 0 ? " " : "";
    codeProgressionInput.value += `${prefix}${trimmedChord}`;
    refreshChordSelectOptions();
  };

  /**
   * コード進行の最後のアルファベットの直後に "/" を挿入する。
   */
  const appendSlashToProgression = () => {
    if (!codeProgressionInput) return;
    const rawValue = codeProgressionInput.value || "";
    const trimmed = rawValue.replace(/\s+$/g, "");
    if (!trimmed) {
      codeProgressionInput.value = "/";
      return;
    }
    if (trimmed.endsWith("/")) {
      codeProgressionInput.value = trimmed;
      return;
    }
    const lastLetterMatch = /[A-Za-z](?!.*[A-Za-z])/.exec(trimmed);
    if (!lastLetterMatch || lastLetterMatch.index == null) {
      codeProgressionInput.value = `${trimmed}/`;
      return;
    }
    const insertIndex = lastLetterMatch.index + 1;
    codeProgressionInput.value =
      `${trimmed.slice(0, insertIndex)}/${trimmed.slice(insertIndex)}`;
  };

  /**
   * "/" トグルの選択状態を切り替える。
   */
  const setSlashActive = (isActive) => {
    if (!chordSlashToggle) return;
    chordSlashToggle.classList.toggle("isActive", isActive);
    chordSlashToggle.setAttribute("aria-pressed", isActive ? "true" : "false");
  };

  /**
   * "/" トグルがONかどうかを返す。
   */
  const isSlashActive = () => Boolean(chordSlashToggle?.classList.contains("isActive"));

  /**
   * ランダムにコードを指定数追加する。
   */
  const appendRandomChords = (count) => {
    if (!codeProgressionInput) return;
    const pool = Array.isArray(cMajorDiatonicPool) ? cMajorDiatonicPool : [];
    if (pool.length === 0) return;
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(count, shuffled.length));
    picks.forEach((chord) => appendChord(chord));
  };

  /**
   * コード進行入力を仕様に沿って正規化する。
   * NGなトークンは除外し、正しいものだけを半角スペース区切りで返す。
   * @param {string} raw
   * @returns {string}
   */
  const normalizeProgressionInput = (raw) => {
    if (typeof raw !== "string") return "";
    const chordRegex = /^([A-Ga-g])([#b]?)([a-z0-9]*)(?:\/([A-Ga-g])([#b]?))?$/;
    return raw
      .trim()
      .split(/\s+/)
      .map((token) => {
        if (token.length === 0) return "";
        const match = chordRegex.exec(token);
        if (!match) return "";
        const root = match[1].toUpperCase();
        const accidental = match[2] || "";
        const suffix = match[3] || "";
        if (!match[4]) {
          return `${root}${accidental}${suffix}`;
        }
        const bassRoot = match[4].toUpperCase();
        const bassAccidental = match[5] || "";
        return `${root}${accidental}${suffix}/${bassRoot}${bassAccidental}`;
      })
      .filter((token) => token.length > 0)
      .join(" ");
  };

  const initialChord =
    selectedBeatChords.flat().find((value) => typeof value === "string" && value.length > 0)
    || "";

  if (chordQualityButtons.length > 0) {
    const matchedQuality = initialChord.endsWith("dim")
      ? chordQualityButtons.find((button) => button.dataset.quality === "dim")
      : initialChord.endsWith("m")
        ? chordQualityButtons.find((button) => button.dataset.quality === "min")
        : chordQualityButtons.find((button) => button.dataset.quality === "maj");
    const activeQuality = matchedQuality || chordQualityButtons[0];
    if (activeQuality) {
      setActiveQuality(activeQuality);
    }
  }

  if (chordRootButtons.length > 0) {
    const normalizedRoot = initialChord.endsWith("dim")
      ? initialChord.slice(0, -3)
      : initialChord.endsWith("m")
        ? initialChord.slice(0, -1)
        : initialChord;
    const matchedRoot = chordRootButtons.find(
      (button) => (button.dataset.root || button.textContent.trim()) === normalizedRoot,
    );
    const activeRoot = matchedRoot || chordRootButtons[0];
    if (activeRoot) {
      setActiveRoot(activeRoot);
    }
  }

  chordRootButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRoot(button);
      if (isSlashActive()) {
        const root = button.dataset.root || button.textContent.trim() || "";
        if (!codeProgressionInput) return;
        if (!codeProgressionInput.value.trim().endsWith("/")) {
          appendSlashToProgression();
        }
        codeProgressionInput.value += root;
        setSlashActive(false);
        refreshChordSelectOptions();
        return;
      }
      const qualityButton = getActiveQuality() || chordQualityButtons[0];
      if (!qualityButton) return;
      const chord = buildChord(button, qualityButton);
      appendChord(chord);
    });
  });

  chordQualityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveQuality(button);
    });
  });

  if (chordSlashToggle) {
    chordSlashToggle.addEventListener("click", () => {
      const willBeActive = !isSlashActive();
      setSlashActive(willBeActive);
      if (willBeActive) {
        appendSlashToProgression();
      }
    });
  }

  const updateChordSections = () => {
    if (!toggleMajorChords || !toggleMinorChords) return;
    if (!toggleMajorChords.checked && !toggleMinorChords.checked) {
      toggleMajorChords.checked = true;
    }
    if (majorChordSection) {
      majorChordSection.classList.toggle("isHidden", !toggleMajorChords.checked);
    }
    if (minorChordSection) {
      minorChordSection.classList.toggle("isHidden", !toggleMinorChords.checked);
    }
  };

  if (toggleMajorChords) {
    toggleMajorChords.addEventListener("change", updateChordSections);
  }

  if (toggleMinorChords) {
    toggleMinorChords.addEventListener("change", updateChordSections);
  }

  updateChordSections();

  /**
   * リズム配列をUI用のパターンに変換する。
   * @param {string[]} rhythm
   * @returns {{division: number, pattern: string[]}[]}
   */
  const buildBeatPatternsFromRhythm = (rhythm) => {
    const defaultItem = { division: 4, pattern: ["note"] };
    const tokens = Array.isArray(rhythm)
      ? rhythm.filter((value) => typeof value === "string" && value.length > 0)
      : [];
    const patterns = Array.from({ length: beatCount }, () => ({ ...defaultItem }));
    let beatIndex = 0;
    let tokenIndex = 0;
    while (beatIndex < beatCount) {
      const token = tokens[tokenIndex];
      if (!token) {
        patterns[beatIndex] = { ...defaultItem };
        beatIndex += 1;
        continue;
      }
      const division = getDivisionFromToken(token);
      const patternLength = getPatternLengthFromDivision(division);
      const patternTokens = tokens.slice(tokenIndex, tokenIndex + patternLength);
      const pattern = [];
      for (let i = 0; i < patternLength; i += 1) {
        const raw = patternTokens[i];
        if (typeof raw !== "string") {
          pattern.push("note");
          continue;
        }
        if (raw.startsWith("r")) {
          pattern.push("rest");
          continue;
        }
        if (raw.startsWith("t")) {
          pattern.push(i === 0 ? "tieNote" : "tie");
          continue;
        }
        pattern.push("note");
      }
      patterns[beatIndex] = { division, pattern };
      const span = getBeatSpanFromDivision(division);
      beatIndex += span;
      tokenIndex += patternLength;
    }
    return patterns;
  };

  /**
   * 分割設定から拍のカバー状態を計算する。
   */
  const buildCoveredBeats = (patterns) => {
    const covered = Array.from({ length: beatCount }, () => false);
    let beatIndex = 0;
    while (beatIndex < beatCount) {
      if (covered[beatIndex]) {
        beatIndex += 1;
        continue;
      }
      const division = patterns[beatIndex]?.division || 4;
      const span = getBeatSpanFromDivision(division);
      for (let i = 1; i < span && beatIndex + i < beatCount; i += 1) {
        covered[beatIndex + i] = true;
      }
      beatIndex += span;
    }
    return covered;
  };

  /**
   * UI用パターンから小節リズム配列を生成する。
   */
  const buildRhythmFromBeatPatterns = (patterns) => {
    const covered = buildCoveredBeats(patterns);
    const rhythm = [];
    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
      if (covered[beatIndex]) continue;
      const patternItem = patterns[beatIndex] || { division: 4, pattern: ["note"] };
      const division = patternItem.division;
      const pattern = Array.isArray(patternItem.pattern) ? patternItem.pattern : ["note"];
      if (division === 1) {
        if (pattern[0] === "rest") {
          rhythm.push("r1");
        } else if (pattern[0] === "tieNote") {
          rhythm.push("t1");
        } else {
          rhythm.push("1");
        }
        continue;
      }
      if (division === 2) {
        if (pattern[0] === "rest") {
          rhythm.push("r2");
        } else if (pattern[0] === "tieNote") {
          rhythm.push("t2");
        } else {
          rhythm.push("2");
        }
        continue;
      }
      if (division === 4) {
        if (pattern[0] === "rest") {
          rhythm.push("r4");
        } else if (pattern[0] === "tieNote") {
          rhythm.push("t4");
        } else {
          rhythm.push("4");
        }
        continue;
      }
      if (division === 8) {
        pattern.slice(0, 2).forEach((value, index) => {
          if (value === "rest") {
            rhythm.push("r8");
          } else if (index === 0 && value === "tieNote") {
            rhythm.push("t8");
          } else if (value === "tie") {
            rhythm.push("t8");
          } else {
            rhythm.push("8");
          }
        });
        continue;
      }
      // 16分音符
      let lastType = null;
      pattern.slice(0, 4).forEach((value, index) => {
        if (value === "tie") {
          if (lastType === "rest") {
            rhythm.push("r16");
            lastType = "rest";
            return;
          }
          rhythm.push("t16");
          lastType = "tie";
          return;
        }
        if (index === 0 && value === "tieNote") {
          rhythm.push("t16");
          lastType = "tie";
          return;
        }
        if (value === "rest") {
          rhythm.push("r16");
          lastType = "rest";
          return;
        }
        rhythm.push("16");
        lastType = "note";
      });
    }
    return rhythm;
  };

  /**
   * 拍ごとのパターン数を揃える。
   */
  const normalizeBeatPatternList = (patterns, count) => {
    const base = Array.isArray(patterns) ? patterns : [];
    return Array.from({ length: count }, (_, index) => {
      const item = base[index];
      if (!item || typeof item !== "object") {
        return { division: 4, pattern: ["note"] };
      }
      const divisionRaw = Number.parseInt(item.division, 10);
      const division = [1, 2, 4, 8, 16].includes(divisionRaw) ? divisionRaw : 4;
      const patternLength = getPatternLengthFromDivision(division);
      const rawPattern = Array.isArray(item.pattern) ? item.pattern : [];
      const normalized = rawPattern
        .map((value) =>
          value === "rest" || value === "tie" || value === "tieNote" ? value : "note",
        )
        .slice(0, patternLength);
      while (normalized.length < patternLength) {
        normalized.push("note");
      }
      if (division === 8) {
        return {
          division,
          pattern: normalized.map((value, index) => {
            if (value === "rest") return "rest";
            if (value === "tieNote" && index === 0) return "tieNote";
            if (value === "tie" && index > 0) return "tie";
            return "note";
          }),
        };
      }
      if (division !== 16) {
        return {
          division,
          pattern: normalized.map((value, index) => {
            if (value === "rest") return "rest";
            if (value === "tieNote" && index === 0) return "tieNote";
            return "note";
          }),
        };
      }
      if (normalized[0] === "tie") {
        normalized[0] = "note";
      }
      return { division, pattern: normalized };
    });
  };

  /**
   * リズムパターンからABCJS用のトークンを生成する。
   * @param {{division: number, pattern: string[]}} patternItem
   * @returns {{type: string, length: number}[]}
   */
  const tokenBuilder = new RhythmTokenBuilder();
  const buildAbcTokens = (patternItem) => tokenBuilder.buildAbcTokens(patternItem);

  /**
   * リズム/コードのUIを描画する。
   */
  const renderBeatSelectors = () => {
    if (!rhythmPatternBody) return;
    rhythmPatternBody.textContent = "";
    if (selectedBeatPatterns.length === 0) {
      selectedBeatPatterns = buildBeatPatternsFromRhythm(currentRhythm);
    }
    selectedBeatPatterns = normalizeBeatPatternList(selectedBeatPatterns, beatCount);
    const coveredBeats = buildCoveredBeats(selectedBeatPatterns);
    selectedBeatPatterns.forEach((patternItem, index) => {
      const row = document.createElement("div");
      row.className = "rhythmPatternRow";
      row.setAttribute("role", "row");

      const divisionCell = document.createElement("div");
      divisionCell.className = "rhythmPatternCell rhythmPatternDivision";
      if (coveredBeats[index]) {
        row.classList.add("isCovered");
        divisionCell.textContent = "—";
      } else {
        const divisionSelect = document.createElement("select");
        divisionSelect.className = "rhythmDivisionSelect";
        const allowedDivisions = getAllowedDivisionsForBeat(index);
        if (!allowedDivisions.includes(patternItem.division)) {
          patternItem.division = allowedDivisions[0] || 4;
        }
        allowedDivisions.forEach((value) => {
          const option = document.createElement("option");
          option.value = value.toString();
          option.textContent = value.toString();
          option.selected = patternItem.division === value;
          divisionSelect.appendChild(option);
        });
        divisionSelect.addEventListener("change", () => {
          const parsed = Number.parseInt(divisionSelect.value, 10);
          patternItem.division = allowedDivisions.includes(parsed)
            ? parsed
            : allowedDivisions[0] || 4;
          renderBeatSelectors();
        });
        // iOS向けの中央寄せ表示にするため、表示ラベルを重ねる。
        divisionCell.appendChild(buildCenteredSelectWrap(divisionSelect));
      }

      const patternCell = document.createElement("div");
      patternCell.className = "rhythmPatternCell rhythmPatternSymbols";
      const patternStack = document.createElement("div");
      patternStack.className = "rhythmPatternStack";
      const symbolRow = document.createElement("div");
      symbolRow.className = "rhythmPatternSymbolRow";
      const chordRow = document.createElement("div");
      chordRow.className = "rhythmPatternChordRow";
      patternStack.appendChild(symbolRow);
      patternStack.appendChild(chordRow);
      patternCell.appendChild(patternStack);

      const previewCell = document.createElement("div");
      previewCell.className = "rhythmPatternCell rhythmPatternPreview";
      const preview = document.createElement("div");
      preview.className = "rhythmPreview";
      previewCell.appendChild(preview);
      const previewRenderer = new RhythmPreviewRenderer(
        preview,
        () => scoreData.timeSignature,
        buildAbcTokens,
      );

      /**
       * 拍内コード選択セレクトを生成する。
       * @param {number} beatIndex
       * @param {number} subIndex
       * @param {string[]} options
       */
      const createChordSelect = (beatIndex, subIndex, options) => {
        const chordSelect = document.createElement("select");
        chordSelect.className = "rhythmChordSelect";
        chordSelect.dataset.beatIndex = beatIndex.toString();
        chordSelect.dataset.subIndex = subIndex.toString();
        const currentValue = selectedBeatChords[beatIndex]?.[subIndex] || "";
        const nextValue = applyChordOptions(chordSelect, currentValue, options);
        if (selectedBeatChords[beatIndex]) {
          selectedBeatChords[beatIndex][subIndex] = nextValue;
        }
        chordSelect.addEventListener("change", () => {
          if (selectedBeatChords[beatIndex]) {
            selectedBeatChords[beatIndex][subIndex] = chordSelect.value;
          }
        });
        const wrap = buildCenteredSelectWrap(chordSelect, { labelClass: "rhythmSelectLabelChord" });
        wrap.classList.add("rhythmChordWrap");
        return { select: chordSelect, wrap };
      };

      const rebuildPatternSelectors = () => {
        const patternLength = getPatternLengthFromDivision(patternItem.division);
        // パターン数に合わせてコード欄も同数表示する
        chordRow.textContent = "";
        chordRow.style.gridTemplateColumns = `repeat(${patternLength}, 1fr)`;

        if (coveredBeats[index]) {
          symbolRow.textContent = "";
          chordRow.textContent = "";
          previewRenderer.render({ division: 4, pattern: ["note"] });
          return;
        }
        symbolRow.textContent = "";
        while (patternItem.pattern.length < patternLength) {
          patternItem.pattern.push("note");
        }
        if (patternItem.pattern.length > patternLength) {
          patternItem.pattern = patternItem.pattern.slice(0, patternLength);
        }
        patternItem.pattern = patternItem.pattern.map((value, index) => {
          if (value === "rest" || value === "tie") return value;
          if (value === "tieNote" && index === 0) return value;
          return "note";
        });
        if (patternItem.division === 8) {
          patternItem.pattern = patternItem.pattern.map((value, index) => {
            if (value === "rest") return "rest";
            if (value === "tieNote" && index === 0) return "tieNote";
            if (value === "tie" && index > 0) return "tie";
            return "note";
          });
        } else if (patternItem.division !== 16) {
          patternItem.pattern = patternItem.pattern.map((value, index) => {
            if (value === "rest") return "rest";
            if (value === "tieNote" && index === 0) return "tieNote";
            return "note";
          });
        }
        if (patternItem.pattern[0] === "tie") {
          patternItem.pattern[0] = "note";
        }

        const chordOptions = getProgressionOptions();
        for (let subIndex = 0; subIndex < patternLength; subIndex += 1) {
          const value = patternItem.pattern[subIndex] || "note";
          const symbolSelect = document.createElement("select");
          symbolSelect.className = "rhythmSymbolSelect";
          const options = [
            { value: "note", label: "●" },
            { value: "rest", label: "○" },
          ];
          if (subIndex === 0) {
            options.push({ value: "tieNote", label: "⌒●" });
          }
            if ((patternItem.division === 16 || patternItem.division === 8) && subIndex > 0) {
              options.push({ value: "tie", label: "⌒" });
            }
          options.forEach((optionItem) => {
            const option = document.createElement("option");
            option.value = optionItem.value;
            option.textContent = optionItem.label;
            option.selected = value === optionItem.value;
            symbolSelect.appendChild(option);
          });
          symbolSelect.addEventListener("change", () => {
            patternItem.pattern[subIndex] = symbolSelect.value;
            if (patternItem.pattern[0] === "tie") {
              patternItem.pattern[0] = "note";
              symbolSelect.value = patternItem.pattern[subIndex];
            }
            rebuildPatternSelectors();
          });
          // iOS向けの中央寄せ表示にするため、表示ラベルを重ねる。
          symbolRow.appendChild(
            buildCenteredSelectWrap(symbolSelect, { labelClass: "rhythmSelectLabelSymbol" }),
          );

          const { select: chordSelect, wrap: chordWrap } = createChordSelect(
            index,
            subIndex,
            chordOptions,
          );
          const isChordSelectable = value === "note" || value === "tieNote";
          if (!isChordSelectable) {
            chordSelect.disabled = true;
            chordWrap.classList.add("isDisabled");
            if (selectedBeatChords[index]) {
              selectedBeatChords[index][subIndex] = "";
            }
            chordSelect.value = "";
            syncCenteredSelectLabel(chordSelect);
          }
          chordRow.appendChild(chordWrap);
        }

        previewRenderer.render(patternItem);
      };

      rebuildPatternSelectors();

      row.appendChild(divisionCell);
      row.appendChild(patternCell);
      row.appendChild(previewCell);
      rhythmPatternBody.appendChild(row);
    });
  };

  renderBeatSelectors();

  if (clearProgressionButton) {
    clearProgressionButton.addEventListener("click", () => {
      if (!codeProgressionInput) return;
      codeProgressionInput.value = "";
      refreshChordSelectOptions();
    });
  }

  if (addRandom3ChordsButton) {
    addRandom3ChordsButton.addEventListener("click", () => {
      appendRandomChords(3);
    });
  }

  if (addRandom4ChordsButton) {
    addRandom4ChordsButton.addEventListener("click", () => {
      appendRandomChords(4);
    });
  }

  if (backProgressionButton) {
    backProgressionButton.addEventListener("click", () => {
      if (!codeProgressionInput) return;
      const parts = codeProgressionInput.value.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return;
      parts.pop();
      codeProgressionInput.value = parts.join(" ");
      refreshChordSelectOptions();
    });
  }

  if (codeProgressionInput) {
    codeProgressionInput.addEventListener("input", () => {
      refreshChordSelectOptions();
    });
  }

  const cloneBar = (bar) => ({
    chord: normalizeBeatChords(bar?.chord).map((row) => row.slice()),
    rhythm: Array.isArray(bar?.rhythm) && bar.rhythm.length > 0
      ? bar.rhythm.slice()
      : scoreData.buildDefaultRhythm(),
  });

  const getSelectedCopyValue = () => {
    if (!measuresInput) return "0";
    return measuresInput.value;
  };

  const bumpSelectValue = (selectEl, delta) => {
    if (!selectEl) return;
    const values = Array.from(selectEl.options)
      .map((option) => Number.parseInt(option.value, 10))
      .filter((value) => !Number.isNaN(value));
    const current = Number.parseInt(selectEl.value, 10);
    const currentValue = Number.isNaN(current) ? 0 : current;
    const currentIndex = values.indexOf(currentValue);
    if (currentIndex < 0) return;
    const nextIndex = Math.min(values.length - 1, Math.max(0, currentIndex + delta));
    if (nextIndex === currentIndex) return;
    selectEl.value = values[nextIndex].toString();
  };

  if (measuresDownButton) {
    measuresDownButton.addEventListener("click", () => bumpSelectValue(measuresInput, -1));
  }

  if (measuresUpButton) {
    measuresUpButton.addEventListener("click", () => bumpSelectValue(measuresInput, 1));
  }

  /**
   * editScoreへ戻るときに再描画が必要なことを通知する。
   */
  const markNeedsScoreRefresh = () => {
    sessionStorage.setItem("bclick.needsScoreRefresh", "1");
  };

  const goBack = () => {
    markNeedsScoreRefresh();
    goBackWithFallback();
  };

  if (doneButton) {
    doneButton.addEventListener("click", () => {
      const targetBar = bars[safeBarIndex];
      if (targetBar) {
        targetBar.chord = selectedBeatChords
          .slice(0, beatCount)
          .map((row) => row.slice());
      }
      if (targetBar) {
        const nextRhythm = buildRhythmFromBeatPatterns(selectedBeatPatterns);
        targetBar.rhythm = nextRhythm;
      }

        const copyValue = getSelectedCopyValue();
        if (copyValue === "del") {
        const shouldDelete = window.confirm(
          getLangMsg("この小節を削除しますか？", "Delete this bar?"),
        );
        if (!shouldDelete) return;
        if (bars.length > 1) {
          bars.splice(safeBarIndex, 1);
        } else if (targetBar) {
          targetBar.chord = normalizeBeatChords("");
          targetBar.rhythm = scoreData.buildDefaultRhythm();
        }
        if (draft && typeof draft === "object") {
          saveEditScoreDraft({
            ...draft,
            bars,
            measures: bars.length > 0 ? bars.length : 1,
          });
        } else {
          store.setScoreBars(bars);
        }
        goBack();
        return;
      }

      const copyCount = Number.parseInt(copyValue, 10);
      if (Number.isFinite(copyCount) && copyCount > 0 && targetBar) {
        if (bars.length + copyCount > MAX_MEASURES) {
          window.alert(
            getLangMsg(
              `小節数は最大${MAX_MEASURES}です。`,
              `Maximum number of bars is ${MAX_MEASURES}.`,
            ),
          );
          return;
        }
        const baseBar = cloneBar(targetBar);
        for (let i = 0; i < copyCount; i += 1) {
          bars.splice(safeBarIndex + 1 + i, 0, cloneBar(baseBar));
        }
      }

      if (draft && typeof draft === "object") {
        const normalized = codeProgressionInput
          ? normalizeProgressionInput(codeProgressionInput.value)
          : (typeof draft.progression === "string" ? draft.progression : "");
        if (codeProgressionInput) {
          codeProgressionInput.value = normalized;
        }
        saveEditScoreDraft({
          ...draft,
          bars,
          measures: bars.length > 0 ? bars.length : 1,
          progression: normalized,
        });
      } else {
        store.setScoreBars(bars);
        if (codeProgressionInput) {
          const normalized = normalizeProgressionInput(codeProgressionInput.value);
          codeProgressionInput.value = normalized;
          store.setScoreProgression(normalized);
        }
      }
      goBack();
    });
  }

  if (backButton) {
    backButton.addEventListener("click", () => {
      goBack();
    });
  }
});
