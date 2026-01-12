
import { ConfigStore } from "./store.js";
import ScoreData from "./ScoreData.js";

document.addEventListener("DOMContentLoaded", () => {
  const closePageButton = document.getElementById("closePage");
  const saveButton = document.getElementById("saveConfigScore");
  const chordButtons = Array.from(document.querySelectorAll(".chipButton"));
  const rhythmBeatList = document.getElementById("rhythmBeatList");
  const rhythmBeatTemplate = document.getElementById("rhythmBeatTemplate");
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
    measures: savedMeasures || 2,
    progression: savedProgression || "",
    bars: savedBars || null,
  });

  const bars = scoreData.bars;
  const safeBarIndex = Math.min(barIndex, Math.max(0, bars.length - 1));
  const currentChord = bars[safeBarIndex]?.chord || "";
  const currentRhythm = Array.isArray(bars[safeBarIndex]?.rhythm)
    ? bars[safeBarIndex].rhythm
    : [];
  let selectedChord = currentChord;
  let selectedBeatPatterns = [];

  const [numeratorRaw] = scoreData.timeSignature.split("/");
  const numerator = Number.parseInt(numeratorRaw, 10);
  const beatCount = Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;

  const beatPatternMap = {
    quarter: ["4"],
    restQuarter: ["r4"],
    eighths: ["8", "8"],
    eighthRest: ["8", "r8"],
    restEighth: ["r8", "8"],
  };

  const updateSelection = (value) => {
    selectedChord = value;
    chordButtons.forEach((button) => {
      button.classList.toggle(
        "isSelected",
        (button.dataset.chord || button.textContent.trim()) === selectedChord,
      );
    });
  };

  updateSelection(currentChord);

  chordButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const chord = button.dataset.chord || button.textContent.trim();
      if (!chord) return;
      updateSelection(chord);
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

  const getBeatPattern = (rhythm, offset) => {
    const first = rhythm[offset];
    if (!first) return "quarter";
    if (first === "4") return "quarter";
    if (first === "r4") return "restQuarter";
    const second = rhythm[offset + 1];
    if (first === "8" && second === "8") return "eighths";
    if (first === "8" && second === "r8") return "eighthRest";
    if (first === "r8" && second === "8") return "restEighth";
    return "quarter";
  };

  const buildBeatPatterns = () => {
    const patterns = [];
    let offset = 0;
    for (let i = 0; i < beatCount; i += 1) {
      const pattern = getBeatPattern(currentRhythm, offset);
      patterns.push(pattern);
      const patternDef = beatPatternMap[pattern];
      offset += patternDef ? patternDef.length : 1;
    }
    return patterns;
  };

  const renderBeatSelectors = () => {
    if (!rhythmBeatList || !rhythmBeatTemplate) return;
    rhythmBeatList.textContent = "";
    selectedBeatPatterns = buildBeatPatterns();
    for (let i = 0; i < beatCount; i += 1) {
      const fragment = rhythmBeatTemplate.content.cloneNode(true);
      const row = fragment.querySelector(".rhythmBeatRow");
      const label = fragment.querySelector(".rhythmBeatLabel");
      const select = fragment.querySelector(".rhythmBeatSelect");
      if (!row || !label || !select) continue;
      label.textContent = `${i + 1}`;
      const selectedValue = selectedBeatPatterns[i];
      Array.from(select.options).forEach((option) => {
        option.selected = option.value === selectedValue;
      });

      select.addEventListener("change", () => {
        selectedBeatPatterns[i] = select.value;
      });

      rhythmBeatList.appendChild(fragment);
    }
  };

  renderBeatSelectors();

  const cloneBar = (bar) => ({
    chord: typeof bar?.chord === "string" ? bar.chord : "",
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

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      const targetBar = bars[safeBarIndex];
      if (targetBar && selectedChord) {
        targetBar.chord = selectedChord;
      }
      if (targetBar) {
        const nextRhythm = [];
        selectedBeatPatterns.forEach((patternId) => {
          const pattern = beatPatternMap[patternId];
          if (pattern) {
            nextRhythm.push(...pattern);
          }
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
          targetBar.chord = "";
          targetBar.rhythm = scoreData.buildDefaultRhythm();
        }
        store.setScoreBars(bars);
        store.setScoreMeasures(bars.length);
        window.close();
        if (!window.closed) {
          window.location.href = "/";
        }
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
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }
});
