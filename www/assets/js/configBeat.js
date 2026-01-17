import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempoInput");
  const tempoDialCoarse = document.getElementById("tempoDialCoarse");
  const tempoDialFine = document.getElementById("tempoDialFine");
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

    tempoInput.addEventListener("change", () => {
      const clamped = clampTempo(getInputNumberValue(tempoInput, 60));
      setTempoInput(clamped);
    });
  }

  const angleDiff = (current, previous) => {
    let diff = current - previous;
    while (diff <= -180) diff += 360;
    while (diff > 180) diff -= 360;
    return diff;
  };

  const getAngle = (dialEl, event) => {
    const rect = dialEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const setupDial = (dialEl) => {
    if (!dialEl) return;
    const step = Number.parseFloat(dialEl.dataset.step || "1");
    const degreesPerStep = Number.parseFloat(dialEl.dataset.degreesPerStep || "18");
    const labelEl = dialEl.querySelector(".tempoDialLabel");
    const defaultLabel = labelEl ? labelEl.textContent : "";
    let isActive = false;
    let lastAngle = 0;
    let carry = 0;

    dialEl.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      dialEl.setPointerCapture(event.pointerId);
      isActive = true;
      lastAngle = getAngle(dialEl, event);
      carry = 0;
    });

    dialEl.addEventListener("pointermove", (event) => {
      if (!isActive) return;
      const currentAngle = getAngle(dialEl, event);
      const diff = angleDiff(currentAngle, lastAngle);
      carry += diff;
      const steps = Math.trunc(carry / degreesPerStep);
      if (steps !== 0) {
        adjustTempo(steps * step);
        carry -= steps * degreesPerStep;
      }
      if (labelEl) {
        labelEl.textContent = diff > 0 ? "+ " : diff < 0 ? "- " : defaultLabel;
      }
      lastAngle = currentAngle;
    });

    const releaseDial = () => {
      isActive = false;
      carry = 0;
      if (labelEl) {
        labelEl.textContent = defaultLabel;
      }
    };

    dialEl.addEventListener("pointerup", releaseDial);
    dialEl.addEventListener("pointercancel", releaseDial);
    dialEl.addEventListener("lostpointercapture", releaseDial);
  };

  setupDial(tempoDialCoarse);
  setupDial(tempoDialFine);

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
