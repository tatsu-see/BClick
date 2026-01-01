document.addEventListener("DOMContentLoaded", () => {
  const showClick = document.getElementById("showClick");
  const stopButton = document.getElementById("stop");
  const operation = document.getElementById("operation");

  let countdown = parseInt(sessionStorage.getItem("bclick.countdown"), 10);
  if (Number.isNaN(countdown) || countdown < 0) countdown = 0;

  const setOperationEnabled = (enabled) => {
    if (stopButton) stopButton.disabled = !enabled;
    if (operation) operation.setAttribute("aria-disabled", String(!enabled));
  };

  const updateDisplay = (seconds) => {
    if (!showClick) return;
    if (seconds > 0) {
      showClick.textContent = `開始まで ${seconds}`;
    } else {
      showClick.textContent = "開始";
    }
  };

  if (countdown <= 0) {
    updateDisplay(0);
    setOperationEnabled(true);
    return;
  }

  setOperationEnabled(false);
  updateDisplay(countdown);

  const timerId = setInterval(() => {
    countdown -= 1;
    if (countdown <= 0) {
      clearInterval(timerId);
      updateDisplay(0);
      setOperationEnabled(true);
      return;
    }
    updateDisplay(countdown);
  }, 1000);
});
