document.addEventListener("DOMContentLoaded", () => {
  const showClick = document.getElementById("showClick");
  const countdownText = document.getElementById("countdownText");
  const stopButton = document.getElementById("stop");
  const operation = document.getElementById("operation");
  const countdownOverlay = document.getElementById("countdownOverlay");

  let countdown = parseInt(sessionStorage.getItem("bclick.countdown"), 10);
  if (Number.isNaN(countdown) || countdown < 0) countdown = 0;
  let clickCount = parseInt(sessionStorage.getItem("bclick.clickCount"), 10);
  if (Number.isNaN(clickCount) || clickCount < 0) clickCount = 0;

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

  if (countdown <= 0) {
    updateCountdownDisplay(0);
    setOperationEnabled(true);
    setOverlayVisible(false);
  } else {
    setOperationEnabled(false);
    setOverlayVisible(true);
    updateCountdownDisplay(countdown);

    const timerId = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(timerId);
        updateCountdownDisplay(0);
        setOperationEnabled(true);
        setOverlayVisible(false);
        return;
      }
      updateCountdownDisplay(countdown);
    }, 1000);
  }

  if (showClick) {
    showClick.textContent = "";
    for (let i = 0; i < clickCount; i += 1) {
      const box = document.createElement("div");
      box.className = "clickBox";
      showClick.appendChild(box);
    }
  }
});
