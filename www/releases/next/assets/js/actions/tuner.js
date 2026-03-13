/**
 * tuner.js
 * ギターチューナー機能。
 * マイク入力から Pitchy（McLeod Pitch Method）でピッチを検出し、
 * 検出した音名・周波数・セントズレを configApp 画面のチューナーUIに反映する。
 *
 * 使い方:
 *   import { initTuner } from './tuner.js';
 *   initTuner();
 *
 * 外部依存:
 *   assets/lib/pitchy.js（pitchy - McLeod Pitch Method）
 *   assets/lib/fft.js  （fft.js - Pitchy の内部依存）
 */

import { PitchDetector } from '../../lib/pitchy.js';

// ===========================================================================
// 定数
// ===========================================================================

/** ピッチ検出バッファサイズ（2のべき乗。大きいほど低音域が検出しやすい） */
const BUFFER_SIZE = 4096;

/** サンプリングレート（getUserMedia デフォルト。実際は AudioContext から取得する） */
const DEFAULT_SAMPLE_RATE = 44100;

/** 基準音 A4 の周波数（Hz） */
const A4_HZ = 440.0;

/** 基準音 A4 の MIDI ノート番号 */
const A4_MIDI = 69;

/** 音名の配列（C から順） */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** チューニングOKと判定するセントの閾値（±この値以内なら緑） */
const IN_TUNE_THRESHOLD_CENT = 5;

/** ピッチ検出の明瞭度の閾値（これ以下は無音とみなす） */
const CLARITY_THRESHOLD = 0.85;

// ===========================================================================
// ピッチ変換ユーティリティ
// ===========================================================================

/**
 * 周波数（Hz）から最近傍の音名とセントズレを返す。
 * @param {number} hz - 検出周波数
 * @returns {{ noteName: string, octave: number, cent: number }}
 */
function hzToNoteInfo(hz) {
  // 半音数（A4を基準に計算）
  const semitones = 12 * Math.log2(hz / A4_HZ);
  // 最近傍の MIDI ノート番号
  const midiNote = Math.round(A4_MIDI + semitones);
  // セントズレ（-50〜+50）
  const cent = Math.round((A4_MIDI + semitones - midiNote) * 100);
  // 音名とオクターブ
  const noteIndex = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  return {
    noteName: NOTE_NAMES[noteIndex],
    octave,
    cent,
  };
}

// ===========================================================================
// UI 更新
// ===========================================================================

/**
 * チューナー表示UIを更新する。
 * @param {string} noteText - 音名（例: "A4"）または "—"
 * @param {number | null} hz  - 周波数（null のとき "— Hz" 表示）
 * @param {number | null} cent - セントズレ（null のとき "— cent" 表示）
 */
function updateTunerUI(noteText, hz, cent) {
  const noteEl   = document.querySelector('.tunerNote');
  const hzEl     = document.querySelector('.tunerHz');
  const centEl   = document.querySelector('.tunerCentValue');
  const needleEl = document.getElementById('tunerCentNeedle');

  // 音名
  if (noteEl) noteEl.textContent = noteText;

  // 周波数
  if (hzEl) hzEl.textContent = hz !== null ? `${hz.toFixed(1)} Hz` : '— Hz';

  // セント表示とバー針
  if (centEl) centEl.textContent = cent !== null ? `${cent >= 0 ? '+' : ''}${cent} cent` : '— cent';

  if (needleEl) {
    if (cent === null) {
      // 未検出: グレー・中央
      needleEl.className = 'tunerCentNeedle';
      needleEl.style.left = '50%';
    } else {
      // 針の位置: cent を -50〜+50 の範囲で 0〜100% にマッピング
      const clampedCent = Math.max(-50, Math.min(50, cent));
      const leftPercent = 50 + clampedCent; // 50% が中央（in tune）
      needleEl.style.left = `${leftPercent}%`;

      // 色クラス
      needleEl.classList.remove('isFlat', 'isSharp', 'isInTune');
      if (cent < -IN_TUNE_THRESHOLD_CENT) {
        needleEl.classList.add('isFlat');    // 低い → 青
      } else if (cent > IN_TUNE_THRESHOLD_CENT) {
        needleEl.classList.add('isSharp');   // 高い → 赤
      } else {
        needleEl.classList.add('isInTune');  // OK  → 緑
      }
    }
  }
}

/**
 * チューナーをリセット（初期表示）に戻す。
 */
