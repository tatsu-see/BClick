import { ConfigStore } from "./store.js";
import { TempoDialController } from "./tempoDial.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempoInput");
  const tempoDialEl = document.getElementById("tempoDial");
  const tempoStepCoarse = document.getElementById("tempoStepCoarse");
  const tempoStepFine = document.getElementById("tempoStepFine");
  const clickCountRange = document.getElementById("clickCountRange");
  const clickCountValue = document.getElementById("clickCountValue");
  const countdownRange = document.getElementById("countdownRange");
  const countdownValue = document.getElementById("countdownValue");
  const saveButton = document.getElementById("saveConfigBeat");
  const closePageButton = document.getElementById("closePage");

  const initialSnapshot = {
    tempo: store.getSettings(store.keys.Tempo),
    clickCount: store.getSettings(store.keys.ClickCount),
    countdown: store.getSettings(store.keys.Countdown),
  };

  /**
   * Back時に保存前の設定へ戻す。
   */
  const restoreSnapshot = () => {
    if (typeof initialSnapshot.tempo === "number" && Number.isFinite(initialSnapshot.tempo)) {
      store.setTempo(initialSnapshot.tempo);
    } else if (store.keys?.Tempo) {
      store.removeSettings(store.keys.Tempo);
    }

    if (typeof initialSnapshot.clickCount === "number" && Number.isFinite(initialSnapshot.clickCount)) {
      store.setClickCount(initialSnapshot.clickCount);
    } else if (store.keys?.ClickCount) {
      store.removeSettings(store.keys.ClickCount);
    }

    if (typeof initialSnapshot.countdown === "number" && Number.isFinite(initialSnapshot.countdown)) {
      store.setCountInSec(initialSnapshot.countdown);
    } else if (store.keys?.Countdown) {
      store.removeSettings(store.keys.Countdown);
    }
  };

  const tempoDial = new TempoDialController({
    inputEl: tempoInput,
    dialEls: [tempoDialEl],
    defaultValue: 60,
  });
  tempoDial.attach();

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

  if (tempoInput) {
    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      tempoDial.applyStoredValue(savedTempo);
    } else {
      tempoDial.setValue(tempoDial.clamp(tempoDial.getInputValue()));
    }
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

  const goBack = () => {
    window.close();
    if (!window.closed) {
      window.location.href = "/";
    }
  };

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      restoreSnapshot();
      goBack();
    });
  }

  const saveAndGoBack = () => {
    try {
      if (tempoInput) {
        const tempoValue = tempoDial.clamp(tempoDial.getInputValue());
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

    goBack();
  };

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      saveAndGoBack();
    });
  }
});
