import { clickSound, getMaxVolume } from "/assets/lib/Sound.js";

document.addEventListener("DOMContentLoaded", () => {
  // 要素の取得
  const showClick = document.getElementById("showClick");
  const countdownText = document.getElementById("countdownText");
  const startButton = document.getElementById("start");
  const stopButton = document.getElementById("stopBtn");
  const operation = document.getElementById("operation");
  const countdownOverlay = document.getElementById("countdownOverlay");
  const tempoInput = document.getElementById("tempo");
  const clickCountSelect = document.getElementById("clickCount");
  const countdownSelect = document.getElementById("countdown");

  let cycleTimerId = null;
  let countdownTimerId = null;
  let isRunning = false;

  const getNumberValue = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const getSettingValue = (inputEl, storageKey, fallback) => {
    if (inputEl) return getNumberValue(inputEl.value, fallback);
    const stored = sessionStorage.getItem(storageKey);
    return getNumberValue(stored, fallback);
  };

  const getTempo = () => {
    const value = getSettingValue(tempoInput, "bclick.tempo", 120);
    return value > 0 ? value : 120;
  };

  const getClickCount = () => {
    const value = getSettingValue(clickCountSelect, "bclick.clickCount", 0);
    return value >= 0 ? value : 0;
  };

  const getCountdown = () => {
    const value = getSettingValue(countdownSelect, "bclick.countdown", 0);
    return value >= 0 ? value : 0;
  };

  const setOperationEnabled = (enabled) => {
    if (startButton) startButton.disabled = !enabled;
    if (stopButton) stopButton.disabled = !enabled;
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

  const clearTimers = () => {
    if (cycleTimerId !== null) {
      clearInterval(cycleTimerId);
      cycleTimerId = null;
    }
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
  };

  const renderClickBoxes = (count) => {
    if (!showClick) return;
    showClick.textContent = "";
    for (let i = 0; i < count; i += 1) {
      const box = document.createElement("div");
      box.className = "clickBox";
      showClick.appendChild(box);
    }
  };

  const startClickBoxCycle = (beatMs) => {
    const boxes = showClick ? Array.from(showClick.querySelectorAll(".clickBox")) : [];
    if (boxes.length === 0) return;

    let index = 0;
    boxes.forEach((box) => box.classList.remove("active"));
    boxes[0].classList.add("active");
    clickSound();

    cycleTimerId = setInterval(() => {
      boxes[index].classList.remove("active");
      index = (index + 1) % boxes.length;
      boxes[index].classList.add("active");
      clickSound();
    }, beatMs);
  };

  const stopPlayback = () => {
    clearTimers();
    isRunning = false;
    setOverlayVisible(false);
    setOperationEnabled(true);
    if (startButton) startButton.textContent = "開始";
    if (stopButton) stopButton.textContent = "開始";
  };

  const startPlayback = () => {
    const tempo = getTempo();
    const beatMs = 60000 / tempo;
    const clickCount = getClickCount();
    let countdown = getCountdown();
    const maxVolume = getMaxVolume();

    renderClickBoxes(clickCount);
    isRunning = true;
    if (startButton) startButton.textContent = "停止";
    if (stopButton) stopButton.textContent = "停止";
    setOperationEnabled(true);

    if (countdown <= 0) {
      updateCountdownDisplay(0);
      setOverlayVisible(false);
      startClickBoxCycle(beatMs);
      return;
    }

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
        startClickBoxCycle(beatMs);
        return;
      }
      updateCountdownDisplay(countdown);
      clickSound(maxVolume / countdown, "A4");
    }, beatMs);
  };

  const togglePlayback = () => {
    if (isRunning) {
      stopPlayback();
      return;
    }
    startPlayback();
  };

  if (startButton) {
    startButton.addEventListener("click", togglePlayback);
  }

  if (stopButton) {
    stopButton.addEventListener("click", togglePlayback);
  }

  if (!startButton) {
    startPlayback();
  }
});
