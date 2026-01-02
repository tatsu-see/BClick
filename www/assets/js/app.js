
import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start");
  if (!startButton) return;

  const store = new ConfigStore();
  const tempoInput = document.getElementById("tempo");
  const clickCountSelect = document.getElementById("clickCount");
  const countdownSelect = document.getElementById("countdown");

  if (tempoInput) {
    store.loadTempoInput(tempoInput);
    tempoInput.addEventListener("change", () => store.saveTempoInput(tempoInput));
  }

  if (clickCountSelect) {
    store.loadClickCountInput(clickCountSelect);
    clickCountSelect.addEventListener("change", () => store.saveClickCountInput(clickCountSelect));
  }

  if (countdownSelect) {
    store.loadCountInSecInput(countdownSelect);
    countdownSelect.addEventListener("change", () => store.saveCountInSecInput(countdownSelect));
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
