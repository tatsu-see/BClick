import { clickSound, getMaxVolume } from "/assets/lib/Beep.js";

document.addEventListener("DOMContentLoaded", () => {

  // 要素の取得
  const showClick = document.getElementById("showClick");
  const countdownText = document.getElementById("countdownText");
  const stopButton = document.getElementById("stopBtn");
  const operation = document.getElementById("operation");
  const countdownOverlay = document.getElementById("countdownOverlay");

  // 設定値を取得する。
  let countdown = parseInt(sessionStorage.getItem("bclick.countdown"), 10);
  if (Number.isNaN(countdown) || countdown < 0) countdown = 0;
  let clickCount = parseInt(sessionStorage.getItem("bclick.clickCount"), 10);
  if (Number.isNaN(clickCount) || clickCount < 0) clickCount = 0;
  let cycleTimerId = null;
  let stopClickCount = 0;

  // カウントイン画面の表示
  const setOperationEnabled = (enabled) => {
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

  if (showClick) {
    showClick.textContent = "";
    for (let i = 0; i < clickCount; i += 1) {
      const box = document.createElement("div");
      box.className = "clickBox";
      showClick.appendChild(box);
    }
  }

  const startClickBoxCycle = () => {
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
    }, 1000);
  };

  if (stopButton) {
    stopButton.addEventListener("click", () => {
      stopClickCount += 1;
      if (stopClickCount === 1) {
        if (cycleTimerId !== null) {
          clearInterval(cycleTimerId);
          cycleTimerId = null;
        }
      } else {
        window.location.reload();
      }
    });
  }

  // カウントイン画面を表示する。
  if (countdown <= 0) {
    updateCountdownDisplay(0);
    setOperationEnabled(true);
    setOverlayVisible(false);
    startClickBoxCycle();
  } else {
    // カウントダウン開始
    setOperationEnabled(false);
    setOverlayVisible(true);
    updateCountdownDisplay(countdown);
    clickSound();

    // 1 秒ごとにカウントダウンする
    const timerId = setInterval(() => {
      countdown -= 1;

      if (countdown <= 0) {
        clearInterval(timerId);
        updateCountdownDisplay(0);
        setOperationEnabled(true);
        setOverlayVisible(false);
        startClickBoxCycle();
        return;
      }
      updateCountdownDisplay(countdown);
      // カウント中もクリック音を鳴らす。
      clickSound( getMaxVolume() / countdown );
    }, 1000);
  }
});
