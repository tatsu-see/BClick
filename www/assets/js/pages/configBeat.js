import { ConfigStore } from "../utils/store.js";
import { TempoDialController } from "../components/tempoDial.js";
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempoInput");
  const tempoDialEl = document.getElementById("tempoDial");
  const tempoStepCoarse = document.getElementById("tempoStepCoarse");
  const tempoStepFine = document.getElementById("tempoStepFine");
  const clickCountRange = document.getElementById("clickCountRange");
  const clickCountValue = document.getElementById("clickCountValue");
  const countdownRange = document.getElementById("countdownRange");
  const countdownValue = document.getElementById("countdownValue");
  const clickVolumeRange = document.getElementById("clickVolumeRange");
  const clickVolumeValue = document.getElementById("clickVolumeValue");
  const saveButton = document.getElementById("saveConfigBeat");
  const closePageButton = document.getElementById("closePage");

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

  /**
   * クリック音量(0.0-2.0)を表示レベル(0-10)に変換する。
   * @param {number} volume
   * @returns {number}
   */
  const volumeToLevel = (volume) => Math.round((volume / 2) * 10);

  /**
   * 表示レベル(0-10)をクリック音量(0.0-2.0)に変換する。
   * @param {number} level
   * @returns {number}
   */
  const levelToVolume = (level) => (level / 10) * 2;

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

  if (clickVolumeRange) {
    const savedClickVolume = store.getClickVolume();
    if (savedClickVolume !== null) {
      const level = volumeToLevel(savedClickVolume);
      clickVolumeRange.value = level.toString();
    }
    syncRangeValue(clickVolumeRange, clickVolumeValue);
    clickVolumeRange.addEventListener("input", () => {
      syncRangeValue(clickVolumeRange, clickVolumeValue);
    });
  }

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      goBackWithFallback();
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

      if (clickVolumeRange) {
        const levelNumber = Number.parseInt(clickVolumeRange.value, 10);
        if (!Number.isNaN(levelNumber)) {
          store.setClickVolume(levelToVolume(levelNumber));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`configBeat: OK保存中にエラーが発生しました。 ${message}`, error);
      window.alert(`保存に失敗しました: ${message}`);
      return;
    }

    goBackWithFallback();
  };

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      saveAndGoBack();
    });
  }
});
