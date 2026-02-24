// click.js
// クリック再生画面の音再生制御とUI同期を行う。
import { clickSound, getMaxVolume, restoreAudioContext } from "../../lib/Sound.js";
import { chordPool } from "../../lib/guiterCode.js";
import { ConfigStore } from "../utils/store.js";
import { getLangMsg } from "../../lib/Language.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM要素の取得
  const showClick = document.getElementById("showClick");
  const countdownText = document.getElementById("countdownText");
  const setClickButton = document.getElementById("setClick");
  const startClickButton = document.getElementById("startClick");
  const stopClickButton = document.getElementById("stopClickart");
  const resetClickButton = document.getElementById("resetClickart");
  const operation = document.getElementById("operation");
  const countdownOverlay = document.getElementById("countdownOverlay");
  const tempoInput = document.getElementById("tempoInput") || document.getElementById("tempo");
  const clickCountSelect = document.getElementById("clickCount");
  const countdownSelect = document.getElementById("countdown");
  const store = new ConfigStore();

  // タイマーと状態
  let cycleTimerId = null;
  let countdownTimerId = null;
  let isRunning = false;
  let cycleBoxes = [];
  let cycleIndex = 0;
  let currentBeatMs = null;
  let isPaused = false;
  let currentClickVolume = null;
  // 1拍ごとの再生キー(A5/A4/"")を保持する。空文字は無音。
  let currentClickTonePattern = null;

  // 値の読み取りユーティリティ
  const getNumberValue = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const getSettingValue = (inputEl, storageKey, fallback) => {
    if (inputEl) {
      const rawValue = "value" in inputEl ? inputEl.value : inputEl.textContent;
      return getNumberValue(rawValue, fallback);
    }
    const stored = sessionStorage.getItem(storageKey);
    return getNumberValue(stored, fallback);
  };

  // 現在の設定値
  const getTempo = () => {
    if (tempoInput) {
      const value = getSettingValue(tempoInput, "bclick.tempo", 60);
      return value > 0 ? value : 60;
    }
    const storedValue = store.getTempo();
    return typeof storedValue === "number" && storedValue > 0 ? storedValue : 60;
  };

  const getClickCount = () => {
    if (clickCountSelect) {
      const value = getSettingValue(clickCountSelect, "bclick.clickCount", 4);
      return value >= 0 ? value : 4;
    }
    const storedValue = store.getClickCount();
    return typeof storedValue === "number" && storedValue >= 0 ? storedValue : 4;
  };

  const getCountdown = () => {
    if (countdownSelect) {
      const value = getSettingValue(countdownSelect, "bclick.countdown", 4);
      return value >= 0 ? value : 4;
    }
    const storedValue = store.getCountInSec();
    return typeof storedValue === "number" && storedValue >= 0 ? storedValue : 4;
  };

  /**
   * 保存済みのクリック音量(0.0-2.0)を取得する。
   * @returns {number}
   */
  const getClickVolume = () => {
    const storedValue = store.getClickVolume();
    if (typeof storedValue === "number" && storedValue >= 0) {
      return Math.min(2, storedValue);
    }
    return 1.0;
  };

  /**
   * 端末別の最大音量に合わせて補正する。
   * @param {number} baseVolume
   * @returns {number}
   */
  const toDeviceVolume = (baseVolume) => {
    const clamped = Math.min(2, Math.max(0, baseVolume));
    const maxVolume = getMaxVolume();
    return (clamped / 2) * maxVolume;
  };

  /**
   * 保存済みのクリック音量を再読み込みして再生用の値を更新する。
   */
  const refreshClickVolume = () => {
    currentClickVolume = toDeviceVolume(getClickVolume());
  };

  /**
   * 保存済みのクリック音色パターンを再読み込みする。
   * @param {number} beatCount
   */
  const refreshClickTonePattern = (beatCount) => {
    currentClickTonePattern = store.getClickTonePattern(beatCount);
  };

  /**
   * 現在の楽譜から小節数を推定する。
   * @returns {number|null}
   */
  const getCurrentScoreBarCount = () => {
    const overlayLabels = document.querySelectorAll(".scoreChordOverlayLabel");
    if (overlayLabels.length > 0) return overlayLabels.length;
    if (Array.isArray(window.bclickRhythmScore?.bars) && window.bclickRhythmScore.bars.length > 0) {
      return window.bclickRhythmScore.bars.length;
    }
    const storedBars = store.getScoreBars();
    if (Array.isArray(storedBars) && storedBars.length > 0) return storedBars.length;
    const storedMeasures = store.getScoreMeasures();
    if (Number.isFinite(storedMeasures) && storedMeasures > 0) return storedMeasures;
    return null;
  };

  /**
   * 小節数をグローバルへ同期する。
   */
  const syncScoreBarCount = () => {
    const count = getCurrentScoreBarCount();
    if (Number.isFinite(count)) {
      window.bclickScoreBarCount = count;
    }
  };

  // 音声停止バナーの表示/非表示
  const showAudioResumeBanner = () => {
    const banner = document.getElementById("audioResumeBanner");
    if (banner) banner.hidden = false;
  };

  const hideAudioResumeBanner = () => {
    const banner = document.getElementById("audioResumeBanner");
    if (banner) banner.hidden = true;
  };

  // UI更新
  const setOperationEnabled = (enabled) => {
    if (setClickButton) setClickButton.disabled = !enabled;
    if (startClickButton) startClickButton.disabled = !enabled;
    if (stopClickButton) stopClickButton.disabled = !enabled;
    if (operation) operation.setAttribute("aria-disabled", String(!enabled));
  };

  const setOverlayVisible = (visible) => {
    if (!countdownOverlay) return;
    countdownOverlay.hidden = !visible;
    countdownOverlay.setAttribute("aria-hidden", String(!visible));
    document.body.style.overflow = visible ? "hidden" : "";
  };

  const updateCountdownDisplay = (seconds) => {
    if (!countdownText) return;
    if (seconds > 0) {
      countdownText.textContent = getLangMsg(
        `開始まで ${seconds}`,
        `Starting in ${seconds}`,
      );
    } else {
      countdownText.textContent = getLangMsg("開始", "Start");
    }
  };

  // タイマー停止
  const clearCycleTimer = () => {
    if (cycleTimerId !== null) {
      clearInterval(cycleTimerId);
      cycleTimerId = null;
    }
  };

  const clearTimers = () => {
    clearCycleTimer();
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
    cycleBoxes = [];
    cycleIndex = 0;
    currentBeatMs = null;
    isPaused = false;
  };

  // クリックボックス描画
  const renderClickBoxes = (count) => {
    if (!showClick) return;
    showClick.textContent = "";
    for (let i = 0; i < count; i += 1) {
      const box = document.createElement("div");
      box.className = "clickBox";
      box.textContent = (i + 1).toString();
      showClick.appendChild(box);
    }
  };

  /**
   * クリック音を拍に応じて鳴らす。
   * @param {number} beatIndex
   */
  const playClickSound = (beatIndex) => {
    // 保存値が無い場合のフォールバックも、configBeat の既定値ルールに揃える。
    const fallbackTone = beatIndex % 4 === 0 ? "A5" : "A4";
    // 空文字("") は「無音」の有効値なので、フォールバック判定には nullish を使う。
    const tone = currentClickTonePattern?.[beatIndex] ?? fallbackTone;
    if (tone === "") return;
    clickSound(currentClickVolume ?? undefined, tone);
  };

  //##Spec クリック音とクリックBoxの表示切替は、体感ズレを最小化するため可能な限りタイミングを合わせる。
  //##Spec 外部モジュール（recordingManagerなど）がクリックサイクルの開始を検知できるよう
  //        bclick:clickcyclestarted イベントを発火する。startClickBoxCycle の末尾で呼ぶ。
  const startCycleTimer = () => {
    if (cycleBoxes.length === 0 || currentBeatMs === null) return;
    clearCycleTimer();
    cycleTimerId = setInterval(() => {
      const nextIndex = (cycleIndex + 1) % cycleBoxes.length;
      playClickSound(nextIndex);
      requestAnimationFrame(() => {
        cycleBoxes[cycleIndex].classList.remove("active");
        cycleIndex = nextIndex;
        cycleBoxes[cycleIndex].classList.add("active");
        if (nextIndex === 0) {
          // 1周ごとに次の小節番号へスクロールする。
          scrollToNextBar();
        }
      });
    }, currentBeatMs);
  };

  const scrollToNextBar = () => {
    // カスタム描画された小節番号を順番にスクロールし、現在位置をハイライトする。
    const labels = Array.from(document.querySelectorAll(".scoreChordOverlayLabel"))
      .map((label) => ({
        label,
        barIndex: Number.parseInt(label.dataset.barIndex, 10),
      }))
      .filter((entry) => Number.isFinite(entry.barIndex));
    const labelMap = new Map(labels.map((entry) => [entry.barIndex, entry.label]));
    const fallbackCount = Number.isFinite(window.bclickScoreBarCount)
      ? window.bclickScoreBarCount
      : labels.length;
    if (fallbackCount <= 0) return;
    const currentIndex = Number.isFinite(window.bclickActiveChordIndex)
      ? window.bclickActiveChordIndex
      : -1;
    const nextIndex = (currentIndex + 1) % fallbackCount;
    // リサイズ等で再描画されてもハイライトを復元できるように保存する。
    window.bclickActiveChordIndex = nextIndex;

    const scrollContainer = document.getElementById("scoreArea");
    if (!scrollContainer) return;

    labels.forEach((entry) => entry.label.classList.remove("isActiveChord"));
    const target = labelMap.get(nextIndex);
    if (target) {
      target.classList.add("isActiveChord");
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + scrollContainer.scrollTop;
      const centered = offset - (scrollContainer.clientHeight - targetRect.height) / 2;
      const scrollTop = Math.max(0, centered);
      scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
      if (window.bclickRhythmScore?.handleOverlayRefresh) {
        window.bclickRhythmScore.handleOverlayRefresh();
      }
      return;
    }

    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    const ratio = fallbackCount > 1 ? nextIndex / (fallbackCount - 1) : 0;
    scrollContainer.scrollTo({ top: Math.max(0, maxScroll * ratio), behavior: "smooth" });
    if (window.bclickRhythmScore?.handleOverlayRefresh) {
      window.bclickRhythmScore.handleOverlayRefresh();
    }
    setTimeout(() => {
      const retry = scrollContainer.querySelector(
        `.scoreChordOverlayLabel[data-bar-index="${nextIndex}"]`,
      );
      if (!retry) return;
      retry.classList.add("isActiveChord");
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = retry.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + scrollContainer.scrollTop;
      const centered = offset - (scrollContainer.clientHeight - targetRect.height) / 2;
      const scrollTop = Math.max(0, centered);
      scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
    }, 60);
  };

  // クリックボックスのループ再生
  const startClickBoxCycle = (beatMs) => {
    const boxes = showClick ? Array.from(showClick.querySelectorAll(".clickBox")) : [];
    if (boxes.length === 0) return;

    cycleBoxes = boxes;
    cycleIndex = 0;
    currentBeatMs = beatMs;

    playClickSound(0);
    requestAnimationFrame(() => {
      cycleBoxes.forEach((box) => box.classList.remove("active"));
      cycleBoxes[0].classList.add("active");
      scrollToNextBar();
    });

    startCycleTimer();
    //##Spec クリックサイクルの実開始を外部モジュール（録音制御など）へ通知する
    document.dispatchEvent(new CustomEvent("bclick:clickcyclestarted", {
      detail: { beatMs, beatCount: boxes.length },
    }));
  };

  const updateTempo = (tempo) => {
    if (!Number.isFinite(tempo) || tempo <= 0) return;
    currentBeatMs = 60000 / tempo;
    if (isRunning && cycleTimerId !== null) {
      startCycleTimer();
    }
  };

  // audioContextの復帰/ウォームアップ（ユーザー操作が無い場合は失敗することがある）
  void restoreAudioContext();

  /**
   * クリック再生を開始する。
   */
  //##Spec Safariなどで長時間放置後にAudioContextが停止するため、再生開始時に必ず復帰を試みる。
  const startPlayback = async () => {
    const wasRunning = isRunning;
    const restored = await restoreAudioContext(!wasRunning);

    if (isRunning) {
      return;
    }

    // AudioContext の復帰に失敗した場合はバナーを表示して処理を中断する
    if (!restored) {
      showAudioResumeBanner();
      return;
    }

    if (isPaused && cycleBoxes.length > 0 && currentBeatMs !== null) {
      isRunning = true;
      isPaused = false;
      setOperationEnabled(true);
      startCycleTimer();
      //##Spec 一時停止からの再開を外部モジュール（録音制御など）へ通知する
      document.dispatchEvent(new CustomEvent("bclick:clickresumed"));
      return;
    }

    // 新規スタート時は小節位置と小節数をリセットする。
    window.bclickActiveChordIndex = -1;
    syncScoreBarCount();

    const tempo = getTempo();
    const beatMs = 60000 / tempo;
    currentBeatMs = beatMs;
    const clickCount = getClickCount();
    let countdown = getCountdown();
    refreshClickVolume();
    refreshClickTonePattern(clickCount);

    renderClickBoxes(clickCount);
    isRunning = true;
    setOperationEnabled(true);

    // カウントダウンが0の場合
    if (countdown <= 0) {
      updateCountdownDisplay(0);
      setOverlayVisible(false);
      startClickBoxCycle(beatMs);
      return;
    }

    // カウントダウンが0より大きい場合
    setOverlayVisible(true);
    updateCountdownDisplay(countdown);
    // 初回の音切れ回避用のウォームアップ
    clickSound(0.02, "A4");
    clickSound(currentClickVolume / countdown, "A4");

    countdownTimerId = setInterval(() => {
      countdown -= 1;

      if (countdown <= 0) {
        clearInterval(countdownTimerId);
        countdownTimerId = null;
        updateCountdownDisplay(0);
        setOverlayVisible(false);
        startClickBoxCycle(currentBeatMs ?? beatMs);
        return;
      }
      updateCountdownDisplay(countdown);
      clickSound(currentClickVolume / countdown, "A4");
    }, beatMs);
  };

  const setClickBoxes = () => {
    const clickCount = getClickCount();
    renderClickBoxes(clickCount);
    refreshClickTonePattern(clickCount);
    clearCycleTimer();
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
    isRunning = false;
    isPaused = false;
    setOverlayVisible(false);
  };

  const syncClickCountFromStore = () => {
    if (!clickCountSelect) return;
    const savedClickCount = store.getClickCount();
    if (savedClickCount !== null) {
      clickCountSelect.value = savedClickCount.toString();
    }
  };

  /**
   * クリック再生をリセットする。
   */
  const resetPlayback = () => {
    clearTimers();
    if (typeof window.bclickActiveChordIndex !== "undefined") {
      window.bclickActiveChordIndex = -1;
    }
    document.querySelectorAll(".scoreChordOverlayLabel.isActiveChord")
      .forEach((label) => {
        label.classList.remove("isActiveChord");
      });
    const scrollContainer = document.getElementById("scoreArea");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "auto" });
    }
    setClickBoxes();
    //##Spec 完全停止を外部モジュール（録音制御など）へ通知する
    document.dispatchEvent(new CustomEvent("bclick:clickreset"));
  };

  /**
   * クリック再生を一時停止する。
   */
  const pausePlayback = () => {
    clearCycleTimer();
    if (countdownTimerId !== null) {
      clearInterval(countdownTimerId);
      countdownTimerId = null;
    }
    isRunning = false;
    isPaused = true;
    setOverlayVisible(false);
    setOperationEnabled(true);
    //##Spec 一時停止を外部モジュール（録音制御など）へ通知する
    document.dispatchEvent(new CustomEvent("bclick:clickpaused"));
  };

  // イベント登録
  if (setClickButton) {
    setClickButton.addEventListener("click", setClickBoxes);
  }

  if (startClickButton) {
    startClickButton.addEventListener("click", () => {
      void startPlayback();
    });
  }

  if (stopClickButton) {
    stopClickButton.addEventListener("click", pausePlayback);
  }

  if (resetClickButton) {
    resetClickButton.addEventListener("click", resetPlayback);
  }

  if (!startClickButton) {
    void startPlayback();
  }

  syncClickCountFromStore();
  setClickBoxes();

  document.addEventListener("bclick:tempochange", (event) => {
    const nextTempo = getNumberValue(event?.detail?.tempo, getTempo());
    updateTempo(nextTempo);
  });

  document.addEventListener("bclick:scoreloaded", () => {
    syncScoreBarCount();
    syncClickCountFromStore();
    setClickBoxes();
  });

  //##Spec 復帰イベントではユーザー操作が無い場合に失敗することがあるが、可能な限り復帰を試みる。
  window.addEventListener("pageshow", () => {
    refreshClickVolume();
    refreshClickTonePattern(getClickCount());
    void restoreAudioContext();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    void restoreAudioContext();
  });

  //##Spec Safari がアイドル時に AudioContext を停止した場合、Sound.js からイベントが発火する。
  // メトロノーム再生中のみバナーを表示してユーザーに復帰操作を促す。
  window.addEventListener("bclick:audioContextSuspended", () => {
    if (isRunning) {
      showAudioResumeBanner();
    }
  });

  // バナーのタップでユーザー操作として AudioContext の復帰を試みる
  const audioResumeButton = document.getElementById("audioResumeButton");
  if (audioResumeButton) {
    audioResumeButton.addEventListener("click", async () => {
      const restored = await restoreAudioContext(true);
      if (restored) {
        hideAudioResumeBanner();
      }
    });
  }

  //##Spec 外部モジュール（録音制御など）からクリックを強制リセットするためのイベントを受け付ける
  document.addEventListener("bclick:forceReset", () => {
    resetPlayback();
  });

  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key === "bclick.clickCount") {
      syncClickCountFromStore();
      setClickBoxes();
      return;
    }
    
    // ボリュームの更新は次に再生するクリック音のボリュームに反映する。
    if (event.key === "bclick.clickVolume") {
      refreshClickVolume();
      return;
    }

    if (event.key === "bclick.clickTonePattern") {
      refreshClickTonePattern(getClickCount());
    }
  });
});