function resetTunerUI() {
  updateTunerUI('—', null, null);
}

// ===========================================================================
// チューナー本体
// ===========================================================================

/** チューナーの状態 */
let isRunning = false;
/** AudioContext インスタンス */
let audioContext = null;
/** マイク入力の MediaStreamSource */
let micSource = null;
/** ScriptProcessor ノード */
let scriptProcessor = null;
/** マイクの MediaStream */
let micStream = null;
/** PitchDetector インスタンス */
let pitchDetector = null;

/**
 * チューナーを起動する。マイクの使用許可を求め、ピッチ検出ループを開始する。
 * @returns {Promise<void>}
 */
async function startTuner() {
  try {
    // マイク入力を取得
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    // AudioContext を作成
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;

    // PitchDetector を初期化
    pitchDetector = PitchDetector.forFloat32Array(BUFFER_SIZE);
    pitchDetector.minVolumeDecibels = -20; // 無音判定の閾値

    // マイク → ScriptProcessor → ピッチ検出
    micSource = audioContext.createMediaStreamSource(micStream);
    // ScriptProcessor は非推奨だが、AudioWorklet より導入が簡単なため使用
    scriptProcessor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    const inputBuffer = new Float32Array(BUFFER_SIZE);

    scriptProcessor.addEventListener('audioprocess', (event) => {
      // 入力バッファを取得
      event.inputBuffer.copyFromChannel(inputBuffer, 0);

      // ピッチ検出
      const [hz, clarity] = pitchDetector.findPitch(inputBuffer, sampleRate);

      if (hz > 0 && clarity >= CLARITY_THRESHOLD) {
        // 検出成功: 音名・周波数・セントを更新
        const { noteName, octave, cent } = hzToNoteInfo(hz);
        updateTunerUI(`${noteName}${octave}`, hz, cent);
      } else {
        // 無音 or 不明瞭: 表示をリセット
        resetTunerUI();
      }
    });

    micSource.connect(scriptProcessor);
    // ScriptProcessor は出力先に接続しないと動作しないブラウザがあるため、
    // destination に接続（音は出ない: gainが0のノードを挟む）
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;
    scriptProcessor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    isRunning = true;
  } catch (err) {
    // マイク許可拒否・非対応ブラウザなどのエラー
    console.error('チューナー起動エラー:', err);
    resetTunerUI();
    isRunning = false;
    throw err;
  }
}

/**
 * チューナーを停止する。AudioContext とマイクストリームを解放する。
 */
function stopTuner() {
  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (micSource) {
    micSource.disconnect();
    micSource = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  pitchDetector = null;
  isRunning = false;
  resetTunerUI();
}

// ===========================================================================
// 初期化（外部から呼び出す）
// ===========================================================================

/**
 * チューナーUIを初期化する。
 * Start/Stop ボタンにイベントリスナーを設定する。
 */
export function initTuner() {
  const startBtn = document.getElementById('tunerStartBtn');
  if (!startBtn) return;

  const iconEl  = startBtn.querySelector('.material-symbols-rounded');
  const langEls = startBtn.querySelectorAll('.lang');

  /**
   * ボタン表示を Start / Stop に切り替える。
   * @param {boolean} running
   */
  const updateButtonLabel = (running) => {
    if (iconEl) iconEl.textContent = running ? 'mic_off' : 'mic';
    langEls.forEach((el) => {
      if (el.dataset.lang === 'en') el.textContent = running ? 'Stop' : 'Start';
      if (el.dataset.lang === 'ja') el.textContent = running ? 'ストップ' : 'スタート';
    });
    startBtn.classList.toggle('isActive', running);
  };

  startBtn.addEventListener('click', async () => {
    if (isRunning) {
      // 停止
      stopTuner();
      updateButtonLabel(false);
    } else {
      // 起動
      try {
        await startTuner();
        updateButtonLabel(true);
      } catch {
        // マイク許可エラーなど: ボタンを元に戻す
        updateButtonLabel(false);
        alert(
          navigator.language.startsWith('ja')
            ? 'マイクへのアクセスが許可されませんでした。\nブラウザの設定でマイクを許可してください。'
            : 'Microphone access was denied.\nPlease allow microphone access in your browser settings.'
        );
      }
    }
  });

  // 画面を離れるとき（Back / Done）にチューナーを自動停止
  window.addEventListener('pagehide', () => {
    if (isRunning) stopTuner();
  });
}
