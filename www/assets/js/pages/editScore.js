/**
 * editScore.js
 * editScore画面の表示・操作を制御するスクリプト
 */

import { ConfigStore } from "../utils/store.js";
import RhythmScore from "../components/RhythmScore.js";
import ScoreData from "../models/ScoreModel.js";
import { TempoDialController } from "../components/tempoDial.js";
import { preloadAlphaTabFonts } from "../utils/scorePdf.js";
import { ensureInAppNavigation, goBackWithFallback } from "../utils/navigationGuard.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  // editMeasure から戻った直後だけ、最後に編集した小節を一時強調表示する。
  const lastEditedBarRaw = sessionStorage.getItem("bclick.lastEditedBarIndex");
  const lastEditedBarIndex = Number.parseInt(lastEditedBarRaw, 10);
  if (Number.isFinite(lastEditedBarIndex) && lastEditedBarIndex >= 0) {
    // Overlay描画時に対象バッジへclassを付与するための共有フラグ。
    window.bclickLastEditedBarIndex = lastEditedBarIndex;
    const clearLastEditedHighlight = () => {
      // 期限が過ぎたらハイライト情報を破棄する。
      window.bclickLastEditedBarIndex = null;
      sessionStorage.removeItem("bclick.lastEditedBarIndex");
      const label = document.querySelector(
        `.scoreChordOverlayLabel[data-bar-index="${lastEditedBarIndex}"]`,
      );
      if (label) {
        label.classList.remove("isLastEdited");
      }
    };
    let highlightAttempts = 0;
    const waitForHighlight = () => {
      // overlay生成タイミングまで待ってからハイライトを適用する。
      highlightAttempts += 1;
      const label = document.querySelector(
        `.scoreChordOverlayLabel[data-bar-index="${lastEditedBarIndex}"]`,
      );
      if (label) {
        window.setTimeout(clearLastEditedHighlight, 3000);
        return;
      }
      if (highlightAttempts >= 180) {
        // 一定時間見つからなければ破棄する。
        clearLastEditedHighlight();
        return;
      }
      window.requestAnimationFrame(waitForHighlight);
    };
    window.requestAnimationFrame(waitForHighlight);
  }

  // PDF/alphaTab用フォントを先に読み込む。
  preloadAlphaTabFonts().catch(() => {
    ;
  });

  // 画面で使うDOM要素の取得
  const store = new ConfigStore();
  const scoreElement = document.getElementById("score");
  const scoreArea = document.getElementById("scoreArea");
  const saveButton = document.getElementById("saveShowScore");
  const backButton = document.getElementById("backShowScore");
  const closePageButton = document.getElementById("closePage");
  const showCodeDiagramButton = document.getElementById("showCodeDiagram");
  const tempoInput = document.getElementById("tempoInput");
  const tempoDialEl = document.getElementById("tempoDial");
  const tempoStepCoarse = document.getElementById("tempoStepCoarse");
  const tempoStepFine = document.getElementById("tempoStepFine");
    const tempoDialToggle = document.getElementById("tempoDialToggle");
    const beatPreference = document.getElementById("beatPreference");
  const barsPerRowRange = document.getElementById("barsPerRowRange");
  const barsPerRowValue = document.getElementById("barsPerRowValue");
  let currentScoreData = null;
  let rhythmScore = null;
  let lastSavedBarsJson = "";

  /**
   * テンポ変更をクリック再生へ通知する。
   * @param {number} value
   */
  const notifyTempoChange = (value) => {
    document.dispatchEvent(new CustomEvent("bclick:tempochange", { detail: { tempo: value } }));
  };

  /**
   * ストアから楽譜設定を読み込んでScoreDataを作る。
   * @param {boolean} resetBars
   * @returns {ScoreData}
   */
  const loadSettings = (resetBars = false) => {
    const savedTempo = store.getTempo();
    const savedTimeSignature = store.getScoreTimeSignature();
    const savedMeasures = store.getScoreMeasures();
    const savedProgression = store.getScoreProgression();
    const savedRhythmPattern = store.getScoreRhythmPattern();
    const savedBarsPerRow = store.getScoreBarsPerRow();
    const savedBars = resetBars ? null : store.getScoreBars();
    return new ScoreData({
      tempo: savedTempo,
      timeSignature: savedTimeSignature || "4/4",
      measures: savedMeasures || 8,
      progression: savedProgression || "",
      rhythmPattern: savedRhythmPattern || null,
      bars: savedBars || null,
      barsPerRow: savedBarsPerRow || 2,
    });
  };

  /**
   * editScore から戻る。
   */
  const closePage = () => {
    goBackWithFallback();
  };

  /**
   * 戻るボタンの処理。(現状は未実装のため空にしておく。)
   */
  const handleBack = () => {
    closePage();
  };

  if (showCodeDiagramButton) {
    showCodeDiagramButton.addEventListener("click", () => {
      window.location.href = "/codeDiagram.html";
    });
  }

  // 初期表示のスコア生成
  const hasSavedBars = Array.isArray(store.getScoreBars());
  currentScoreData = loadSettings(!hasSavedBars);
  if (Array.isArray(currentScoreData.bars)) {
    lastSavedBarsJson = JSON.stringify(currentScoreData.bars);
  }
  if (store.getScoreEnabled() === false) {
    // 仕様: リズム表示がOFFならクリックUIのみ表示し、楽譜エリアは隠す。
    if (scoreArea) {
      scoreArea.hidden = true;
    }
    console.log("楽譜表示がOFFです");
  } else if (scoreElement && window.alphaTab) {
    console.log("alphaTab ロード完了。楽譜を生成します...");
    window.bclickActiveChordIndex = -1;
    rhythmScore = new RhythmScore("score", {
      tempo: store.getTempo(),
      timeSignature: currentScoreData.timeSignature,
      chord: "E",
      measures: currentScoreData.measures,
      progression: currentScoreData.progression,
      bars: currentScoreData.bars,
      barsPerRow: currentScoreData.barsPerRow || 2,
      rhythmPattern: currentScoreData.rhythmPattern,
      onBarsChange: (nextBars, nextMeasures) => {
        store.setScoreBars(nextBars);
        if (currentScoreData) {
          currentScoreData.bars = nextBars;
          currentScoreData.measures = nextMeasures;
        }
      },
    });
    window.bclickRhythmScore = rhythmScore;
    if (Array.isArray(currentScoreData.bars)) {
      window.bclickScoreBarCount = currentScoreData.bars.length;
    }
    //Spec 初回描画直後はズレるため、遅延してオーバーレイを重ね直す
    rhythmScore.requestOverlayRefresh(200);
    console.log("楽譜生成完了。小節数:", currentScoreData.bars?.length || currentScoreData.measures);
  } else {
    console.warn("楽譜生成条件エラー:", {
      scoreElementExists: !!scoreElement,
      alphaTabLoaded: !!window.alphaTab,
      scoreEnabled: store.getScoreEnabled(),
    });
  }

  // テンポ入力・ダイヤルの初期化
  const tempoDial = tempoInput
    ? new TempoDialController({
        inputEl: tempoInput,
        dialEls: [tempoDialEl],
        defaultValue: 60,
        onValueChange: (value) => {
          store.setTempo(value);
          notifyTempoChange(value);
        },
        onValueCommit: (value) => {
          if (rhythmScore) {
            rhythmScore.setTempo(value);
          }
        },
      })
    : null;

  if (tempoDial) {
    const tempoStepButtons = [tempoStepCoarse, tempoStepFine].filter(Boolean);
    const dialLabelEl = tempoDialEl ? tempoDialEl.querySelector(".tempoDialLabel") : null;

    /**
     * ダイヤルのステップ変更を反映する。
     * @param {string} step
     * @param {HTMLElement | null} activeButton
     */
    const setTempoStep = (step, activeButton = null) => {
      if (!tempoDialEl) return;
      const parsedStep = Number.parseInt(step, 10);
      if (Number.isNaN(parsedStep)) return;
      tempoDialEl.dataset.step = parsedStep.toString();
      if (dialLabelEl) {
        dialLabelEl.textContent = parsedStep.toString();
      }
      tempoDialEl.setAttribute("aria-label", `Change tempo by ${parsedStep}`);
      tempoStepButtons.forEach((button) => {
        const isActive = button === activeButton;
        button.classList.toggle("isActive", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    };

    if (tempoStepButtons.length > 0) {
      const activeButton =
        tempoStepButtons.find((button) => button.classList.contains("isActive")) || tempoStepButtons[0];
      setTempoStep(activeButton.dataset.step, activeButton);
      tempoStepButtons.forEach((button) => {
        button.addEventListener("click", () => {
          setTempoStep(button.dataset.step, button);
        });
      });
    }

    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      tempoDial.applyStoredValue(savedTempo);
    } else {
      tempoDial.setValue(tempoDial.clamp(tempoDial.getInputValue()));
    }
    tempoDial.attach();
  }

  // 調節（再生設定）ブロックの表示トグル
  if (tempoDialToggle && beatPreference) {
    const savedTempoDialEnabled = store.getTempoDialEnabled();
    if (savedTempoDialEnabled !== null) {
      tempoDialToggle.checked = savedTempoDialEnabled;
    }
    const applyPreferenceVisibility = () => {
      const shouldShow = tempoDialToggle.checked;
      store.setTempoDialEnabled(shouldShow);
      beatPreference.hidden = !shouldShow;
      beatPreference.style.display = shouldShow ? "" : "none";
      beatPreference.setAttribute("aria-hidden", String(!shouldShow));
    };
    applyPreferenceVisibility();
    tempoDialToggle.addEventListener("change", applyPreferenceVisibility);
    tempoDialToggle.addEventListener("input", applyPreferenceVisibility);
  }

  // 楽譜エリアのスクロールでオーバーレイを更新する
  if (scoreArea && rhythmScore) {
    scoreArea.addEventListener("scroll", () => {
      rhythmScore.handleOverlayRefresh();
    }, { passive: true });
  }

  // 1段あたりの小節数スライダー
  if (barsPerRowRange) {
    const savedBarsPerRow = store.getScoreBarsPerRow();
    const initialBarsPerRow = savedBarsPerRow || 2;
    barsPerRowRange.value = initialBarsPerRow.toString();
    if (barsPerRowValue) {
      barsPerRowValue.textContent = barsPerRowRange.value;
    }
    barsPerRowRange.addEventListener("input", () => {
      if (barsPerRowValue) {
        barsPerRowValue.textContent = barsPerRowRange.value;
      }
      const parsed = Number.parseInt(barsPerRowRange.value, 10);
      if (!Number.isNaN(parsed)) {
        store.setScoreBarsPerRow(parsed);
        if (rhythmScore) {
          rhythmScore.setBarsPerRow(parsed);
          //Spec 小節数レイアウト変更後にオーバーレイを遅延して再描画する
          rhythmScore.requestOverlayRefresh(120);
        }
      }
    });
  }

  /**
   * JSON読込後の画面反映を行う。
   */
  const applyLoadedScoreToUI = () => {
    const nextScoreData = loadSettings(false);
    currentScoreData = nextScoreData;
    if (Array.isArray(nextScoreData.bars)) {
      lastSavedBarsJson = JSON.stringify(nextScoreData.bars);
    }

    if (store.getScoreEnabled() === false) {
      if (scoreArea) {
        scoreArea.hidden = true;
      }
      return;
    }
    if (scoreArea) {
      scoreArea.hidden = false;
    }
    if (rhythmScore) {
      rhythmScore.setTimeSignature(nextScoreData.timeSignature);
      rhythmScore.setMeasures(nextScoreData.measures);
      rhythmScore.setProgression(nextScoreData.progression);
      rhythmScore.setBars(nextScoreData.bars);
      rhythmScore.setBarsPerRow(nextScoreData.barsPerRow || 2);
      rhythmScore.setRhythmPattern(nextScoreData.rhythmPattern);
    } else if (scoreElement && window.alphaTab) {
      window.bclickActiveChordIndex = -1;
      rhythmScore = new RhythmScore("score", {
        tempo: store.getTempo(),
        timeSignature: nextScoreData.timeSignature,
        chord: "E",
        measures: nextScoreData.measures,
        progression: nextScoreData.progression,
        bars: nextScoreData.bars,
        barsPerRow: nextScoreData.barsPerRow || 2,
        rhythmPattern: nextScoreData.rhythmPattern,
        onBarsChange: (nextBars, nextMeasures) => {
          store.setScoreBars(nextBars);
          if (currentScoreData) {
            currentScoreData.bars = nextBars;
            currentScoreData.measures = nextMeasures;
          }
        },
      });
      window.bclickRhythmScore = rhythmScore;
      if (Array.isArray(nextScoreData.bars)) {
        window.bclickScoreBarCount = nextScoreData.bars.length;
      }
      //Spec 楽譜の再生成直後はズレるため、遅延してオーバーレイを重ね直す
      rhythmScore.requestOverlayRefresh(200);
    }

    const savedTempo = store.getTempo();
    if (savedTempo !== null) {
      if (tempoDial) {
        tempoDial.applyStoredValue(savedTempo);
      } else if (tempoInput) {
        tempoInput.value = savedTempo.toString();
      }
      notifyTempoChange(savedTempo);
      if (rhythmScore) {
        rhythmScore.setTempo(savedTempo);
      }
    }

    if (barsPerRowRange) {
      const savedBarsPerRow = store.getScoreBarsPerRow();
      const nextBarsPerRow = savedBarsPerRow || 2;
      barsPerRowRange.value = nextBarsPerRow.toString();
      if (barsPerRowValue) {
        barsPerRowValue.textContent = barsPerRowRange.value;
      }
    }
  };

  document.addEventListener("bclick:scoreloaded", applyLoadedScoreToUI);

  // 別タブでの編集を検知して反映する
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== store.keys.ScoreBars) return;
    const savedBars = store.getScoreBars();
    if (!Array.isArray(savedBars)) return;
    const nextJson = JSON.stringify(savedBars);
    if (nextJson === lastSavedBarsJson) return;
    lastSavedBarsJson = nextJson;
    if (!currentScoreData) return;
    currentScoreData.bars = savedBars;
    if (rhythmScore) {
      rhythmScore.setBars(savedBars);
    }
  });

  // 操作ボタンのイベント
  if (saveButton) {
    saveButton.addEventListener("click", () => {
      if (currentScoreData) {
        const latestBars = store.getScoreBars();
        const barsToSave = Array.isArray(latestBars) ? latestBars : currentScoreData.bars;
        store.setScoreBars(barsToSave);
      }
      closePage();
    });
  }

  if (backButton) {
    backButton.addEventListener("click", handleBack);
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", closePage);
  }
});
