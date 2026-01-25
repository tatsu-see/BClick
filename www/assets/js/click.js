import { clickSound, getMaxVolume, warmUpAudioContext } from "/assets/lib/Sound.js";
import { chordPool } from "/assets/lib/guiterCode.js";
import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM要素の取得
  const showClick = document.getElementById("showClick");
  const countdownText = document.getElementById("countdownText");
  const setClickButton = document.getElementById("setClick");
  const startClickButton = document.getElementById("startClick");
  const stopClickButton = document.getElementById("stopClickart");
  const resetClickButton = document.getElementById("resetClickart");
  const operation = document.getElementById("operation");
  const countdownOverlay = document.getElementById("countdownOverlay");
  const tempoInput = document.getElementById("tempoInput") || document.getElementById("tempo");
  const clickCountSelect = document.getElementById("clickCount");
  const countdownSelect = document.getElementById("countdown");
  const store = new ConfigStore();

  // タイマーと状態
  let cycleTimerId = null;
  let countdownTimerId = null;
  let isRunning = false;
  let cycleBoxes = [];
  let cycleIndex = 0;
  let currentBeatMs = null;
  let isPaused = false;
  let currentClickVolume = null;

  // 値の読み取りユーティリティ
  const getNumberValue = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const getSettingValue = (inputEl, storageKey, fallback) => {
    if (inputEl) {
      const rawValue = "value" in inputEl ? inputEl.value : inputEl.textContent;
      return getNumberValue(rawValue, fallback);
    }
    const stored = sessionStorage.getItem(storageKey);
    return getNumberValue(stored, fallback);
  };

  // 現在の設定値
  const getTempo = () => {
    if (tempoInput) {
      const value = getSettingValue(tempoInput, "bclick.tempo", 60);
      return value > 0 ? value : 60;
    }
    const storedValue = store.getTempo();
    return typeof storedValue === "number" && storedValue > 0 ? storedValue : 60;
  };

  const getClickCount = () => {
    if (clickCountSelect) {
      const value = getSettingValue(clickCountSelect, "bclick.clickCount", 4);
      return value >= 0 ? value : 4;
    }
    const storedValue = store.getClickCount();
    return typeof storedValue === "number" && storedValue >= 0 ? storedValue : 4;
  };

  const getCountdown = () => {
    if (countdownSelect) {
      const value = getSettingValue(countdownSelect, "bclick.countdown", 4);
      return value >= 0 ? value : 4;
    }
    const storedValue = store.getCountInSec();
    return typeof storedValue === "number" && storedValue >= 0 ? storedValue : 4;
  };

  /**
   * 保存済みのクリック音量(0.0-2.0)を取得する。
   * @returns {number}
   */
  const getClickVolume = () => {
    const storedValue = store.getClickVolume();
    if (typeof storedValue === "number" && storedValue >= 0) {
      return Math.min(2, storedValue);
    }
    return 1.0;
  };

  /**
   * 端末別の最大音量に合わせて補正する。
   * @param {number} baseVolume
   * @returns {number}
   */
  const toDeviceVolume = (baseVolume) => {
    const clamped = Math.min(2, Math.max(0, baseVolume));
    const maxVolume = getMaxVolume();
    return (clamped / 2) * maxVolume;
  };

  // UI更新
  const setOperationEnabled = (enabled) => {
    if (setClickButton) setClickButton.disabled = !enabled;
    if (startClickButton) startClickButton.disabled = !enabled;
    if (stopClickButton) stopClickButton.disabled = !enabled;
    if (operation) operation.setAttribute("aria-disabled", String(!enabled));
  };

  const setOverlayVisible = (visible) => {
    if (!countdownOverlay) return;
    countdownOverlay.hidden = !visible;
    countdownOverlay.setAttribute("aria-hidden", String(!visible));
    document.body.style.overflow = visible ? "hidden" : "";
  };

  const updateCountdownDisplay = (seconds) => {
    if (!countdownText) return;
    if (seconds > 0) {
      countdownText.textContent = `開始まで ${seconds}`;
    } else {
      countdownText.textContent = "開始";
    }
  };

  // タイマー停止
  const clearCycleTimer = () => {
    if (cycleTimerId !== null) {
      clearInterval(cycleTimerId);
      cycleTimerId = null;
    }
  };

  const clearTimers = () => {
    clearCycleTimer();
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
    cycleBoxes = [];
    cycleIndex = 0;
    currentBeatMs = null;
    isPaused = false;
  };

  // クリックボックス描画
  const renderClickBoxes = (count) => {
    if (!showClick) return;
    showClick.textContent = "";
    for (let i = 0; i < count; i += 1) {
      const box = document.createElement("div");
      box.className = "clickBox";
      box.textContent = (i + 1).toString();
      showClick.appendChild(box);
    }
  };

  const startCycleTimer = () => {
    if (cycleBoxes.length === 0 || currentBeatMs === null) return;
    clearCycleTimer();
    cycleTimerId = setInterval(() => {
      cycleBoxes[cycleIndex].classList.remove("active");
      cycleIndex = (cycleIndex + 1) % cycleBoxes.length;
      cycleBoxes[cycleIndex].classList.add("active");
      if (cycleIndex === 0) {
        // 1周ごとに次の小節番号へスクロールする。
        scrollToNextBar();
      }
      clickSound(currentClickVolume ?? undefined);
    }, currentBeatMs);
  };

  const scrollToNextBar = () => {
    // カスタム描画された小節番号を順番にスクロールし、現在位置をハイライトする。
    const labels = Array.from(document.querySelectorAll(".scoreChordOverlayLabel"))
      .map((label) => ({
        label,
        barIndex: Number.parseInt(label.dataset.barIndex, 10),
      }))
      .filter((entry) => Number.isFinite(entry.barIndex));
    const labelMap = new Map(labels.map((entry) => [entry.barIndex, entry.label]));
    const fallbackCount = Number.isFinite(window.bclickScoreBarCount)
      ? window.bclickScoreBarCount
      : labels.length;
    if (fallbackCount <= 0) return;
    const currentIndex = Number.isFinite(window.bclickActiveChordIndex)
      ? window.bclickActiveChordIndex
      : -1;
    const nextIndex = (currentIndex + 1) % fallbackCount;
    // リサイズ等で再描画されてもハイライトを復元できるように保存する。
    window.bclickActiveChordIndex = nextIndex;

    const scrollContainer = document.getElementById("scoreArea");
    if (!scrollContainer) return;

    labels.forEach((entry) => entry.label.classList.remove("isActiveChord"));
    const target = labelMap.get(nextIndex);
    if (target) {
      target.classList.add("isActiveChord");
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + scrollContainer.scrollTop;
      const scrollTop = Math.max(0, offset);
      scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
      if (window.bclickRhythmScore?.handleOverlayRefresh) {
        window.bclickRhythmScore.handleOverlayRefresh();
      }
      return;
    }

    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    const ratio = fallbackCount > 1 ? nextIndex / (fallbackCount - 1) : 0;
    scrollContainer.scrollTo({ top: Math.max(0, maxScroll * ratio), behavior: "smooth" });
    if (window.bclickRhythmScore?.handleOverlayRefresh) {
      window.bclickRhythmScore.handleOverlayRefresh();
    }
    setTimeout(() => {
      const retry = scrollContainer.querySelector(
        `.scoreChordOverlayLabel[data-bar-index="${nextIndex}"]`,
      );
      if (!retry) return;
      retry.classList.add("isActiveChord");
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = retry.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + scrollContainer.scrollTop;
      const scrollTop = Math.max(0, offset);
      scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
    }, 60);
  };

  // クリックボックスのループ再生
  const startClickBoxCycle = (beatMs) => {
    const boxes = showClick ? Array.from(showClick.querySelectorAll(".clickBox")) : [];
    if (boxes.length === 0) return;

    cycleBoxes = boxes;
    cycleIndex = 0;
    currentBeatMs = beatMs;

    cycleBoxes.forEach((box) => box.classList.remove("active"));
    cycleBoxes[0].classList.add("active");
    scrollToNextBar();
    clickSound(currentClickVolume ?? undefined);

    startCycleTimer();
  };

  const updateTempo = (tempo) => {
    if (!Number.isFinite(tempo) || tempo <= 0) return;
    currentBeatMs = 60000 / tempo;
    if (isRunning && cycleTimerId !== null) {
      startCycleTimer();
    }
  };

  // audioContextのウォームアップ
  warmUpAudioContext();

  // 再生開始
  const startPlayback = () => {

    if (isRunning) {
      return;
    }

    // audioContextのウォームアップ
    warmUpAudioContext();

    if (isPaused && cycleBoxes.length > 0 && currentBeatMs !== null) {
      isRunning = true;
      isPaused = false;
      setOperationEnabled(true);
      startCycleTimer();
      return;
    }

    const tempo = getTempo();
    const beatMs = 60000 / tempo;
    currentBeatMs = beatMs;
    const clickCount = getClickCount();
    let countdown = getCountdown();
    currentClickVolume = toDeviceVolume(getClickVolume());

    renderClickBoxes(clickCount);
    isRunning = true;
    setOperationEnabled(true);

    // カウントダウンが0の場合
    if (countdown <= 0) {
      updateCountdownDisplay(0);
      setOverlayVisible(false);
      startClickBoxCycle(beatMs);
      return;
    }

    // カウントダウンが0より大きい場合
    setOverlayVisible(true);
    updateCountdownDisplay(countdown);
    // 初回の音切れ回避用のウォームアップ
    clickSound(0.02, "A4");
    clickSound(currentClickVolume / countdown, "A4");

    countdownTimerId = setInterval(() => {
      countdown -= 1;

      if (countdown <= 0) {
        clearInterval(countdownTimerId);
        countdownTimerId = null;
        updateCountdownDisplay(0);
        setOverlayVisible(false);
        startClickBoxCycle(currentBeatMs ?? beatMs);
        return;
      }
      updateCountdownDisplay(countdown);
      clickSound(currentClickVolume / countdown, "A4");
    }, beatMs);
  };

  const setClickBoxes = () => {
    const clickCount = getClickCount();
    renderClickBoxes(clickCount);
    clearCycleTimer();
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
    isRunning = false;
    isPaused = false;
    setOverlayVisible(false);
  };

  const resetPlayback = () => {
    clearTimers();
    if (typeof window.bclickActiveChordIndex !== "undefined") {
      window.bclickActiveChordIndex = -1;
    }
    const scrollContainer = document.getElementById("scoreArea");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "auto" });
    }
    setClickBoxes();
  };

  const pausePlayback = () => {
    clearCycleTimer();
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
    isRunning = false;
    isPaused = true;
    setOverlayVisible(false);
    setOperationEnabled(true);
  };

  // イベント登録
  if (setClickButton) {
    setClickButton.addEventListener("click", setClickBoxes);
  }

  if (startClickButton) {
    startClickButton.addEventListener("click", startPlayback);
  }

  if (stopClickButton) {
    stopClickButton.addEventListener("click", pausePlayback);
  }

  if (resetClickButton) {
    resetClickButton.addEventListener("click", resetPlayback);
  }

  if (!startClickButton) {
    startPlayback();
  }

  setClickBoxes();

  document.addEventListener("bclick:tempochange", (event) => {
    const nextTempo = getNumberValue(event?.detail?.tempo, getTempo());
    updateTempo(nextTempo);
  });
});
