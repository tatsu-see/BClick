// configBeat.js
// テンポ/拍数/カウントイン/音色の設定UIを同期する。
import { ConfigStore } from "../utils/store.js";
import { TempoDialController } from "../components/tempoDial.js";
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";
import { getLangMsg } from "../../lib/Language.js";
import { buildCenteredSelectWrap } from "../utils/centeredSelect.js";
import { loadEditScoreDraft, saveEditScoreDraft } from "../utils/editScoreDraft.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const store = new ConfigStore();

  // editScoreから遷移してきたか判定（フラグは消費する）
  const fromEditScore = sessionStorage.getItem("bclick.configBeat.fromEditScore") === "1";
  sessionStorage.removeItem("bclick.configBeat.fromEditScore");
  const editScoreDraft = fromEditScore ? loadEditScoreDraft() : null;

  const tempoInput = document.getElementById("tempoInput");
  const tempoDialEl = document.getElementById("tempoDial");
  const tempoStepCoarse = document.getElementById("tempoStepCoarse");
  const tempoStepFine = document.getElementById("tempoStepFine");
  const clickCountRange = document.getElementById("clickCountRange");
  const clickCountValue = document.getElementById("clickCountValue");
  const countdownRange = document.getElementById("countdownRange");
  const countdownValue = document.getElementById("countdownValue");
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
    const savedTempo = fromEditScore && Number.isFinite(editScoreDraft?.tempo)
      ? editScoreDraft.tempo
      : store.getTempo();
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
    const savedClickCount = fromEditScore && Number.isFinite(editScoreDraft?.clickCount)
      ? editScoreDraft.clickCount
      : store.getClickCount();
    if (savedClickCount !== null) {
      clickCountRange.value = savedClickCount.toString();
    }
    syncRangeValue(clickCountRange, clickCountValue);
    const initialClickCount = Number.parseInt(clickCountRange.value, 10);
    if (Number.isFinite(initialClickCount)) {
      const draftTonePattern = fromEditScore && Array.isArray(editScoreDraft?.clickTonePattern)
        ? editScoreDraft.clickTonePattern
        : null;
      selectedClickTones = draftTonePattern ?? store.getClickTonePattern(initialClickCount);
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
    const savedCountdown = fromEditScore && Number.isFinite(editScoreDraft?.countIn)
      ? editScoreDraft.countIn
      : store.getCountInSec();
    if (savedCountdown !== null) {
      countdownRange.value = savedCountdown.toString();
    }
    syncRangeValue(countdownRange, countdownValue);
    countdownRange.addEventListener("input", () => {
      syncRangeValue(countdownRange, countdownValue);
    });
  }

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      goBackWithFallback();
    });
  }

  const saveAndGoBack = () => {
    try {
      const tempoValue = tempoInput ? tempoDial.clamp(tempoDial.getInputValue()) : null;
      const clickCountNumber = clickCountRange ? Number.parseInt(clickCountRange.value, 10) : NaN;
      const countdownNumber = countdownRange ? Number.parseInt(countdownRange.value, 10) : NaN;

      if (fromEditScore) {
        // ドラフトを更新して editScore に反映させる
        const draft = loadEditScoreDraft();
        if (draft) {
          if (Number.isFinite(tempoValue)) { draft.tempo = tempoValue; }
          if (!Number.isNaN(clickCountNumber)) {
            draft.clickCount = clickCountNumber;
            draft.clickTonePattern = selectedClickTones.slice();
          }
          if (!Number.isNaN(countdownNumber)) { draft.countIn = countdownNumber; }
          saveEditScoreDraft(draft);
        }
        sessionStorage.setItem("bclick.needsScoreRefresh", "1");
      } else {
        // 本番データ（localStorage）に保存
        if (Number.isFinite(tempoValue)) { store.setTempo(tempoValue); }
        if (!Number.isNaN(clickCountNumber)) {
          store.setClickCount(clickCountNumber);
          store.setClickTonePattern(selectedClickTones, clickCountNumber);
        }
        if (!Number.isNaN(countdownNumber)) { store.setCountInSec(countdownNumber); }
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
