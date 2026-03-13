/**
 * tuner.js
 * ギターチューナー機能。
 * マイク入力から Pitchy（McLeod Pitch Method）でピッチを検出し、
 * 検出した音名・周波数・セントズレを configApp 画面のチューナーUIに反映する。
 *
 * 表示仕様:
 *   - セントズレを 9 段階のドットで表示（LEDメーター風）
 *   - 無音時は最後に検出した音を保持し続ける（更新しない）
 *   - Stop ボタン押下時のみ表示をリセットする
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

/** 基準音 A4 の周波数（Hz） */
const A4_HZ = 440.0;

/** 基準音 A4 の MIDI ノート番号 */
const A4_MIDI = 69;

/** 音名の配列（C から順） */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** ピッチ検出の明瞭度の閾値（これ以下は無音とみなす） */
const CLARITY_THRESHOLD = 0.85;

/**
 * セント値を 9 段階ドットのインデックス（0〜8）に変換するゾーン境界。
 * インデックス 4 が中央（in tune）。
 * 各境界はそのゾーンの「上限（絶対値）」を表す。
 *   zone 0,8: ±36〜±50 cent（一番外側）
 *   zone 1,7: ±23〜±35 cent
 *   zone 2,6: ±13〜±22 cent
 *   zone 3,5: ± 6〜±12 cent
 *   zone 4  :    0〜± 5 cent（中央）
 */
const DOT_ZONE_BOUNDARIES = [5, 12, 22, 35, 50];

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
  return { noteName: NOTE_NAMES[noteIndex], octave, cent };
}

/**
 * セント値（-50〜+50）を 9 段階ドットのインデックス（0〜8）に変換する。
 * インデックス 4 が中央（in tune）。左側（0〜3）がフラット、右側（5〜8）がシャープ。
 * @param {number} cent
 * @returns {number} 0〜8
 */
function centToDotIndex(cent) {
  const abs = Math.abs(cent);
  // ゾーン境界から距離（中央からの離れ度）を求める
  let offset = DOT_ZONE_BOUNDARIES.findIndex((boundary) => abs <= boundary);
  if (offset === -1) offset = DOT_ZONE_BOUNDARIES.length - 1;
  // 中央ドット（インデックス4）から offset 分ずらす
  return cent < 0 ? 4 - offset : 4 + offset;
}

// ===========================================================================
// UI 更新
// ===========================================================================

/** ドット要素のキャッシュ（初回取得後は再利用） */
let _dotEls = null;

/**
 * ドット要素の配列を返す（遅延初期化）。
 * @returns {Element[]}
 */
function getDotEls() {
  if (!_dotEls) {
    _dotEls = Array.from(document.querySelectorAll('#tunerDots .tunerDot'));
  }
  return _dotEls;
}

/**
 * チューナー表示UIを更新する。
 * @param {string} noteText - 音名（例: "A4"）または "—"
 * @param {number | null} hz  - 周波数（null のとき "— Hz" 表示）
 * @param {number | null} cent - セントズレ（null のとき "— cent" 表示、ドット全消灯）
 */
function updateTunerUI(noteText, hz, cent) {
  const noteEl = document.querySelector('.tunerNote');
  const hzEl   = document.querySelector('.tunerHz');
  const centEl = document.querySelector('.tunerCentValue');
  const dotEls = getDotEls();

  // 音名
  if (noteEl) noteEl.textContent = noteText;

  // 周波数
  if (hzEl) hzEl.textContent = hz !== null ? `${hz.toFixed(1)} Hz` : '— Hz';

  // セント値テキスト
  if (centEl) centEl.textContent = cent !== null ? `${cent >= 0 ? '+' : ''}${cent} cent` : '— cent';

  // ドット更新
  if (dotEls.length === 9) {
    if (cent === null) {
      // 全ドット消灯
      dotEls.forEach((dot) => dot.classList.remove('isFlat', 'isSharp', 'isInTune'));
    } else {
      const activeIndex = centToDotIndex(cent);
      dotEls.forEach((dot, i) => {
        dot.classList.remove('isFlat', 'isSharp', 'isInTune');
        if (i === activeIndex) {
          // 点灯: 位置によって色を決める
          if (i < 4) {
            dot.classList.add('isFlat');    // 左側 → 青（低い）
          } else if (i > 4) {
            dot.classList.add('isSharp');   // 右側 → 赤（高い）
          } else {
            dot.classList.add('isInTune'); // 中央 → 緑（OK）
          }
        }
      });
    }
  }
}

/**
 * チューナーをリセット（初期表示）に戻す。
 * Stop 時にのみ呼ぶ。
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
      }
      // 無音・不明瞭の場合は何もしない（最後の表示を保持する）
    });

    micSource.connect(scriptProcessor);
    // ScriptProcessor は出力先に接続しないと動作しないブラウザがあるため、
    // destination に接続（音は出ない: gain=0 のノードを挟む）
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
 * チューナーを停止する。AudioContext とマイクストリームを解放し、UIをリセットする。
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
  // Stop 時にのみ表示をリセット
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
