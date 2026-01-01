
document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start");
  if (!startButton) return;

  startButton.addEventListener("click", () => {
    const countdownSelect = document.querySelector("#countdown");
    const countdownValue = countdownSelect ? parseInt(countdownSelect.value, 10) : 0;
    sessionStorage.setItem("bclick.countdown", String(Number.isNaN(countdownValue) ? 0 : countdownValue));
    window.location.href = "/click.html";
  });
});
