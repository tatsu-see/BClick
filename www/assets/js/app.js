
import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempo");
  const tempoDown10Button = document.getElementById("tempoDown10");
  const tempoDownButton = document.getElementById("tempoDown");
  const tempoUpButton = document.getElementById("tempoUp");
  const tempoUp10Button = document.getElementById("tempoUp10");
  const clickCountSelect = document.getElementById("clickCount");
  const countdownSelect = document.getElementById("countdown");
  const showCodeDiagramButton = document.getElementById("showCodeDiagram");
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

  const setTempoDisplay = (value) => {
    if (!tempoInput) return;
    tempoInput.textContent = value.toString();
  };

  const adjustTempo = (delta) => {
    if (!tempoInput) return;
    const baseValue = getElementNumberValue(tempoInput, 60);
    const minValue = getNumberAttribute(tempoInput, "data-min", Number.NEGATIVE_INFINITY);
    const maxValue = getNumberAttribute(tempoInput, "data-max", Number.POSITIVE_INFINITY);
    const nextValue = Math.min(maxValue, Math.max(minValue, baseValue + delta));
    setTempoDisplay(nextValue);
    store.setTempo(nextValue);
    notifyTempoChange(nextValue);
  };

  if (tempoInput) {
    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      setTempoDisplay(savedTempo);
    } else {
      setTempoDisplay(getElementNumberValue(tempoInput, 60));
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

  if (clickCountSelect) {
    store.loadClickCountInput(clickCountSelect);
    clickCountSelect.addEventListener("change", () => store.saveClickCountInput(clickCountSelect));
  }

  if (countdownSelect) {
    store.loadCountInSecInput(countdownSelect);
    countdownSelect.addEventListener("change", () => store.saveCountInSecInput(countdownSelect));
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
});
