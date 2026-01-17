import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempoInput");
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
  const saveButton = document.getElementById("saveConfigBeat");
  const closePageButton = document.getElementById("closePage");

  const getNumberAttribute = (element, attrName, fallback) => {
    if (!element) return fallback;
    const raw = element.getAttribute(attrName);
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const getInputNumberValue = (element, fallback) => {
    if (!element) return fallback;
    const raw = element.value;
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const setTempoInput = (value) => {
    if (!tempoInput) return;
    tempoInput.value = value.toString();
  };

  const clampTempo = (value) => {
    const minValue = getNumberAttribute(tempoInput, "min", Number.NEGATIVE_INFINITY);
    const maxValue = getNumberAttribute(tempoInput, "max", Number.POSITIVE_INFINITY);
    return Math.min(maxValue, Math.max(minValue, value));
  };

  const adjustTempo = (delta) => {
    if (!tempoInput) return;
    const baseValue = getInputNumberValue(tempoInput, 60);
    const nextValue = clampTempo(baseValue + delta);
    setTempoInput(nextValue);
  };

  if (tempoInput) {
    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      setTempoInput(clampTempo(savedTempo));
    } else {
      setTempoInput(getInputNumberValue(tempoInput, 60));
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
    const savedClickCount = store.getClickCount();
    if (savedClickCount !== null) {
      clickCountSelect.value = savedClickCount.toString();
    }
  }

  if (countdownSelect) {
    const savedCountdown = store.getCountInSec();
    if (savedCountdown !== null) {
      countdownSelect.value = savedCountdown.toString();
    }
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
  };

  if (clickCountDownButton) {
    clickCountDownButton.addEventListener("click", () => bumpSelectValue(clickCountSelect, -1));
  }

  if (clickCountUpButton) {
    clickCountUpButton.addEventListener("click", () => bumpSelectValue(clickCountSelect, 1));
  }

  if (countdownDownButton) {
    countdownDownButton.addEventListener("click", () => bumpSelectValue(countdownSelect, -1));
  }

  if (countdownUpButton) {
    countdownUpButton.addEventListener("click", () => bumpSelectValue(countdownSelect, 1));
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }

  if (!saveButton) return;
  saveButton.addEventListener("click", () => {
    try {
      if (tempoInput) {
        const tempoValue = clampTempo(getInputNumberValue(tempoInput, 60));
        if (Number.isFinite(tempoValue)) {
          store.setTempo(tempoValue);
        }
      }

      if (clickCountSelect) {
        const clickCountValue = Number.parseInt(clickCountSelect.value, 10);
        if (!Number.isNaN(clickCountValue)) {
          store.setClickCount(clickCountValue);
        }
      }

      if (countdownSelect) {
        const countdownValue = Number.parseInt(countdownSelect.value, 10);
        if (!Number.isNaN(countdownValue)) {
          store.setCountInSec(countdownValue);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`configBeat: OK保存中にエラーが発生しました。 ${message}`, error);
      window.alert(`保存に失敗しました: ${message}`);
      return;
    }

    window.close();
    if (!window.closed) {
      window.location.href = "/";
    }
  });
});
