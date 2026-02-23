// configBeat.js
// テンポ/拍数/カウントイン/音量/音色の設定UIを同期する。
import { ConfigStore } from "../utils/store.js";
import { TempoDialController } from "../components/tempoDial.js";
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";
import { getLangMsg } from "../../lib/Language.js";
import { buildCenteredSelectWrap } from "../utils/centeredSelect.js";

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
  const clickToneSelectors = document.getElementById("clickToneSelectors");
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

  // 保存値は音名(A5/A4/"")で持ち、UI表示だけ H/L/— にする。
  const toneOptions = [
    { value: "A5", label: "H" },
    { value: "A4", label: "L" },
    { value: "", label: "—" },
  ];

  // 1,5,9,13拍目を強拍として高い音にする。
  const getDefaultToneForIndex = (index) => (index % 4 === 0 ? "A5" : "A4");

  /**
   * 現在の拍数に合わせて音色パターン配列を作る。
   * 不足分は既定値で補い、拍数を減らした場合は切り詰める。
   * @param {number} count
   * @param {string[]} source
   * @returns {string[]}
   */
  const buildTonePattern = (count, source = []) =>
    Array.from({ length: count }, (_, index) => {
      const tone = source[index];
      if (toneOptions.some((option) => option.value === tone)) {
        return tone;
      }
      return getDefaultToneForIndex(index);
    });

  let selectedClickTones = [];

  /**
   * 拍数に応じて音色選択UIを再構築する。
   * @param {number} count
   */
  const renderToneSelectors = (count) => {
    if (!clickToneSelectors) return;
    const safeCount = Number.isFinite(count) ? Math.max(1, count) : 1;
    selectedClickTones = buildTonePattern(safeCount, selectedClickTones);
    clickToneSelectors.textContent = "";
    selectedClickTones.forEach((tone, index) => {
      const select = document.createElement("select");
      select.dataset.beatIndex = index.toString();
      select.setAttribute("aria-label", `Select tone for beat ${index + 1}`);
      toneOptions.forEach((optionItem) => {
        const option = document.createElement("option");
        option.value = optionItem.value;
        option.textContent = optionItem.label;
        option.selected = tone === optionItem.value;
        select.appendChild(option);
      });
      select.addEventListener("change", () => {
        const nextValue = select.value;
        selectedClickTones[index] = toneOptions.some((option) => option.value === nextValue)
          ? nextValue
          : getDefaultToneForIndex(index);
      });
      clickToneSelectors.appendChild(
        buildCenteredSelectWrap(select, { labelClass: "rhythmSelectLabelTone" }),
      );
    });
  };

  if (clickCountRange) {
    const savedClickCount = store.getClickCount();
    if (savedClickCount !== null) {
      clickCountRange.value = savedClickCount.toString();
    }
    syncRangeValue(clickCountRange, clickCountValue);
    const initialClickCount = Number.parseInt(clickCountRange.value, 10);
    if (Number.isFinite(initialClickCount)) {
      selectedClickTones = store.getClickTonePattern(initialClickCount);
      renderToneSelectors(initialClickCount);
    }
    clickCountRange.addEventListener("input", () => {
      syncRangeValue(clickCountRange, clickCountValue);
      const nextCount = Number.parseInt(clickCountRange.value, 10);
      if (Number.isFinite(nextCount)) {
        renderToneSelectors(nextCount);
      }
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
          store.setClickTonePattern(selectedClickTones, clickCountNumber);
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
      window.alert(
        getLangMsg(
          `保存に失敗しました: ${message}`,
          `Failed to save: ${message}`,
        ),
      );
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
