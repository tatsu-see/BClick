import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempoInput");
  const tempoDown10Button = document.getElementById("tempoDown10");
  const tempoDownButton = document.getElementById("tempoDown");
  const tempoUpButton = document.getElementById("tempoUp");
  const tempoUp10Button = document.getElementById("tempoUp10");
  const clickCountRange = document.getElementById("clickCountRange");
  const clickCountValue = document.getElementById("clickCountValue");
  const countdownRange = document.getElementById("countdownRange");
  const countdownValue = document.getElementById("countdownValue");
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

  const syncRangeValue = (rangeEl, outputEl) => {
    if (!rangeEl || !outputEl) return;
    outputEl.textContent = rangeEl.value;
  };

  if (clickCountRange) {
    const savedClickCount = store.getClickCount();
    if (savedClickCount !== null) {
      clickCountRange.value = savedClickCount.toString();
    }
    syncRangeValue(clickCountRange, clickCountValue);
    clickCountRange.addEventListener("input", () => {
      syncRangeValue(clickCountRange, clickCountValue);
    });
  }

  if (countdownRange) {
    const savedCountdown = store.getCountInSec();
    if (savedCountdown !== null) {
      countdownRange.value = savedCountdown.toString();
    }
    syncRangeValue(countdownRange, countdownValue);
    countdownRange.addEventListener("input", () => {
      syncRangeValue(countdownRange, countdownValue);
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

  if (!saveButton) return;
  saveButton.addEventListener("click", () => {
    try {
      if (tempoInput) {
        const tempoValue = clampTempo(getInputNumberValue(tempoInput, 60));
        if (Number.isFinite(tempoValue)) {
          store.setTempo(tempoValue);
        }
      }

      if (clickCountRange) {
        const clickCountNumber = Number.parseInt(clickCountRange.value, 10);
        if (!Number.isNaN(clickCountNumber)) {
          store.setClickCount(clickCountNumber);
        }
      }

      if (countdownRange) {
        const countdownNumber = Number.parseInt(countdownRange.value, 10);
        if (!Number.isNaN(countdownNumber)) {
          store.setCountInSec(countdownNumber);
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
