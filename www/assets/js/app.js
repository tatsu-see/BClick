
import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
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
});
