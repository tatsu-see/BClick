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
import { showMessage } from "../../lib/ShowMessageBox.js";
import { getLangMsg } from "../../lib/Language.js";
import {
  clearEditScoreDraft,
  loadEditScoreDraft,
  saveEditScoreDraft,
} from "../utils/editScoreDraft.js";
import { RecordingManager } from "../utils/recordingManager.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  let overlayScrollTimerId = null;
  //Spec editMeasureから戻った直後に編集した小節番号が見えるよう、オーバーレイ位置でスクロールする
  /**
   * 編集した小節のオーバーレイ位置へスクロールする。
   * @param {number} attempt
   */
  const scrollToEditedBarByOverlay = (attempt = 0) => {
    const lastEditedRaw = sessionStorage.getItem("bclick.lastEditedBarIndex");
    const barIndex = Number.parseInt(lastEditedRaw, 10);
    if (!Number.isFinite(barIndex) || barIndex < 0) return;
    const scoreArea = document.getElementById("scoreArea");
    if (!scoreArea) return;
    const target = document.querySelector(
      `.scoreChordOverlayLabel[data-bar-index="${barIndex}"]`,
    );
    if (!target) return false;
    const containerRect = scoreArea.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top + scoreArea.scrollTop;
    const centered = offset - (scoreArea.clientHeight - targetRect.height) / 2;
    const maxScroll = scoreArea.scrollHeight - scoreArea.clientHeight;
    const clamped = Math.max(0, Math.min(centered, maxScroll));
    scoreArea.scrollTo({ top: clamped, behavior: "auto" });
    return true;
  };

  //Spec 描画タイミング差に備えて200msごとに最大15回スクロールを試す（誤削除防止）
  /**
   * editMeasure から戻った直後だけ、200msごとに最大15回スクロールを試す。
   */
  const scheduleScrollToEditedBar = () => {
    if (overlayScrollTimerId !== null) return;
    if (!sessionStorage.getItem("bclick.lastEditedBarIndex")) return;
    let retryCount = 0;
    const tryScroll = () => {
      retryCount += 1;
      const done = scrollToEditedBarByOverlay();
      if (done || retryCount >= 15) {
        overlayScrollTimerId = null;
        return;
      }
      overlayScrollTimerId = window.setTimeout(tryScroll, 200);
    };
    overlayScrollTimerId = window.setTimeout(tryScroll, 200);
  };

  let lastEditedHighlightTimerId = null;
  let lastEditedHighlightRunId = 0;
  //Spec editMeasureから戻った直後の強調表示は復帰経路によって再実行が必要（誤削除防止）
  // editMeasure から戻った直後だけ、最後に編集した小節を一時強調表示する。
  const applyLastEditedHighlight = () => {
    const lastEditedBarRaw = sessionStorage.getItem("bclick.lastEditedBarIndex");
    const lastEditedBarIndex = Number.parseInt(lastEditedBarRaw, 10);
    if (!Number.isFinite(lastEditedBarIndex) || lastEditedBarIndex < 0) return;
    // Overlay描画時に対象バッジへclassを付与するための共有フラグ。
    window.bclickLastEditedBarIndex = lastEditedBarIndex;
    const runId = lastEditedHighlightRunId + 1;
    lastEditedHighlightRunId = runId;
    if (lastEditedHighlightTimerId) {
      window.clearTimeout(lastEditedHighlightTimerId);
      lastEditedHighlightTimerId = null;
    }
    const clearLastEditedHighlight = () => {
      // 期限が過ぎたらハイライト情報を破棄する。
      if (lastEditedHighlightRunId !== runId) return;
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
      if (lastEditedHighlightRunId !== runId) return;
      highlightAttempts += 1;
      const label = document.querySelector(
        `.scoreChordOverlayLabel[data-bar-index="${lastEditedBarIndex}"]`,
      );
      if (label) {
        lastEditedHighlightTimerId = window.setTimeout(clearLastEditedHighlight, 3000);
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
    scheduleScrollToEditedBar();
  };

  applyLastEditedHighlight();

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
    const beatPreference = document.getElementById("editScorePreference");
  const barsPerRowRange = document.getElementById("barsPerRowRange");
  const barsPerRowValue = document.getElementById("barsPerRowValue");
  const editScoreConfigBeat = document.getElementById("editScoreConfigBeat");
  const editScoreConfigBeatButton = document.getElementById("editScoreConfigBeatButton");
  const editScorePreferenceSummery = document.getElementById("editScorePreferenceSummery");
  const editScoreBarsPerRow = document.getElementById("editScoreBarsPerRow");
  let currentScoreData = null;
  let rhythmScore = null;
  let editDraft = null;

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
    const savedClickCount = store.getClickCount();
    const savedCountIn = store.getCountInSec();
    const savedTimeSignature = store.getScoreTimeSignature();
    const savedMeasures = store.getScoreMeasures();
    const savedProgression = store.getScoreProgression();
    const savedRhythmPattern = store.getScoreRhythmPattern();
    const savedBarsPerRow = store.getScoreBarsPerRow();
    const savedBars = resetBars ? null : store.getScoreBars();
    const savedScoreEnabled = store.getScoreEnabled();
    const savedClickTonePattern = store.getClickTonePattern(savedClickCount);
    return new ScoreData({
      tempo: savedTempo,
      clickCount: savedClickCount,
      countIn: savedCountIn,
      timeSignature: savedTimeSignature || "4/4",
      measures: savedMeasures || 8,
      progression: savedProgression || "",
      rhythmPattern: savedRhythmPattern || null,
      bars: savedBars || null,
      barsPerRow: savedBarsPerRow || 2,
      scoreEnabled: typeof savedScoreEnabled === "boolean" ? savedScoreEnabled : true,
      clickTonePattern: savedClickTonePattern,
    });
  };

  /**
   * 小節配列をドラフト保存用に複製する。
   * @param {object[] | null} bars
   * @returns {object[] | null}
   */
  const cloneBars = (bars) => {
    if (!Array.isArray(bars)) return null;
    return bars.map((bar) => ({
      chord: Array.isArray(bar?.chord)
        ? bar.chord.map((row) => (Array.isArray(row) ? row.slice() : []))
        : [],
      rhythm: Array.isArray(bar?.rhythm) ? bar.rhythm.slice() : [],
    }));
  };

  /**
   * 現在の編集内容を一時ドラフトへ保存する。
   */
  const syncDraftFromCurrent = () => {
    if (!currentScoreData) return;
    editDraft = {
      tempo: currentScoreData.tempo,
      clickCount: currentScoreData.clickCount,
      countIn: currentScoreData.countIn,
      timeSignature: currentScoreData.timeSignature,
      measures: currentScoreData.measures,
      progression: currentScoreData.progression,
      rhythmPattern: Array.isArray(currentScoreData.rhythmPattern)
        ? currentScoreData.rhythmPattern.slice()
        : null,
      bars: cloneBars(currentScoreData.bars),
      barsPerRow: currentScoreData.barsPerRow || 2,
      scoreEnabled: currentScoreData.scoreEnabled,
      clickTonePattern: Array.isArray(currentScoreData.clickTonePattern)
        ? currentScoreData.clickTonePattern.slice()
        : null,
    };
    saveEditScoreDraft(editDraft);
    updateBeatSummary();
  };

  /**
   * テンポ・クリック数・カウントインの現在値をサマリーエリアに表示する。
   */
  const updateBeatSummary = () => {
    if (!editScoreConfigBeat) return;
    const tempo = currentScoreData?.tempo ?? store.getTempo() ?? 60;
    const clickCount = currentScoreData?.clickCount ?? store.getClickCount() ?? 4;
    const countIn = currentScoreData?.countIn ?? store.getCountInSec() ?? 4;
    editScoreConfigBeat.textContent = getLangMsg(
      `BPM ${tempo}、クリック数 ${clickCount}、カウントイン ${countIn}`,
      `BPM ${tempo}, Clicks ${clickCount}, Count-in ${countIn}`,
    );
  };

  /**
   * editScore から戻る。
   */
  const closePage = () => {
    goBackWithFallback();
  };

  /**
   * 戻るボタンの処理。
   */
  const handleBack = () => {
    clearEditScoreDraft();
    closePage();
  };

  /**
   * 現在の編集内容を永続保存する。
   * @returns {boolean}
   */
  const persistCurrentScore = () => {
    if (!currentScoreData) return false;
    const barsToSave = Array.isArray(currentScoreData.bars) ? currentScoreData.bars : [];
    const measuresToSave = barsToSave.length > 0 ? barsToSave.length : currentScoreData.measures;
    store.setTempo(currentScoreData.tempo);
    store.setClickCount(currentScoreData.clickCount);
    store.setCountInSec(currentScoreData.countIn);
    store.setScoreTimeSignature(currentScoreData.timeSignature);
    store.setScoreProgression(currentScoreData.progression);
    if (Array.isArray(currentScoreData.rhythmPattern)) {
      store.setScoreRhythmPattern(currentScoreData.rhythmPattern);
    }
    store.setScoreBarsPerRow(currentScoreData.barsPerRow || 2);
    store.setScoreBars(barsToSave);
    store.setScoreMeasures(measuresToSave);
    store.setScoreEnabled(currentScoreData.scoreEnabled);
    if (Array.isArray(currentScoreData.clickTonePattern)) {
      store.setClickTonePattern(currentScoreData.clickTonePattern, currentScoreData.clickCount);
    }
    if (tempoDialToggle) {
      store.setEditScoreSettingsEnabled(Boolean(tempoDialToggle.checked));
    }
    // 保存後も編集継続できるよう、ドラフトは現在値で同期して残す。
    syncDraftFromCurrent();
    return true;
  };

  if (showCodeDiagramButton) {
    showCodeDiagramButton.addEventListener("click", () => {
      window.location.href = "codeDiagram.html";
    });
  }

  // 初期表示のスコア生成
  const loadedDraft = loadEditScoreDraft();
  if (loadedDraft) {
    editDraft = loadedDraft;
    currentScoreData = new ScoreData({
      tempo: loadedDraft.tempo,
      clickCount: loadedDraft.clickCount,
      countIn: loadedDraft.countIn,
      timeSignature: loadedDraft.timeSignature || "4/4",
      measures: loadedDraft.measures || 8,
      progression: loadedDraft.progression || "",
      rhythmPattern: Array.isArray(loadedDraft.rhythmPattern) ? loadedDraft.rhythmPattern : null,
      bars: Array.isArray(loadedDraft.bars) ? loadedDraft.bars : null,
      barsPerRow: loadedDraft.barsPerRow || 2,
      scoreEnabled: loadedDraft.scoreEnabled,
      clickTonePattern: Array.isArray(loadedDraft.clickTonePattern) ? loadedDraft.clickTonePattern : null,
    });
  } else {
    const hasSavedBars = Array.isArray(store.getScoreBars());
    currentScoreData = loadSettings(!hasSavedBars);
    syncDraftFromCurrent();
  }
  if (currentScoreData.scoreEnabled === false) {
    // 仕様: リズム表示がOFFならクリックUIのみ表示し、楽譜エリアは隠す。
    if (scoreArea) {
      scoreArea.hidden = true;
    }
    console.log("楽譜表示がOFFです");
  } else if (scoreElement && window.alphaTab) {
    console.log("alphaTab ロード完了。楽譜を生成します...");
    window.bclickActiveChordIndex = -1;
    rhythmScore = new RhythmScore("score", {
      tempo: currentScoreData.tempo,
      timeSignature: currentScoreData.timeSignature,
      chord: "E",
      measures: currentScoreData.measures,
      progression: currentScoreData.progression,
      bars: currentScoreData.bars,
      barsPerRow: currentScoreData.barsPerRow || 2,
      rhythmPattern: currentScoreData.rhythmPattern,
      onBarsChange: (nextBars, nextMeasures) => {
        if (currentScoreData) {
          currentScoreData.bars = nextBars;
          currentScoreData.measures = nextMeasures;
          syncDraftFromCurrent();
        }
      },
    });
    window.bclickRhythmScore = rhythmScore;
    if (Array.isArray(currentScoreData.bars)) {
      window.bclickScoreBarCount = currentScoreData.bars.length;
    }
    //Spec 初回描画直後はズレるため、遅延してオーバーレイを重ね直す
    rhythmScore.requestOverlayRefresh(200);
    scheduleScrollToEditedBar();
    console.log("楽譜生成完了。小節数:", currentScoreData.bars?.length || currentScoreData.measures);
  } else {
    console.warn("楽譜生成条件エラー:", {
      scoreElementExists: !!scoreElement,
      alphaTabLoaded: !!window.alphaTab,
      scoreEnabled: currentScoreData.scoreEnabled,
    });
  }

  // テンポ入力・ダイヤルの初期化
  const tempoDial = tempoInput
    ? new TempoDialController({
        inputEl: tempoInput,
        dialEls: [tempoDialEl],
        defaultValue: 60,
        onValueChange: (value) => {
          if (currentScoreData) {
            currentScoreData.tempo = value;
          }
          syncDraftFromCurrent();
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

    const savedTempo = Number.isFinite(editDraft?.tempo) ? editDraft.tempo : store.getTempo();
    if (savedTempo !== null) {
      tempoDial.applyStoredValue(savedTempo);
    } else {
      tempoDial.setValue(tempoDial.clamp(tempoDial.getInputValue()));
    }
    tempoDial.attach();
  }

  // 調節（再生設定）ブロックの表示トグル
  if (tempoDialToggle && beatPreference) {
    const savedTempoDialEnabled = store.getEditScoreSettingsEnabled();
    if (savedTempoDialEnabled !== null) {
      tempoDialToggle.checked = savedTempoDialEnabled;
    }
    const applyPreferenceVisibility = () => {
      const shouldShow = tempoDialToggle.checked;
      beatPreference.hidden = !shouldShow;
      beatPreference.style.display = shouldShow ? "" : "none";
      beatPreference.setAttribute("aria-hidden", String(!shouldShow));
      if (editScorePreferenceSummery) {
        editScorePreferenceSummery.hidden = !shouldShow;
        editScorePreferenceSummery.style.display = shouldShow ? "" : "none";
        editScorePreferenceSummery.setAttribute("aria-hidden", String(!shouldShow));
      }
      if (editScoreBarsPerRow) {
        editScoreBarsPerRow.hidden = !shouldShow;
        editScoreBarsPerRow.style.display = shouldShow ? "" : "none";
        editScoreBarsPerRow.setAttribute("aria-hidden", String(!shouldShow));
      }
      store.setEditScoreSettingsEnabled(shouldShow);
      syncDraftFromCurrent();
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
    const savedBarsPerRow = Number.isFinite(editDraft?.barsPerRow)
      ? editDraft.barsPerRow
      : store.getScoreBarsPerRow();
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
        if (currentScoreData) {
          currentScoreData.barsPerRow = parsed;
        }
        syncDraftFromCurrent();
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
  let lastAppliedKey = null;
  /**
   * 反映済みデータかどうかを判定するためのキーを作る。
   * @param {ScoreData} data
   * @returns {string}
   */
  const buildApplyKey = (data) => {
    const safeBars = Array.isArray(data?.bars) ? data.bars : [];
    const safeRhythm = Array.isArray(data?.rhythmPattern) ? data.rhythmPattern : [];
    return JSON.stringify({
      tempo: data?.tempo,
      clickCount: data?.clickCount,
      countIn: data?.countIn,
      timeSignature: data?.timeSignature,
      measures: data?.measures,
      progression: data?.progression,
      barsPerRow: data?.barsPerRow,
      scoreEnabled: data?.scoreEnabled,
      rhythmPattern: safeRhythm,
      bars: safeBars,
      clickTonePattern: Array.isArray(data?.clickTonePattern) ? data.clickTonePattern : [],
    });
  };

  const applyLoadedScoreToUI = () => {
    const nextDraft = loadEditScoreDraft();
    if (nextDraft && typeof nextDraft === "object") {
      editDraft = nextDraft;
    }
    const nextScoreData = nextDraft
      ? new ScoreData({
          tempo: nextDraft.tempo,
          clickCount: nextDraft.clickCount,
          countIn: nextDraft.countIn,
          timeSignature: nextDraft.timeSignature || "4/4",
          measures: nextDraft.measures || 8,
          progression: nextDraft.progression || "",
          rhythmPattern: Array.isArray(nextDraft.rhythmPattern) ? nextDraft.rhythmPattern : null,
          bars: Array.isArray(nextDraft.bars) ? nextDraft.bars : null,
          barsPerRow: nextDraft.barsPerRow || 2,
          scoreEnabled: nextDraft.scoreEnabled,
          clickTonePattern: Array.isArray(nextDraft.clickTonePattern) ? nextDraft.clickTonePattern : null,
        })
      : loadSettings(false);
    const nextApplyKey = buildApplyKey(nextScoreData);
    if (nextApplyKey === lastAppliedKey) {
      return;
    }
    lastAppliedKey = nextApplyKey;
    currentScoreData = nextScoreData;
    if (nextScoreData.scoreEnabled === false) {
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
      scheduleScrollToEditedBar();
    } else if (scoreElement && window.alphaTab) {
      window.bclickActiveChordIndex = -1;
      rhythmScore = new RhythmScore("score", {
        tempo: nextScoreData.tempo,
        timeSignature: nextScoreData.timeSignature,
        chord: "E",
        measures: nextScoreData.measures,
        progression: nextScoreData.progression,
        bars: nextScoreData.bars,
        barsPerRow: nextScoreData.barsPerRow || 2,
        rhythmPattern: nextScoreData.rhythmPattern,
        onBarsChange: (nextBars, nextMeasures) => {
          if (currentScoreData) {
            currentScoreData.bars = nextBars;
            currentScoreData.measures = nextMeasures;
            syncDraftFromCurrent();
          }
        },
      });
      window.bclickRhythmScore = rhythmScore;
      if (Array.isArray(nextScoreData.bars)) {
        window.bclickScoreBarCount = nextScoreData.bars.length;
      }
      //Spec 楽譜の再生成直後はズレるため、遅延してオーバーレイを重ね直す
      rhythmScore.requestOverlayRefresh(200);
      scheduleScrollToEditedBar();
    }

    const savedTempo = Number.isFinite(nextScoreData.tempo) ? nextScoreData.tempo : null;
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
      const savedBarsPerRow = nextScoreData.barsPerRow;
      const nextBarsPerRow = savedBarsPerRow || 2;
      barsPerRowRange.value = nextBarsPerRow.toString();
      if (barsPerRowValue) {
        barsPerRowValue.textContent = barsPerRowRange.value;
      }
    }
    applyLastEditedHighlight();
    updateBeatSummary();
  };

  document.addEventListener("bclick:scoreloaded", applyLoadedScoreToUI);

  // 再描画の多重発火を防ぐために短いデバウンスを入れる。
  let reloadTimer = null;
  const requestApplyLoadedScore = () => {
    if (reloadTimer) {
      window.clearTimeout(reloadTimer);
    }
    reloadTimer = window.setTimeout(() => {
      reloadTimer = null;
      applyLoadedScoreToUI();
    }, 150);
  };

  /**
   * editMeasure から戻った時だけ再描画するためのフラグを消費する。
   * @returns {boolean}
   */
  const consumeEditMeasureRefreshFlag = () => {
    const flag = sessionStorage.getItem("bclick.needsScoreRefresh");
    if (!flag) return false;
    sessionStorage.removeItem("bclick.needsScoreRefresh");
    return true;
  };

  // モバイルの履歴復帰やタブ復帰で再描画されないケースに備えて再適用する。
  window.addEventListener("pageshow", () => {
    if (consumeEditMeasureRefreshFlag()) {
      requestApplyLoadedScore();
    }
    applyLastEditedHighlight();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (consumeEditMeasureRefreshFlag()) {
        requestApplyLoadedScore();
      }
      applyLastEditedHighlight();
    }
  });

  window.addEventListener("focus", () => {
    if (consumeEditMeasureRefreshFlag()) {
      requestApplyLoadedScore();
    }
    applyLastEditedHighlight();
  });

  // 操作ボタンのイベント
  if (editScoreConfigBeatButton) {
    editScoreConfigBeatButton.addEventListener("click", () => {
      sessionStorage.setItem("bclick.configBeat.fromEditScore", "1");
      window.location.href = "configBeat.html";
    });
  }

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      const saved = persistCurrentScore();
      if (saved) {
        showMessage("saveScoreMessage", 2000);
      }
    });
  }

  if (backButton) {
    backButton.addEventListener("click", handleBack);
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", closePage);
  }

  // ─── 再生モード制御（プルダウン + 録音連携） ─────────────────

  const playModeSelect = document.getElementById("playModeSelect");
  const playModeSelectLabel = document.getElementById("playModeSelectLabel");
  const recordingManager = new RecordingManager();

  // ●Rec モードの自動停止タイマー ID
  let recAutoStopTimerId = null;

  /**
   * 再生モードプルダウンの表示ラベルを更新する。
   * "●Rec" 選択時は "●" を赤くする。
   * @param {string} value - "normal" | "rec" | "recplay"
   */
  const updatePlayModeLabel = (value) => {
    if (!playModeSelectLabel) return;
    if (value === "rec") {
      playModeSelectLabel.innerHTML = '<span style="color:red">●</span>Rec';
    } else if (value === "recplay") {
      playModeSelectLabel.textContent = "Rec▶";
    } else {
      playModeSelectLabel.textContent = "ー";
    }
  };

  /**
   * 録音データの有無に応じて Rec▶ オプションの有効/無効を切り替える。
   * 録音データが無い場合に Rec▶ が選択されていたら ー に戻す。
   */
  const updateRecPlayableState = async () => {
    if (!playModeSelect) return;
    const recplayOption = playModeSelect.querySelector("option[value='recplay']");
    if (!recplayOption) return;
    const has = await recordingManager.hasRecording();
    recplayOption.disabled = !has;
    if (playModeSelect.value === "recplay" && !has) {
      playModeSelect.value = "normal";
      updatePlayModeLabel("normal");
    }
  };

  /**
   * ●Rec モードの自動停止タイマーをクリアする。
   */
  const clearRecAutoStop = () => {
    if (recAutoStopTimerId !== null) {
      window.clearTimeout(recAutoStopTimerId);
      recAutoStopTimerId = null;
    }
  };

  // 初期化: ラベル同期 と Rec▶ の有効/無効を反映する
  updatePlayModeLabel(playModeSelect?.value ?? "normal");
  void updateRecPlayableState();

  // プルダウン変更時にラベルを更新し、モードに応じた事前準備を行う
  if (playModeSelect) {
    playModeSelect.addEventListener("change", () => {
      const newValue = playModeSelect.value;
      updatePlayModeLabel(newValue);
      if (newValue === "rec") {
        // ●Rec モード: マイクを事前取得して録音開始遅延を最小化する
        void recordingManager.prewarmMic().catch((err) => {
          console.error("マイクの事前取得に失敗しました:", err);
        });
      } else {
        // ●Rec モード以外: 事前取得済みマイクを解放する（不要なら no-op）
        recordingManager.releasePrewarmMic();
      }
      if (newValue === "recplay") {
        // Rec▶ モード: AudioBuffer を事前デコードして再生開始遅延を最小化する
        void recordingManager.prepareBuffer();
      }
    });
  }

  // クリックサイクルが実際に開始したとき（カウントイン終了後）
  document.addEventListener("bclick:clickcyclestarted", (e) => {
    const { beatMs, beatCount } = e.detail ?? {};
    const mode = playModeSelect?.value ?? "normal";
    clearRecAutoStop();

    if (mode === "rec") {
      // カウントイン終了後にマイク録音を開始する
      void recordingManager.startRecording().catch((err) => {
        console.error("録音開始に失敗しました:", err);
        // 録音に失敗した場合はクリックを強制停止する
        document.dispatchEvent(new CustomEvent("bclick:forceReset"));
      });
      // 楽譜 1 周分の時間が経過したら自動停止する
      const barCount =
        Number.isFinite(window.bclickScoreBarCount) && window.bclickScoreBarCount > 0
          ? window.bclickScoreBarCount
          : null;
      if (barCount && beatMs > 0 && beatCount > 0) {
        const totalMs = barCount * beatCount * beatMs;
        recAutoStopTimerId = window.setTimeout(async () => {
          recAutoStopTimerId = null;
          await recordingManager.stopRecording();
          await updateRecPlayableState();
          document.dispatchEvent(new CustomEvent("bclick:forceReset"));
        }, totalMs);
      }
    } else if (mode === "recplay") {
      // 録音データをクリックと同期して再生する（ループはイベント駆動で制御）
      void recordingManager.startPlayback(false).catch((err) => {
        console.error("録音再生に失敗しました:", err);
      });
    }
  });

  // 楽譜が1周してbeat 0に戻ったとき（録音再生の再同期）
  document.addEventListener("bclick:clickscorelooprestarted", () => {
    const mode = playModeSelect?.value ?? "normal";
    if (mode === "recplay") {
      // 先頭から再生し直すことで setInterval のドリフトをリセットする
      recordingManager.restartPlayback();
    }
  });

  // クリックが一時停止したとき
  document.addEventListener("bclick:clickpaused", () => {
    const mode = playModeSelect?.value ?? "normal";
    clearRecAutoStop();
    if (mode === "rec") {
      // ●Rec モード: Stop = 完全停止。録音を保存してクリックを強制リセットする
      void recordingManager.stopRecording().then(() => void updateRecPlayableState());
      document.dispatchEvent(new CustomEvent("bclick:forceReset"));
    } else if (mode === "recplay") {
      // Rec▶ モード: Stop = 一時停止
      recordingManager.pausePlayback();
    }
  });

  // クリックが完全リセットされたとき
  document.addEventListener("bclick:clickreset", () => {
    const mode = playModeSelect?.value ?? "normal";
    clearRecAutoStop();
    if (mode === "rec") {
      // ●Rec モード: 録音中ならば停止して保存する（自動停止以外のリセット時）
      if (recordingManager.isRecording()) {
        void recordingManager.stopRecording().then(() => void updateRecPlayableState());
      }
    } else if (mode === "recplay") {
      // Rec▶ モード: 録音再生を完全停止する
      recordingManager.stopPlayback();
    }
  });

  // 一時停止から再開したとき
  document.addEventListener("bclick:clickresumed", () => {
    const mode = playModeSelect?.value ?? "normal";
    if (mode === "recplay") {
      recordingManager.resumePlayback();
    }
  });
});
