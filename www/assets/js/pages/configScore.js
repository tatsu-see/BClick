import { ConfigStore } from "../utils/store.js";
import RhythmTokenBuilder from "../utils/RhythmTokenBuilder.js";
import RhythmPreviewRenderer from "../components/RhythmPreviewRenderer.js";
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";
import { cMajorDiatonicPool } from "../../lib/guiterCode.js";
import { getLangMsg } from "../../lib/Language.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const store = new ConfigStore();
  const saveButton = document.getElementById("saveConfigScore");

  const timeSignatureInputs = Array.from(
    document.querySelectorAll('input[name="timeSignature"]'),
  );
  const chordRootButtons = Array.from(
    document.querySelectorAll(".chordRoot"),
  );
  const chordSlashToggle = document.querySelector(".chordSlashToggle");
  const chordQualityButtons = Array.from(
    document.querySelectorAll(".chordQuality"),
  );
  const rhythmPatternBody = document.getElementById("rhythmPatternBody");
  const codeProgressionInput = document.getElementById("codeProgression");
  const closePageButton = document.getElementById("closePage");
  const backProgressionButton = document.getElementById("backCodeProgression");
  const clearProgressionButton = document.getElementById("clearCodeProgression");
  const addRandom3ChordsButton = document.getElementById("addRandom3Chords");
  const addRandom4ChordsButton = document.getElementById("addRandom4Chords");
  const measuresRange = document.getElementById("measuresRange");
  const measuresValue = document.getElementById("measuresValue");

  const savedTimeSignature = store.getScoreTimeSignature();
  if (savedTimeSignature) {
    timeSignatureInputs.forEach((input) => {
      input.checked = input.value === savedTimeSignature;
    });
  }

  const savedProgression = store.getScoreProgression();
  if (codeProgressionInput && typeof savedProgression === "string") {
    codeProgressionInput.value = savedProgression;
  }

  /**
   * 選択中の拍子を取得する。
   */
  const getSelectedTimeSignature = () =>
    timeSignatureInputs.find((input) => input.checked)?.value || "4/4";

  /**
   * 拍子から拍数を取得する。
   */
  const getBeatCount = () => {
    const selected = getSelectedTimeSignature();
    const [numeratorRaw] = selected.split("/");
    const numerator = Number.parseInt(numeratorRaw, 10);
    return Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
  };

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
   * 拍子と拍位置に応じた分割候補を取得する。
   */
  const getAllowedDivisionsForBeat = (beatIndex, beatCount) => {
    const base = getAllowedDivisions();
    const remain = Math.max(0, beatCount - beatIndex);
    return base.filter((division) => {
      if (division === 1) return remain >= 4;
      if (division === 2) return remain >= 2;
      return true;
    });
  };

  /**
   * 拍子に応じた分割候補を取得する。
   */
  const getAllowedDivisions = () => {
    const signature = getSelectedTimeSignature();
    const disallowWhole = signature.startsWith("2/4") || signature.startsWith("3/4");
    return disallowWhole ? [2, 4, 8, 16] : [1, 2, 4, 8, 16];
  };

  /**
   * 保存されたリズム設定をUI用に整形する。
   */
  const normalizeBeatPatternItems = (rhythmPattern, beatCount) => {
    const defaultItem = { division: 4, pattern: ["note"] };
    const tokens = Array.isArray(rhythmPattern)
      ? rhythmPattern.filter((value) => typeof value === "string" && value.length > 0)
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
   * 拍ごとのパターン数を揃える。
   */
  const normalizeBeatPatternList = (patterns, beatCount) => {
    const base = Array.isArray(patterns) ? patterns : [];
    return Array.from({ length: beatCount }, (_, index) => {
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
   * 分割設定から拍のカバー状態を計算する。
   */
  const buildCoveredBeats = (patterns, beatCount) => {
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
  const buildRhythmPatternFromBeatPatterns = (patterns, beatCount) => {
    const covered = buildCoveredBeats(patterns, beatCount);
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
   * リズムパターンからABCJS用のトークンを生成する。
   */
  /**
   * リズムパターンからABCJS用のトークンを生成する。
   */
  const tokenBuilder = new RhythmTokenBuilder();
  const buildAbcTokens = (patternItem) => tokenBuilder.buildAbcTokens(patternItem);

  const savedRhythmPattern = store.getScoreRhythmPattern();
  let selectedBeatPatterns = normalizeBeatPatternItems(savedRhythmPattern, getBeatCount());

  /**
   * コード進行欄へコードを追加する。
   */
  const appendChord = (chord) => {
    if (!codeProgressionInput) return;
    const trimmedChord = chord.trim();
    if (!trimmedChord) return;
    const prefix = codeProgressionInput.value.length > 0 ? " " : "";
    codeProgressionInput.value += `${prefix}${trimmedChord}`;
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
   * コード品質ボタンの選択状態を切り替える。
   */
  const setActiveQuality = (button) => {
    chordQualityButtons.forEach((qualityButton) => {
      const isActive = qualityButton === button;
      qualityButton.classList.toggle("isActive", isActive);
      qualityButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  /**
   * 選択中のコード品質ボタンを取得する。
   */
  const getActiveQuality = () =>
    chordQualityButtons.find((button) => button.classList.contains("isActive"));

  /**
   * ルートボタンの選択状態を切り替える。
   */
  const setActiveRoot = (button) => {
    chordRootButtons.forEach((rootButton) => {
      const isActive = rootButton === button;
      rootButton.classList.toggle("isActive", isActive);
      rootButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  /**
   * 選択中のルートボタンを取得する。
   */
  const getActiveRoot = () => chordRootButtons.find((button) => button.classList.contains("isActive"));

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

  if (chordQualityButtons.length > 0) {
    const activeQuality =
      getActiveQuality() || chordQualityButtons[0];
    setActiveQuality(activeQuality);
  }
  setSlashActive(false);

  /**
   * 選択中のルート/品質からコード文字列を生成する。
   */
  const buildChord = (rootButton, qualityButton) => {
    const root = rootButton.dataset.root || rootButton.textContent.trim();
    const quality = qualityButton?.dataset.quality || "maj";
    const suffix = quality === "min" ? "m" : quality === "dim" ? "dim" : "";
    return `${root}${suffix}`;
  };

  chordRootButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRoot(button);
      if (isSlashActive()) {
        const root = button.dataset.root || button.textContent.trim();
        if (!codeProgressionInput) return;
        if (!codeProgressionInput.value.trim().endsWith("/")) {
          appendSlashToProgression();
        }
        codeProgressionInput.value += root;
        setSlashActive(false);
        return;
      }
      const qualityButton = getActiveQuality() || chordQualityButtons[0];
      if (!qualityButton) return;
      appendChord(buildChord(button, qualityButton));
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

  /**
   * リズムパターンのUIを描画する。
   */
  const renderBeatSelectors = () => {
    if (!rhythmPatternBody) return;
    const beatCount = getBeatCount();
    selectedBeatPatterns = normalizeBeatPatternList(selectedBeatPatterns, beatCount);
    rhythmPatternBody.textContent = "";
    const coveredBeats = buildCoveredBeats(selectedBeatPatterns, beatCount);
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
        const allowedDivisions = getAllowedDivisionsForBeat(index, beatCount);
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
        divisionCell.appendChild(divisionSelect);
      }

      const patternCell = document.createElement("div");
      patternCell.className = "rhythmPatternCell rhythmPatternSymbols";

      const previewCell = document.createElement("div");
      previewCell.className = "rhythmPatternCell rhythmPatternPreview";
      const preview = document.createElement("div");
      preview.className = "rhythmPreview";
      previewCell.appendChild(preview);
      const previewRenderer = new RhythmPreviewRenderer(
        preview,
        getSelectedTimeSignature,
        buildAbcTokens,
      );

      const rebuildPatternSelectors = () => {
        if (coveredBeats[index]) {
          patternCell.textContent = "";
          previewRenderer.render({ division: 4, pattern: ["note"] });
          return;
        }
        patternCell.textContent = "";
        const patternLength = getPatternLengthFromDivision(patternItem.division);
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
            previewRenderer.render(patternItem);
          });
          patternCell.appendChild(symbolSelect);
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

  timeSignatureInputs.forEach((input) => {
    input.addEventListener("change", renderBeatSelectors);
  });

  renderBeatSelectors();

  if (clearProgressionButton) {
    clearProgressionButton.addEventListener("click", () => {
      if (!codeProgressionInput) return;
      codeProgressionInput.value = "";
    });
  }

  if (backProgressionButton) {
    backProgressionButton.addEventListener("click", () => {
      if (!codeProgressionInput) return;
      const parts = codeProgressionInput.value.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return;
      parts.pop();
      codeProgressionInput.value = parts.join(" ");
    });
  }

  /**
   * ランダムにコードを指定数追加する。
   */
  const appendRandomChords = (count) => {
    if (!codeProgressionInput) return;
    
    // キーCのダイアトニックコードからコードを決定する。
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

  const savedMeasures = store.getScoreMeasures();
  if (measuresRange) {
    if (savedMeasures !== null) {
      measuresRange.value = savedMeasures.toString();
    }
    if (measuresValue) {
      measuresValue.textContent = measuresRange.value;
    }
    measuresRange.addEventListener("input", () => {
      if (measuresValue) {
        measuresValue.textContent = measuresRange.value;
      }
    });
  }

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      goBackWithFallback();
    });
  }

  /**
   * 現在の設定を保存して戻る。
   */
  const saveAndGoBack = () => {
    // Doneボタンで、現在の設定を保存してトップへ戻る。
    try {
      const selectedTimeSignature = timeSignatureInputs.find((input) => input.checked)?.value;
      if (selectedTimeSignature) {
        store.setScoreTimeSignature(selectedTimeSignature);
      }
      if (selectedBeatPatterns.length > 0) {
        const beatCount = getBeatCount();
        const rhythmPattern = buildRhythmPatternFromBeatPatterns(selectedBeatPatterns, beatCount);
        store.setScoreRhythmPattern(rhythmPattern);
      }

      const progressionRaw = codeProgressionInput ? codeProgressionInput.value : "";
      const normalizedProgression = normalizeProgressionInput(progressionRaw);
      if (codeProgressionInput) {
        codeProgressionInput.value = normalizedProgression;
      }
      store.setScoreProgression(normalizedProgression);

      if (measuresRange) {
        const parsed = Number.parseInt(measuresRange.value, 10);
        if (!Number.isNaN(parsed)) {
          store.setScoreMeasures(parsed);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`configScore: OK保存中にエラーが発生しました。 ${message}`, error);
      window.alert(
        getLangMsg(
          `保存に失敗しました: ${message}`,
          `Failed to save: ${message}`,
        ),
      );
      return;
    }

    goBackWithFallback();
  };

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      saveAndGoBack();
    });
  }
});

