import { ConfigStore } from "./store.js";
import RhythmScore from "./RhythmScore.js";
import ScoreData from "./ScoreData.js";
import { TempoDialController } from "./tempoDial.js";
import { ensureInAppNavigation, goBackWithFallback } from "./navigationGuard.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const store = new ConfigStore();
  const scoreElement = document.getElementById("score");
  const scoreArea = document.getElementById("scoreArea");
  const saveButton = document.getElementById("saveShowScore");
  const backButton = document.getElementById("backShowScore");
  const closePageButton = document.getElementById("closePage");
  const showCodeDiagramButton = document.getElementById("showCodeDiagram");
  const tempoInput = document.getElementById("tempoInput");
  const tempoDialEl = document.getElementById("tempoDial");
  const tempoStepCoarse = document.getElementById("tempoStepCoarse");
  const tempoStepFine = document.getElementById("tempoStepFine");
  const tempoDialToggle = document.getElementById("tempoDialToggle");
  const tempoDialRow = document.getElementById("tempoDialRow");
  const barsPerRowRange = document.getElementById("barsPerRowRange");
  const barsPerRowValue = document.getElementById("barsPerRowValue");
  let currentScoreData = null;
  let rhythmScore = null;
  let lastSavedBarsJson = "";

  /**
   * テンポ変更をクリック再生へ通知する。
   * @param {number} value
   */
  const notifyTempoChange = (value) => {
    document.dispatchEvent(new CustomEvent("bclick:tempochange", { detail: { tempo: value } }));
  };

  const loadSettings = (resetBars = false) => {
    const savedTimeSignature = store.getScoreTimeSignature();
    const savedMeasures = store.getScoreMeasures();
    const savedProgression = store.getScoreProgression();
    const savedBeatPatterns = store.getScoreBeatPatterns();
    const savedBarsPerRow = store.getScoreBarsPerRow();
    const savedBars = resetBars ? null : store.getScoreBars();
    return new ScoreData({
      timeSignature: savedTimeSignature || "4/4",
      measures: savedMeasures || 8,
      progression: savedProgression || "",
      beatPatterns: savedBeatPatterns || null,
      bars: savedBars || null,
      barsPerRow: savedBarsPerRow || 2,
    });
  };

  const closePage = () => {
    goBackWithFallback();
  };

  /**
   * 戻るボタンの処理。(現状は未実装のため空にしておく。)
   */
  const handleBack = () => {
    closePage();
  };

  if (showCodeDiagramButton) {
    showCodeDiagramButton.addEventListener("click", () => {
      window.location.href = "/codeDiagram.html";
    });
  }

  const hasSavedBars = Array.isArray(store.getScoreBars());
  currentScoreData = loadSettings(!hasSavedBars);
  if (Array.isArray(currentScoreData.bars)) {
    lastSavedBarsJson = JSON.stringify(currentScoreData.bars);
  }
  if (store.getScoreEnabled() === false) {
    // 仕様: リズム表示がOFFならクリックUIのみ表示し、楽譜エリアは隠す。
    if (scoreArea) {
      scoreArea.hidden = true;
    }
    console.log("楽譜表示がOFFです");
  } else if (scoreElement && window.alphaTab) {
    console.log("alphaTab ロード完了。楽譜を生成します...");
    window.bclickActiveChordIndex = -1;
    rhythmScore = new RhythmScore("score", {
      timeSignature: currentScoreData.timeSignature,
      chord: "E",
      measures: currentScoreData.measures,
      progression: currentScoreData.progression,
      bars: currentScoreData.bars,
      barsPerRow: currentScoreData.barsPerRow || 2,
    });
    window.bclickRhythmScore = rhythmScore;
    if (Array.isArray(currentScoreData.bars)) {
      window.bclickScoreBarCount = currentScoreData.bars.length;
    }
    console.log("楽譜生成完了。小節数:", currentScoreData.bars?.length || currentScoreData.measures);
  } else {
    console.warn("楽譜生成条件エラー:", {
      scoreElementExists: !!scoreElement,
      alphaTabLoaded: !!window.alphaTab,
      scoreEnabled: store.getScoreEnabled(),
    });
  }

  const tempoDial = tempoInput
    ? new TempoDialController({
        inputEl: tempoInput,
        dialEls: [tempoDialEl],
        defaultValue: 60,
        onValueChange: (value) => {
          store.setTempo(value);
          notifyTempoChange(value);
        },
      })
    : null;

  if (tempoDial) {
    const tempoStepButtons = [tempoStepCoarse, tempoStepFine].filter(Boolean);
    const dialLabelEl = tempoDialEl ? tempoDialEl.querySelector(".tempoDialLabel") : null;

    /**
     * ダイヤルのステップ変更を反映する。
     * @param {string} step
     * @param {HTMLElement | null} activeButton
     */
    const setTempoStep = (step, activeButton = null) => {
      if (!tempoDialEl) return;
      const parsedStep = Number.parseInt(step, 10);
      if (Number.isNaN(parsedStep)) return;
      tempoDialEl.dataset.step = parsedStep.toString();
      if (dialLabelEl) {
        dialLabelEl.textContent = parsedStep.toString();
      }
      tempoDialEl.setAttribute("aria-label", `テンポを${parsedStep}ずつ変更`);
      tempoStepButtons.forEach((button) => {
        const isActive = button === activeButton;
        button.classList.toggle("isActive", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    };

    if (tempoStepButtons.length > 0) {
      const activeButton =
        tempoStepButtons.find((button) => button.classList.contains("isActive")) || tempoStepButtons[0];
      setTempoStep(activeButton.dataset.step, activeButton);
      tempoStepButtons.forEach((button) => {
        button.addEventListener("click", () => {
          setTempoStep(button.dataset.step, button);
        });
      });
    }

    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      tempoDial.applyStoredValue(savedTempo);
    } else {
      tempoDial.setValue(tempoDial.clamp(tempoDial.getInputValue()));
    }
    tempoDial.attach();
  }

  if (tempoDialToggle && tempoDialRow) {
    const applyDialVisibility = () => {
      const shouldShow = tempoDialToggle.checked;
      tempoDialRow.hidden = !shouldShow;
      tempoDialRow.style.display = shouldShow ? "" : "none";
      tempoDialRow.setAttribute("aria-hidden", String(!shouldShow));
    };
    applyDialVisibility();
    tempoDialToggle.addEventListener("change", applyDialVisibility);
    tempoDialToggle.addEventListener("input", applyDialVisibility);
  }

  if (scoreArea && rhythmScore) {
    scoreArea.addEventListener("scroll", () => {
      rhythmScore.handleOverlayRefresh();
    }, { passive: true });
  }

  if (barsPerRowRange) {
    const savedBarsPerRow = store.getScoreBarsPerRow();
    const initialBarsPerRow = savedBarsPerRow || 2;
    barsPerRowRange.value = initialBarsPerRow.toString();
    if (barsPerRowValue) {
      barsPerRowValue.textContent = barsPerRowRange.value;
    }
    barsPerRowRange.addEventListener("input", () => {
      if (barsPerRowValue) {
        barsPerRowValue.textContent = barsPerRowRange.value;
      }
      const parsed = Number.parseInt(barsPerRowRange.value, 10);
      if (!Number.isNaN(parsed)) {
        store.setScoreBarsPerRow(parsed);
        if (rhythmScore) {
          rhythmScore.setBarsPerRow(parsed);
        }
      }
    });
  }

  /**
   * JSON読込後の画面反映を行う。
   */
  const applyLoadedScoreToUI = () => {
    const nextScoreData = loadSettings(false);
    currentScoreData = nextScoreData;
    if (Array.isArray(nextScoreData.bars)) {
      lastSavedBarsJson = JSON.stringify(nextScoreData.bars);
    }

    if (store.getScoreEnabled() === false) {
      if (scoreArea) {
        scoreArea.hidden = true;
      }
      return;
    }
    if (scoreArea) {
      scoreArea.hidden = false;
    }
    if (rhythmScore) {
      rhythmScore.setTimeSignature(nextScoreData.timeSignature);
      rhythmScore.setMeasures(nextScoreData.measures);
      rhythmScore.setProgression(nextScoreData.progression);
      rhythmScore.setBars(nextScoreData.bars);
      rhythmScore.setBarsPerRow(nextScoreData.barsPerRow || 2);
    } else if (scoreElement && window.alphaTab) {
      window.bclickActiveChordIndex = -1;
      rhythmScore = new RhythmScore("score", {
        timeSignature: nextScoreData.timeSignature,
        chord: "E",
        measures: nextScoreData.measures,
        progression: nextScoreData.progression,
        bars: nextScoreData.bars,
        barsPerRow: nextScoreData.barsPerRow || 2,
      });
      window.bclickRhythmScore = rhythmScore;
      if (Array.isArray(nextScoreData.bars)) {
        window.bclickScoreBarCount = nextScoreData.bars.length;
      }
    }

    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      if (tempoDial) {
        tempoDial.applyStoredValue(savedTempo);
      } else if (tempoInput) {
        tempoInput.value = savedTempo.toString();
      }
      notifyTempoChange(savedTempo);
    }

    if (barsPerRowRange) {
      const savedBarsPerRow = store.getScoreBarsPerRow();
      const nextBarsPerRow = savedBarsPerRow || 2;
      barsPerRowRange.value = nextBarsPerRow.toString();
      if (barsPerRowValue) {
        barsPerRowValue.textContent = barsPerRowRange.value;
      }
    }
  };

  document.addEventListener("bclick:scoreloaded", applyLoadedScoreToUI);

  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== store.keys.ScoreBars) return;
    const savedBars = store.getScoreBars();
    if (!Array.isArray(savedBars)) return;
    const nextJson = JSON.stringify(savedBars);
    if (nextJson === lastSavedBarsJson) return;
    lastSavedBarsJson = nextJson;
    if (!currentScoreData) return;
    currentScoreData.bars = savedBars;
    if (rhythmScore) {
      rhythmScore.setBars(savedBars);
    }
  });

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      if (currentScoreData) {
        const latestBars = store.getScoreBars();
        const barsToSave = Array.isArray(latestBars) ? latestBars : currentScoreData.bars;
        store.setScoreBars(barsToSave);
      }
      closePage();
    });
  }

  if (backButton) {
    backButton.addEventListener("click", handleBack);
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", closePage);
  }
});
