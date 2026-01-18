import { ConfigStore } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  const store = new ConfigStore();
  const saveButton = document.getElementById("saveConfigScore");

  const timeSignatureInputs = Array.from(
    document.querySelectorAll('input[name="timeSignature"]'),
  );
  const chordButtons = Array.from(
    document.querySelectorAll(".chipButton"),
  );
  const majorChordSection = document.getElementById("majorChordSection");
  const minorChordSection = document.getElementById("minorChordSection");
  const toggleMajorChords = document.getElementById("toggleMajorChords");
  const toggleMinorChords = document.getElementById("toggleMinorChords");
  const rhythmBeatList = document.getElementById("rhythmBeatList");
  const rhythmBeatTemplate = document.getElementById("rhythmBeatTemplate");
  const codeProgressionInput = document.getElementById("codeProgression");
  const closePageButton = document.getElementById("closePage");
  const backProgressionButton = document.getElementById("backCodeProgression");
  const clearProgressionButton = document.getElementById("clearCodeProgression");
  const addRandom3ChordsButton = document.getElementById("addRandom3Chords");
  const addRandom4ChordsButton = document.getElementById("addRandom4Chords");
  const measuresRange = document.getElementById("measuresRange");
  const measuresValue = document.getElementById("measuresValue");

  const savedTimeSignature = store.getScoreTimeSignature();
  if (savedTimeSignature) {
    timeSignatureInputs.forEach((input) => {
      input.checked = input.value === savedTimeSignature;
    });
  }

  const savedProgression = store.getScoreProgression();
  if (codeProgressionInput && typeof savedProgression === "string") {
    codeProgressionInput.value = savedProgression;
  }

  const savedBeatPatterns = store.getScoreBeatPatterns();
  let selectedBeatPatterns = Array.isArray(savedBeatPatterns) ? savedBeatPatterns.slice() : [];

  const getBeatCount = () => {
    const selected = timeSignatureInputs.find((input) => input.checked)?.value || "4/4";
    const [numeratorRaw] = selected.split("/");
    const numerator = Number.parseInt(numeratorRaw, 10);
    return Number.isNaN(numerator) || numerator <= 0 ? 4 : numerator;
  };

  chordButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!codeProgressionInput) return;
      const chord = button.dataset.chord || button.textContent.trim();
      if (!chord) return;
      const prefix = codeProgressionInput.value.length > 0 ? " " : "";
      codeProgressionInput.value += `${prefix}${chord}`;
    });
  });

  const updateChordSections = () => {
    if (!toggleMajorChords || !toggleMinorChords) return;
    if (!toggleMajorChords.checked && !toggleMinorChords.checked) {
      toggleMajorChords.checked = true;
    }
    if (majorChordSection) {
      majorChordSection.classList.toggle("isHidden", !toggleMajorChords.checked);
    }
    if (minorChordSection) {
      minorChordSection.classList.toggle("isHidden", !toggleMinorChords.checked);
    }
  };

  if (toggleMajorChords) {
    toggleMajorChords.addEventListener("change", updateChordSections);
  }

  if (toggleMinorChords) {
    toggleMinorChords.addEventListener("change", updateChordSections);
  }

  updateChordSections();

  const renderBeatSelectors = () => {
    if (!rhythmBeatList || !rhythmBeatTemplate) return;
    const beatCount = getBeatCount();
    if (selectedBeatPatterns.length < beatCount) {
      selectedBeatPatterns = selectedBeatPatterns.concat(
        Array.from({ length: beatCount - selectedBeatPatterns.length }, () => "quarter"),
      );
    } else if (selectedBeatPatterns.length > beatCount) {
      selectedBeatPatterns = selectedBeatPatterns.slice(0, beatCount);
    }

    rhythmBeatList.textContent = "";
    for (let i = 0; i < beatCount; i += 1) {
      const fragment = rhythmBeatTemplate.content.cloneNode(true);
      const label = fragment.querySelector(".rhythmBeatLabel");
      const select = fragment.querySelector(".rhythmBeatSelect");
      if (!label || !select) continue;
      label.textContent = `${i + 1}`;
      const selectedValue = selectedBeatPatterns[i] || "quarter";
      Array.from(select.options).forEach((option) => {
        option.selected = option.value === selectedValue;
      });
      select.addEventListener("change", () => {
        selectedBeatPatterns[i] = select.value;
      });
      rhythmBeatList.appendChild(fragment);
    }
  };

  timeSignatureInputs.forEach((input) => {
    input.addEventListener("change", renderBeatSelectors);
  });

  renderBeatSelectors();

  if (clearProgressionButton) {
    clearProgressionButton.addEventListener("click", () => {
      if (!codeProgressionInput) return;
      codeProgressionInput.value = "";
      codeProgressionInput.focus();
    });
  }

  if (backProgressionButton) {
    backProgressionButton.addEventListener("click", () => {
      if (!codeProgressionInput) return;
      const parts = codeProgressionInput.value.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return;
      parts.pop();
      codeProgressionInput.value = parts.join(" ");
      codeProgressionInput.focus();
    });
  }

  const appendRandomChords = (count) => {
    if (!codeProgressionInput) return;
    const pool = chordButtons
      .map((button) => (button.dataset.chord || button.textContent || "").trim())
      .filter((chord) => chord.length > 0);
    if (pool.length === 0) return;
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(count, shuffled.length));
    const prefix = codeProgressionInput.value.length > 0 ? " " : "";
    codeProgressionInput.value += `${prefix}${picks.join(" ")}`;
    codeProgressionInput.focus();
  };

  if (addRandom3ChordsButton) {
    addRandom3ChordsButton.addEventListener("click", () => {
      appendRandomChords(3);
    });
  }

  if (addRandom4ChordsButton) {
    addRandom4ChordsButton.addEventListener("click", () => {
      appendRandomChords(4);
    });
  }

  const savedMeasures = store.getScoreMeasures();
  if (measuresRange) {
    if (savedMeasures !== null) {
      measuresRange.value = savedMeasures.toString();
    }
    if (measuresValue) {
      measuresValue.textContent = measuresRange.value;
    }
    measuresRange.addEventListener("input", () => {
      if (measuresValue) {
        measuresValue.textContent = measuresRange.value;
      }
    });
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }

  if (!saveButton) return;
  saveButton.addEventListener("click", () => {
    // OKボタンで、現在の設定を保存してトップへ戻る。
    try {
      const selectedTimeSignature = timeSignatureInputs.find((input) => input.checked)?.value;
      if (selectedTimeSignature) {
        store.setScoreTimeSignature(selectedTimeSignature);
      }
      if (selectedBeatPatterns.length > 0) {
        store.setScoreBeatPatterns(selectedBeatPatterns);
      }

      const progressionRaw = codeProgressionInput ? codeProgressionInput.value : "";
      const trimmedProgression = progressionRaw.trim();
      if (trimmedProgression.length === 0) {
        const langPrefix = window.LANG_PRE_FIX
          || ((navigator.language || navigator.userLanguage || "").startsWith("ja") ? "ja" : "en");
        const message = langPrefix === "ja"
          ? "コード進行を1つ以上入力してください。"
          : "Please enter at least one chord.";
        window.alert(message);
        return;
      }
      store.setScoreProgression(trimmedProgression);

      if (measuresRange) {
        const parsed = Number.parseInt(measuresRange.value, 10);
        if (!Number.isNaN(parsed)) {
          store.setScoreMeasures(parsed);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`configScore: OK保存中にエラーが発生しました。 ${message}`, error);
      window.alert(`保存に失敗しました: ${message}`);
      return;
    }

    window.close();
    if (!window.closed) {
      window.location.href = "/";
    }
  });
});
