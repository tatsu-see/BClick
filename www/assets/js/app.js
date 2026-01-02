
document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start");
  if (!startButton) return;

  const tempoInput = document.getElementById("tempo");
  const clickCountSelect = document.getElementById("clickCount");
  const countdownSelect = document.getElementById("countdown");

  const loadNumber = (key, fallback) => {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    const value = parseInt(stored, 10);
    return Number.isNaN(value) ? fallback : value;
  };

  if (tempoInput) {
    const tempoValue = loadNumber("bclick.tempo", parseInt(tempoInput.value, 10));
    if (!Number.isNaN(tempoValue)) tempoInput.value = String(tempoValue);
    tempoInput.addEventListener("change", () => {
      const value = parseInt(tempoInput.value, 10);
      if (!Number.isNaN(value)) localStorage.setItem("bclick.tempo", String(value));
    });
  }

  if (clickCountSelect) {
    const clickCountValue = loadNumber("bclick.clickCount", parseInt(clickCountSelect.value, 10));
    if (!Number.isNaN(clickCountValue)) clickCountSelect.value = String(clickCountValue);
    clickCountSelect.addEventListener("change", () => {
      const value = parseInt(clickCountSelect.value, 10);
      if (!Number.isNaN(value)) localStorage.setItem("bclick.clickCount", String(value));
    });
  }

  if (countdownSelect) {
    const countdownValue = loadNumber("bclick.countdown", parseInt(countdownSelect.value, 10));
    if (!Number.isNaN(countdownValue)) countdownSelect.value = String(countdownValue);
    countdownSelect.addEventListener("change", () => {
      const value = parseInt(countdownSelect.value, 10);
      if (!Number.isNaN(value)) localStorage.setItem("bclick.countdown", String(value));
    });
  }

  startButton.addEventListener("click", () => {
    const countdownValue = countdownSelect ? parseInt(countdownSelect.value, 10) : 0;
    sessionStorage.setItem("bclick.countdown", String(Number.isNaN(countdownValue) ? 0 : countdownValue));
    const clickCountValue = clickCountSelect ? parseInt(clickCountSelect.value, 10) : 0;
    sessionStorage.setItem("bclick.clickCount", String(Number.isNaN(clickCountValue) ? 0 : clickCountValue));
    const tempoValue = tempoInput ? parseInt(tempoInput.value, 10) : 0;
    sessionStorage.setItem("bclick.tempo", String(Number.isNaN(tempoValue) ? 0 : tempoValue));
    window.location.href = "/click.html";
  });
});
