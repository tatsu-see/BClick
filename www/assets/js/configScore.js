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
  const measuresInput = document.querySelector('input[name="measures"]');

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

  const savedMeasures = store.getScoreMeasures();
  if (measuresInput && savedMeasures) {
    measuresInput.value = savedMeasures.toString();
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
    if (selectedChords.length === 0) {
      const langPrefix = window.LANG_PRE_FIX
        || ((navigator.language || navigator.userLanguage || "").startsWith("ja") ? "ja" : "en");
      const message = langPrefix === "ja"
        ? "使用コードを1つ以上選択してください。"
        : "Please select at least one chord.";
      window.alert(message);
      return;
    }
    store.setScoreChords(selectedChords);

    if (measuresInput) {
      const parsed = Number.parseInt(measuresInput.value, 10);
      if (!Number.isNaN(parsed)) {
        store.setScoreMeasures(parsed);
      }
    }

    window.close();
    if (!window.closed) {
      window.location.href = "/";
    }
  });
});
