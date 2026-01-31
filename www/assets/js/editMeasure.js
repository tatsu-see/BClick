
import { ConfigStore } from "./store.js";
import ScoreData from "./ScoreData.js";
import RhythmPreviewRenderer from "./RhythmPreviewRenderer.js";
import { ensureInAppNavigation, goBackWithFallback } from "./navigationGuard.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const doneButton = document.getElementById("closePage");
  const backButton = document.getElementById("backEditMeasure");
  const chordRootButtons = Array.from(document.querySelectorAll(".chordRoot"));
  const chordQualityButtons = Array.from(document.querySelectorAll(".chordQuality"));
  const rhythmPatternBody = document.getElementById("rhythmPatternBody");
  const codeProgressionInput = document.getElementById("codeProgression");
  const backProgressionButton = document.getElementById("backCodeProgression");
  const clearProgressionButton = document.getElementById("clearCodeProgression");
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
  const savedBars = store.getScoreBars();
  const scoreData = new ScoreData({
    timeSignature: savedTimeSignature || "4/4",
    measures: savedMeasures || 8,
    progression: savedProgression || "",
    bars: savedBars || null,
  });

  if (codeProgressionInput && typeof savedProgression === "string") {
    codeProgressionInput.value = savedProgression;
  }

  const bars = scoreData.bars;
  const safeBarIndex = Math.min(barIndex, Math.max(0, bars.length - 1));
  const currentBarChords = bars[safeBarIndex]?.chord;
  const currentRhythm = Array.isArray(bars[safeBarIndex]?.rhythm)
    ? bars[safeBarIndex].rhythm
    : [];
  let selectedBeatChords = [];
  let selectedBeatPatterns = [];

  const [numeratorRaw] = scoreData.timeSignature.split("/");
  const numerator = Number.parseInt(numeratorRaw, 10);
  const beatCount = Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;

  /**
   * 拍ごとのコード配列を正規化する。
   * @param {string[]|string} value
   * @returns {string[]}
   */
  const normalizeBeatChords = (value) => {
    if (Array.isArray(value)) {
      const normalized = value.map((item) => (typeof item === "string" ? item : ""));
      while (normalized.length < beatCount) {
        normalized.push("");
      }
      return normalized.slice(0, beatCount);
    }
    if (typeof value === "string" && value.length > 0) {
      return Array.from({ length: beatCount }, (_, index) => (index === 0 ? value : ""));
    }
    return Array.from({ length: beatCount }, () => "");
  };

  selectedBeatChords = normalizeBeatChords(currentBarChords);

  /**
   * 音符トークンの長さを拍に換算する。
   * @param {string} value
   * @returns {number}
   */
  const getTokenLength = (value) => {
    if (value.endsWith("16")) return 0.25;
    if (value.endsWith("8")) return 0.5;
    if (value.endsWith("4")) return 1;
    return 0;
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
    return options;
  };

  const applyChordOptions = (selectEl, value, options) => {
    selectEl.textContent = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "なし";
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

  const refreshChordSelectOptions = () => {
    const options = getProgressionOptions();
    const selects = Array.from(document.querySelectorAll(".rhythmChordSelect"));
    selects.forEach((selectEl) => {
      const beatIndex = Number.parseInt(selectEl.dataset.beatIndex, 10);
      const index = Number.isNaN(beatIndex) ? 0 : beatIndex;
      const currentValue = selectedBeatChords[index] || "";
      const nextValue = applyChordOptions(selectEl, currentValue, options);
      selectedBeatChords[index] = nextValue;
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

  const initialChord = selectedBeatChords.find((value) => value) || "";

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
   * リズム配列を拍ごとの配列に分割する。
   * @param {string[]} rhythm
   * @returns {string[][]}
   */
  const splitRhythmByBeat = (rhythm) => {
    const beats = [];
    let index = 0;
    for (let beatIndex = 0; beatIndex < beatCount; beatIndex += 1) {
      let total = 0;
      const tokens = [];
      while (index < rhythm.length && total < 1) {
        const token = rhythm[index];
        const length = getTokenLength(token);
        if (length > 0) {
          tokens.push(token);
          total += length;
        }
        index += 1;
      }
      beats.push(tokens.length > 0 ? tokens : ["4"]);
    }
    return beats;
  };

  /**
   * リズム配列をUI用のパターンに変換する。
   * @param {string[]} rhythm
   * @returns {{division: number, pattern: string[]}[]}
   */
  const buildBeatPatternsFromRhythm = (rhythm) => {
    const beats = splitRhythmByBeat(rhythm);
    return beats.map((tokens) => {
      const has16 = tokens.some((token) => token.endsWith("16"));
      const has8 = tokens.some((token) => token.endsWith("8"));
      const division = has16 ? 16 : has8 ? 8 : 4;
      const patternLength = division === 4 ? 1 : division === 8 ? 2 : 4;
      const pattern = [];

      for (let i = 0; i < patternLength; i += 1) {
        const token = tokens[i];
        if (!token) {
          pattern.push("note");
          continue;
        }
        if (token.startsWith("r")) {
          pattern.push("rest");
          continue;
        }
        if (token.startsWith("t")) {
          pattern.push(i === 0 ? "tieNote" : "tie");
          continue;
        }
        pattern.push("note");
      }

      if (division !== 16) {
        return {
          division,
          pattern: pattern.map((value, index) => {
            if (value === "rest") return "rest";
            if (value === "tieNote" && index === 0) return "tieNote";
            return "note";
          }),
        };
      }

      if (pattern[0] === "tie") {
        pattern[0] = "note";
      }

      return { division, pattern };
    });
  };

  /**
   * リズムパターンからABCJS用のトークンを生成する。
   * @param {{division: number, pattern: string[]}} patternItem
   * @returns {{type: string, length: number}[]}
   */
  const buildAbcTokens = (patternItem) => {
    const division = patternItem.division;
    const pattern = Array.isArray(patternItem.pattern) ? patternItem.pattern : ["note"];
    const unit = division === 4 ? 4 : division === 8 ? 2 : 1;
    const tokens = [];
    pattern.forEach((value, index) => {
      if (value === "tie") {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "note") {
          lastToken.length += unit;
        } else {
          const restToken = lastToken && lastToken.type === "rest"
            ? lastToken
            : null;
          if (restToken) {
            restToken.length += unit;
          } else {
            tokens.push({ type: "rest", length: unit });
          }
        }
        return;
      }
      if (value === "tieNote" && index === 0) {
        tokens.push({ type: "note", length: unit });
        return;
      }
      const type = value === "rest" ? "rest" : "note";
      tokens.push({ type, length: unit });
    });
    return tokens;
  };

  const renderBeatSelectors = () => {
    if (!rhythmPatternBody) return;
    rhythmPatternBody.textContent = "";
    selectedBeatPatterns = buildBeatPatternsFromRhythm(currentRhythm);
    const chordOptions = getProgressionOptions();

    selectedBeatPatterns.forEach((patternItem, index) => {
      const row = document.createElement("div");
      row.className = "rhythmPatternRow";
      row.setAttribute("role", "row");

      const divisionCell = document.createElement("div");
      divisionCell.className = "rhythmPatternCell rhythmPatternDivision";
      const divisionSelect = document.createElement("select");
      divisionSelect.className = "rhythmDivisionSelect";
      [4, 8, 16].forEach((value) => {
        const option = document.createElement("option");
        option.value = value.toString();
        option.textContent = value.toString();
        option.selected = patternItem.division === value;
        divisionSelect.appendChild(option);
      });
      divisionCell.appendChild(divisionSelect);

      const patternCell = document.createElement("div");
      patternCell.className = "rhythmPatternCell rhythmPatternSymbols";

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

      const chordCell = document.createElement("div");
      chordCell.className = "rhythmPatternCell rhythmPatternChord";
      const chordSelect = document.createElement("select");
      chordSelect.className = "rhythmChordSelect";
      chordSelect.dataset.beatIndex = index.toString();
      const nextValue = applyChordOptions(
        chordSelect,
        selectedBeatChords[index] || "",
        chordOptions,
      );
      selectedBeatChords[index] = nextValue;
      chordSelect.addEventListener("change", () => {
        selectedBeatChords[index] = chordSelect.value;
      });
      chordCell.appendChild(chordSelect);

      const rebuildPatternSelectors = () => {
        patternCell.textContent = "";
        const patternLength = patternItem.division === 4 ? 1 : patternItem.division === 8 ? 2 : 4;
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
        if (patternItem.division !== 16) {
          patternItem.pattern = patternItem.pattern.map((value, index) => {
            if (value === "rest") return "rest";
            if (value === "tieNote" && index === 0) return "tieNote";
            return "note";
          });
        }
        if (patternItem.pattern[0] === "tie") {
          patternItem.pattern[0] = "note";
        }

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
          if (patternItem.division === 16 && subIndex > 0) {
            options.push({ value: "tie", label: "－" });
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
            previewRenderer.render(patternItem);
          });
          patternCell.appendChild(symbolSelect);
        }

        previewRenderer.render(patternItem);
      };

      divisionSelect.addEventListener("change", () => {
        const parsed = Number.parseInt(divisionSelect.value, 10);
        patternItem.division = [4, 8, 16].includes(parsed) ? parsed : 4;
        rebuildPatternSelectors();
      });

      rebuildPatternSelectors();

      row.appendChild(divisionCell);
      row.appendChild(patternCell);
      row.appendChild(previewCell);
      row.appendChild(chordCell);
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
    chord: Array.isArray(bar?.chord)
      ? bar.chord.slice()
      : normalizeBeatChords(bar?.chord),
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

  const goBack = () => {
    goBackWithFallback();
  };

  if (doneButton) {
    doneButton.addEventListener("click", () => {
      const targetBar = bars[safeBarIndex];
      if (targetBar) {
        targetBar.chord = selectedBeatChords.slice(0, beatCount);
      }
      if (targetBar) {
        const nextRhythm = [];
        selectedBeatPatterns.forEach((patternItem) => {
          nextRhythm.push(...scoreData.buildRhythmFromPattern(patternItem));
        });
        targetBar.rhythm = nextRhythm;
      }

      const copyValue = getSelectedCopyValue();
      if (copyValue === "del") {
        const shouldDelete = window.confirm("この小節を削除しますか？");
        if (!shouldDelete) return;
        if (bars.length > 1) {
          bars.splice(safeBarIndex, 1);
        } else if (targetBar) {
          targetBar.chord = normalizeBeatChords("");
          targetBar.rhythm = scoreData.buildDefaultRhythm();
        }
        store.setScoreBars(bars);
        store.setScoreMeasures(bars.length);
        goBack();
        return;
      }

      const copyCount = Number.parseInt(copyValue, 10);
      if (Number.isFinite(copyCount) && copyCount > 0 && targetBar) {
        const baseBar = cloneBar(targetBar);
        for (let i = 0; i < copyCount; i += 1) {
          bars.splice(safeBarIndex + 1 + i, 0, cloneBar(baseBar));
        }
      }

      store.setScoreBars(bars);
      store.setScoreMeasures(bars.length);
      goBack();
    });
  }

  if (backButton) {
    backButton.addEventListener("click", () => {
      goBack();
    });
  }
});

