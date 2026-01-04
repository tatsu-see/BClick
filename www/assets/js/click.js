import { clickSound, getMaxVolume, warmUpAudioContext } from "/assets/lib/Sound.js";
import { chordPool } from "/assets/lib/guiterCode.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM要素の取得
  const showClick = document.getElementById("showClick");
  const countdownText = document.getElementById("countdownText");
  const setClickButton = document.getElementById("setClick");
  const startClickButton = document.getElementById("startClick");
  const stopClickButton = document.getElementById("stopClickart");
  const operation = document.getElementById("operation");
  const countdownOverlay = document.getElementById("countdownOverlay");
  const tempoInput = document.getElementById("tempo");
  const clickCountSelect = document.getElementById("clickCount");
  const countdownSelect = document.getElementById("countdown");

  // タイマーと状態
  let cycleTimerId = null;
  let countdownTimerId = null;
  let isRunning = false;
  let cycleBoxes = [];
  let cycleIndex = 0;
  let currentBeatMs = null;
  let isPaused = false;

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
    const value = getSettingValue(tempoInput, "bclick.tempo", 60);
    return value > 0 ? value : 60;
  };

  const getClickCount = () => {
    const value = getSettingValue(clickCountSelect, "bclick.clickCount", 0);
    return value >= 0 ? value : 0;
  };

  const getCountdown = () => {
    const value = getSettingValue(countdownSelect, "bclick.countdown", 0);
    return value >= 0 ? value : 0;
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
      const chord = chordPool[Math.floor(Math.random() * chordPool.length)];
      box.textContent = chord;
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
      clickSound();
    }, currentBeatMs);
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
    clickSound();

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
    const maxVolume = getMaxVolume();

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
    clickSound(maxVolume / countdown, "A4");

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
      clickSound(maxVolume / countdown, "A4");
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

  if (!startClickButton) {
    startPlayback();
  }

  document.addEventListener("bclick:tempochange", (event) => {
    const nextTempo = getNumberValue(event?.detail?.tempo, getTempo());
    updateTempo(nextTempo);
  });
});
