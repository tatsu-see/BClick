import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const saveButton = document.getElementById("saveConfigScore");

  const timeSignatureInputs = Array.from(
    document.querySelectorAll('input[name="timeSignature"]'),
  );
  const chordInputs = Array.from(
    document.querySelectorAll('input[name="chord"]'),
  );

  const savedTimeSignature = store.getScoreTimeSignature();
  if (savedTimeSignature) {
    timeSignatureInputs.forEach((input) => {
      input.checked = input.value === savedTimeSignature;
    });
  }

  const savedChords = store.getScoreChords();
  if (savedChords.length > 0) {
    chordInputs.forEach((input) => {
      input.checked = savedChords.includes(input.value);
    });
  }

  if (!saveButton) return;
  saveButton.addEventListener("click", () => {
    const selectedTimeSignature = timeSignatureInputs.find((input) => input.checked)?.value;
    if (selectedTimeSignature) {
      store.setScoreTimeSignature(selectedTimeSignature);
    }

    const selectedChords = chordInputs
      .filter((input) => input.checked)
      .map((input) => input.value);
    store.setScoreChords(selectedChords);

    window.close();
    if (!window.closed) {
      window.location.href = "/";
    }
  });
});
