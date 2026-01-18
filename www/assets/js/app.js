
import { ConfigStore } from "./store.js";
import { TempoDialController } from "./tempoDial.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempoInput");
  const tempoDisplay = document.getElementById("tempo");
  const tempoDialCoarse = document.getElementById("tempoDialCoarse");
  const tempoDialFine = document.getElementById("tempoDialFine");
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
  const configBeatButton = document.getElementById("configBeat");
  const configScoreButton = document.getElementById("configScore");
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

  const syncTempoFromStore = () => {
    const savedTempo = store.getTempo();
    if (savedTempo === null) return;
    if (tempoDial) {
      tempoDial.setValue(tempoDial.clamp(savedTempo));
    } else {
      setTempoDisplay(savedTempo);
    }
    notifyTempoChange(savedTempo);
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
  };

  const tempoDial = tempoInput
    ? new TempoDialController({
        inputEl: tempoInput,
        dialEls: [tempoDialCoarse, tempoDialFine],
        defaultValue: 60,
        onValueChange: (value) => {
          store.setTempo(value);
          notifyTempoChange(value);
        },
      })
    : null;

  if (tempoDial) {
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
    if (event.key !== "bclick.tempo") return;
    syncTempoFromStore();
  });

  if (clickCountSelect) {
    store.loadClickCountInput(clickCountSelect);
    clickCountSelect.addEventListener("change", () => store.saveClickCountInput(clickCountSelect));
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
    countdownSelect.addEventListener("change", () => store.saveCountInSecInput(countdownSelect));
  }

  if (countdownDownButton) {
    countdownDownButton.addEventListener("click", () => bumpSelectValue(countdownSelect, -1));
  }

  if (countdownUpButton) {
    countdownUpButton.addEventListener("click", () => bumpSelectValue(countdownSelect, 1));
  }

  if (showCodeDiagramButton) {
    showCodeDiagramButton.addEventListener("click", () => {
      const newTab = window.open("/codeDiagram.html", "_blank", "noopener,noreferrer");
      if (!newTab) {
      // window.location.href = "/codeDiagram.html";
      }
    });
  }

  if (configScoreButton) {
    configScoreButton.addEventListener("click", () => {
      const newTab = window.open("/configScore.html", "_blank", "noopener,noreferrer");
      if (!newTab) {
      // window.location.href = "/configScore.html";
      }
    });
  }

  if (configBeatButton) {
    configBeatButton.addEventListener("click", () => {
      const newTab = window.open("/configBeat.html", "_blank", "noopener,noreferrer");
      if (!newTab) {
      // window.location.href = "/configBeat.html";
      }
    });
  }
});
