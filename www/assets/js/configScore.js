import { ConfigStore } from "./store.js";
import RhythmPreviewRenderer from "./RhythmPreviewRenderer.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const saveButton = document.getElementById("saveConfigScore");

  const timeSignatureInputs = Array.from(
    document.querySelectorAll('input[name="timeSignature"]'),
  );
  const chordRootButtons = Array.from(
    document.querySelectorAll(".chordRoot"),
  );
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
   * 保存されたリズム設定をUI用に整形する。
   */
  const normalizeBeatPatternItems = (rawPatterns, beatCount) => {
    const defaultItem = { division: 4, pattern: ["note"] };
    const source = Array.isArray(rawPatterns) ? rawPatterns : [];
    const mapLegacyPattern = (value) => {
      switch (value) {
        case "restQuarter":
          return { division: 4, pattern: ["rest"] };
        case "eighths":
          return { division: 8, pattern: ["note", "note"] };
        case "eighthRest":
          return { division: 8, pattern: ["note", "rest"] };
        case "restEighth":
          return { division: 8, pattern: ["rest", "note"] };
        case "quarter":
        default:
          return { division: 4, pattern: ["note"] };
      }
    };
    const normalizeItem = (item) => {
      if (typeof item === "string") {
        return mapLegacyPattern(item);
      }
      if (!item || typeof item !== "object") {
        return { ...defaultItem };
      }
      const divisionRaw = Number.parseInt(item.division, 10);
      const division = [4, 8, 16].includes(divisionRaw) ? divisionRaw : 4;
      const expectedLength = division === 4 ? 1 : division === 8 ? 2 : 4;
      const rawPattern = Array.isArray(item.pattern) ? item.pattern : [];
      const normalized = rawPattern
        .map((value) =>
          value === "rest" || value === "tie" || value === "tieNote" ? value : "note",
        )
        .slice(0, expectedLength);
      while (normalized.length < expectedLength) {
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
      return {
        division,
        pattern: normalized,
      };
    };
    return Array.from({ length: beatCount }, (_, index) => {
      const sourceItem = source[index];
      return normalizeItem(sourceItem || defaultItem);
    });
  };

  /**
   * リズムパターンからABCJS用のトークンを生成する。
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
          // 休符の後ろにタイが来た場合は休符が続く扱いにする。
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


  const savedBeatPatterns = store.getScoreBeatPatterns();
  let selectedBeatPatterns = normalizeBeatPatternItems(savedBeatPatterns, getBeatCount());

  const appendChord = (chord) => {
    if (!codeProgressionInput) return;
    const trimmedChord = chord.trim();
    if (!trimmedChord) return;
    const prefix = codeProgressionInput.value.length > 0 ? " " : "";
    codeProgressionInput.value += `${prefix}${trimmedChord}`;
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

  if (chordQualityButtons.length > 0) {
    const activeQuality =
      getActiveQuality() || chordQualityButtons[0];
    setActiveQuality(activeQuality);
  }

  const buildChord = (rootButton, qualityButton) => {
    const root = rootButton.dataset.root || rootButton.textContent.trim();
    const quality = qualityButton?.dataset.quality || "maj";
    const suffix = quality === "min" ? "m" : "";
    return `${root}${suffix}`;
  };

  chordRootButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRoot(button);
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

  /**
   * リズムパターンのUIを描画する。
   */
  const renderBeatSelectors = () => {
    if (!rhythmPatternBody) return;
    const beatCount = getBeatCount();
    selectedBeatPatterns = normalizeBeatPatternItems(selectedBeatPatterns, beatCount);
    rhythmPatternBody.textContent = "";

    selectedBeatPatterns.forEach((patternItem, index) => {
      const row = document.createElement("div");
      row.className = "rhythmPatternRow";
      row.setAttribute("role", "row");

      const indexCell = document.createElement("div");
      indexCell.className = "rhythmPatternCell rhythmPatternIndex";
      indexCell.textContent = `${index + 1}`;

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
        getSelectedTimeSignature,
        buildAbcTokens,
      );

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

      row.appendChild(indexCell);
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

  const appendRandomChords = (count) => {
    if (!codeProgressionInput) return;
    const roots = chordRootButtons
      .map((button) => (button.dataset.root || button.textContent || "").trim())
      .filter((root) => root.length > 0);
    const qualities = chordQualityButtons
      .map((button) => (button.dataset.quality || button.textContent || "").trim())
      .filter((quality) => quality.length > 0);
    const pool = roots.flatMap((root) =>
      qualities.map((quality) => {
        if (quality === "min") return `${root}m`;
        if (quality === "maj") return root;
        return `${root}${quality}`;
      }),
    );
    if (pool.length === 0) return;
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(count, shuffled.length));
    picks.forEach((chord) => appendChord(chord));
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

  const goBack = () => {
    window.close();
    if (!window.closed) {
      window.location.href = "/";
    }
  };

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      goBack();
    });
  }

  const saveAndGoBack = () => {
    // Doneボタンで、現在の設定を保存してトップへ戻る。
    try {
      const selectedTimeSignature = timeSignatureInputs.find((input) => input.checked)?.value;
      if (selectedTimeSignature) {
        store.setScoreTimeSignature(selectedTimeSignature);
      }
      if (selectedBeatPatterns.length > 0) {
        store.setScoreBeatPatterns(selectedBeatPatterns);
      }

      const progressionRaw = codeProgressionInput ? codeProgressionInput.value : "";
      const trimmedProgression = progressionRaw.trim();
      store.setScoreProgression(trimmedProgression);

      if (measuresRange) {
        const parsed = Number.parseInt(measuresRange.value, 10);
        if (!Number.isNaN(parsed)) {
          store.setScoreMeasures(parsed);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`configScore: OK保存中にエラーが発生しました。 ${message}`, error);
      window.alert(`保存に失敗しました: ${message}`);
      return;
    }

    goBack();
  };

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      saveAndGoBack();
    });
  }
});

