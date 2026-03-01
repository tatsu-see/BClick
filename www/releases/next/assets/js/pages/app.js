
import { ConfigStore } from "../utils/store.js";
import { TempoDialController } from "../components/tempoDial.js";
import { getLangMsg } from "../../lib/Language.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempoInput");
  const tempoDisplay = document.getElementById("tempo");
  const tempoDialEl = document.getElementById("tempoDial");
  const tempoStepCoarse = document.getElementById("tempoStepCoarse");
  const tempoStepFine = document.getElementById("tempoStepFine");
  const beatSummary = document.getElementById("configBeat");
  const scoreSummary = document.getElementById("configScore");
  const scoreSetting = document.getElementById("scoreSetting");
  const scoreToggle = document.getElementById("scoreToggle");
  const scoreExec = document.querySelector("#preferenceRythm .preferenceExec");
  const scoreSectionTitle = document.querySelector("#preferenceRythm .preferenceTitle");
  const scoreExecButtons = scoreExec ? scoreExec.querySelectorAll("button") : [];
  const tempoDown10Button = document.getElementById("tempoDown10");
  const tempoDownButton = document.getElementById("tempoDown");
  const tempoUpButton = document.getElementById("tempoUp");
  const tempoUp10Button = document.getElementById("tempoUp10");
  const clickCountSelect = document.getElementById("clickCount");
  const clickCountDownButton = document.getElementById("clickCountDown");
  const clickCountUpButton = document.getElementById("clickCountUp");
  const countdownSelect = document.getElementById("countdown");
  const countdownDownButton = document.getElementById("countdownDown");
  const countdownUpButton = document.getElementById("countdownUp");
  const showCodeDiagramButton = document.getElementById("showCodeDiagram");
  const openConfigAppButton = document.getElementById("openConfigApp");
  const configBeatButton = document.getElementById("configBeatButton");
  const configScoreButton = document.getElementById("configScoreButton");
  const closeCodeDiagramButton = document.getElementById("closeCodeDiagram");

  const getNumberAttribute = (element, attrName, fallback) => {
    if (!element) return fallback;
    const raw = element.getAttribute(attrName);
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const getElementNumberValue = (element, fallback) => {
    if (!element) return fallback;
    const raw = "value" in element ? element.value : element.textContent;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const notifyTempoChange = (value) => {
    document.dispatchEvent(new CustomEvent("bclick:tempochange", { detail: { tempo: value } }));
  };

  const updateBeatSummary = () => {
    if (!beatSummary) return;
    const tempoValue = tempoInput
      ? getElementNumberValue(tempoInput, 60)
      : getElementNumberValue(tempoDisplay, 60);
    const clickCountValue = clickCountSelect
      ? getElementNumberValue(clickCountSelect, 4)
      : store.getClickCount();
    const countdownValue = countdownSelect
      ? getElementNumberValue(countdownSelect, 4)
      : store.getCountInSec();
    const safeClickCount = Number.isFinite(clickCountValue) ? clickCountValue : 4;
    const safeCountdown = Number.isFinite(countdownValue) ? countdownValue : 4;
    beatSummary.textContent = getLangMsg(
      `BPM ${tempoValue}、クリック数 ${safeClickCount}、カウントイン ${safeCountdown}`,
      `BPM ${tempoValue}, Clicks ${safeClickCount}, Count-in ${safeCountdown}`,
    );
  };

  const updateScoreSummary = () => {
    if (!scoreSummary) return;
    const timeSignature = store.getScoreTimeSignature() || "4/4";
    const progression = store.getScoreProgression() || "";
    const measures = store.getScoreMeasures() || 8;
    const displayProgression = progression.length > 0
      ? progression
      : getLangMsg("(未設定)", "(Not set)");
    scoreSummary.textContent = getLangMsg(
      `拍子 ${timeSignature}、進行 ${displayProgression}、小節数 ${measures}`,
      `Time ${timeSignature}, Progression ${displayProgression}, Bars ${measures}`,
    );
  };

  if (scoreToggle) {
    const savedScoreEnabled = store.getScoreEnabled();
    if (savedScoreEnabled !== null) {
      scoreToggle.checked = savedScoreEnabled;
    } else {
      scoreToggle.checked = false;
    }
  }

  const updateScoreToggle = () => {
    if (!scoreToggle || !scoreSetting) return;
    const enabled = scoreToggle.checked;
    scoreSetting.classList.toggle("isDisabled", !enabled);
    scoreSetting.setAttribute("aria-disabled", String(!enabled));
    if (configScoreButton) {
      configScoreButton.disabled = !enabled;
    }
    if (scoreExec) {
      scoreExec.classList.toggle("isDisabled", !enabled);
      scoreExec.setAttribute("aria-disabled", String(!enabled));
    }
    if (scoreSectionTitle) {
      scoreSectionTitle.classList.toggle("isDisabled", !enabled);
      scoreSectionTitle.setAttribute("aria-disabled", String(!enabled));
    }
    scoreExecButtons.forEach((button) => {
      button.disabled = !enabled;
    });
  };

  const refreshFromStore = () => {
    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      if (tempoDial) {
        tempoDial.setValue(tempoDial.clamp(savedTempo));
      } else {
        setTempoDisplay(savedTempo);
      }
      notifyTempoChange(savedTempo);
    }

    const savedClickCount = store.getClickCount();
    if (clickCountSelect && savedClickCount !== null) {
      clickCountSelect.value = savedClickCount.toString();
    }

    const savedCountdown = store.getCountInSec();
    if (countdownSelect && savedCountdown !== null) {
      countdownSelect.value = savedCountdown.toString();
    }

    const savedScoreEnabled = store.getScoreEnabled();
    if (scoreToggle && savedScoreEnabled !== null) {
      scoreToggle.checked = savedScoreEnabled;
      updateScoreToggle();
    }

    updateBeatSummary();
    updateScoreSummary();
  };

  const syncTempoFromStore = () => {
    const savedTempo = store.getTempo();
    if (savedTempo === null) return;
    if (tempoDial) {
      tempoDial.setValue(tempoDial.clamp(savedTempo));
    } else {
      setTempoDisplay(savedTempo);
    }
    notifyTempoChange(savedTempo);
    updateBeatSummary();
  };

  const setTempoDisplay = (value) => {
    if (tempoInput) {
      tempoInput.value = value.toString();
      return;
    }
    if (tempoDisplay) {
      tempoDisplay.textContent = value.toString();
    }
  };

  const adjustTempo = (delta) => {
    if (tempoDial) {
      tempoDial.adjustBy(delta);
      return;
    }
    if (!tempoDisplay) return;
    const baseValue = getElementNumberValue(tempoDisplay, 60);
    const minValue = getNumberAttribute(tempoDisplay, "data-min", Number.NEGATIVE_INFINITY);
    const maxValue = getNumberAttribute(tempoDisplay, "data-max", Number.POSITIVE_INFINITY);
    const nextValue = Math.min(maxValue, Math.max(minValue, baseValue + delta));
    setTempoDisplay(nextValue);
    store.setTempo(nextValue);
    notifyTempoChange(nextValue);
    updateBeatSummary();
  };

  const tempoDial = tempoInput
    ? new TempoDialController({
        inputEl: tempoInput,
        dialEls: [tempoDialEl],
        defaultValue: 60,
        onValueChange: (value) => {
          store.setTempo(value);
          notifyTempoChange(value);
          updateBeatSummary();
        },
      })
    : null;

  if (tempoDial) {
    const tempoStepButtons = [tempoStepCoarse, tempoStepFine].filter(Boolean);
    const dialLabelEl = tempoDialEl ? tempoDialEl.querySelector(".tempoDialLabel") : null;
    const setTempoStep = (step, activeButton = null) => {
      if (!tempoDialEl) return;
      const parsedStep = Number.parseInt(step, 10);
      if (Number.isNaN(parsedStep)) return;
      tempoDialEl.dataset.step = parsedStep.toString();
      if (dialLabelEl) {
        dialLabelEl.textContent = parsedStep.toString();
      }
    tempoDialEl.setAttribute("aria-label", `Change tempo by ${parsedStep}`);
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
  } else if (tempoDisplay) {
    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      setTempoDisplay(savedTempo);
    } else {
      setTempoDisplay(getElementNumberValue(tempoDisplay, 60));
    }
  }
  updateBeatSummary();
  updateScoreSummary();
  updateScoreToggle();

  if (scoreToggle) {
    scoreToggle.addEventListener("change", () => {
      updateScoreToggle();
      store.setScoreEnabled(scoreToggle.checked);
    });
  }

  window.addEventListener("pageshow", () => {
    refreshFromStore();
  });

  if (tempoDownButton) {
    tempoDownButton.addEventListener("click", () => adjustTempo(-1));
  }

  if (tempoUpButton) {
    tempoUpButton.addEventListener("click", () => adjustTempo(1));
  }

  if (tempoDown10Button) {
    tempoDown10Button.addEventListener("click", () => adjustTempo(-10));
  }

  if (tempoUp10Button) {
    tempoUp10Button.addEventListener("click", () => adjustTempo(10));
  }

  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key === "bclick.tempo") {
      syncTempoFromStore();
      return;
    }
    if (event.key === "bclick.clickCount") {
      const savedClickCount = store.getClickCount();
      if (clickCountSelect && savedClickCount !== null) {
        clickCountSelect.value = savedClickCount.toString();
      }
      updateBeatSummary();
      return;
    }
    if (event.key === "bclick.countdown") {
      const savedCountdown = store.getCountInSec();
      if (countdownSelect && savedCountdown !== null) {
        countdownSelect.value = savedCountdown.toString();
      }
      updateBeatSummary();
      return;
    }
    if (
      event.key === "bclick.score.timeSignature"
      || event.key === "bclick.score.progression"
      || event.key === "bclick.score.measures"
    ) {
      updateScoreSummary();
    }
  });

  if (clickCountSelect) {
    store.loadClickCountInput(clickCountSelect);
    clickCountSelect.addEventListener("change", () => {
      store.saveClickCountInput(clickCountSelect);
      updateBeatSummary();
    });
    updateBeatSummary();
  }

  const bumpSelectValue = (selectEl, delta) => {
    if (!selectEl) return;
    const values = Array.from(selectEl.options).map((option) => Number.parseInt(option.value, 10));
    const current = Number.parseInt(selectEl.value, 10);
    const currentIndex = values.indexOf(current);
    if (currentIndex < 0) return;
    const nextIndex = Math.min(values.length - 1, Math.max(0, currentIndex + delta));
    if (nextIndex === currentIndex) return;
    selectEl.value = values[nextIndex].toString();
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
  };

  if (clickCountDownButton) {
    clickCountDownButton.addEventListener("click", () => bumpSelectValue(clickCountSelect, -1));
  }

  if (clickCountUpButton) {
    clickCountUpButton.addEventListener("click", () => bumpSelectValue(clickCountSelect, 1));
  }

  if (countdownSelect) {
    store.loadCountInSecInput(countdownSelect);
    countdownSelect.addEventListener("change", () => {
      store.saveCountInSecInput(countdownSelect);
      updateBeatSummary();
    });
    updateBeatSummary();
  }

  if (countdownDownButton) {
    countdownDownButton.addEventListener("click", () => bumpSelectValue(countdownSelect, -1));
  }

  if (countdownUpButton) {
    countdownUpButton.addEventListener("click", () => bumpSelectValue(countdownSelect, 1));
  }

  if (showCodeDiagramButton) {
    showCodeDiagramButton.addEventListener("click", () => {
      window.location.href = "codeDiagram.html";
    });
  }

  if (configScoreButton) {
    configScoreButton.addEventListener("click", () => {
      window.location.href = "configScore.html";
    });
  }


  if (configBeatButton) {
    configBeatButton.addEventListener("click", () => {
      window.location.href = "configBeat.html";
    });
  }

  // アプリ設定ボタン（ヘッダー右端の歯車）
  if (openConfigAppButton) {
    openConfigAppButton.addEventListener("click", () => {
      window.location.href = "configApp.html";
    });
  }
});




