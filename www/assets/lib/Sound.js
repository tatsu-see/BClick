// Ver. 1.0.0

/**
 * Sound.js
 * 音再生用のライブラリ。音量は iPhone や Anddroid で差があるので、最大音量の割合で指定する。
 */
import { OSDetector } from "./OSDetector.js";

const MaxVolume = 2.0;

// もともとAndroid端末向けに最大音量を調節していたが、端末個体に依存するので、Androindの特殊処理はしない。
const AndroidVolumeMultiplier = 1.0;

const osDetector = new OSDetector();    // Android / それ以外（windows, iPhone など）判別用
const KeyFrequencies = Object.freeze({
  A4: 440.0,      // 基準音ラ
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.61,
  A5: 880.0,      // 1オクターブ上のラ
  "A#5": 932.33,
  B5: 987.77,
  C6: 1046.5,
  "C#6": 1108.73,
  D6: 1174.66,
  "D#6": 1244.51,
  E6: 1318.51,
  F6: 1396.91,
  "F#6": 1479.98,
  G6: 1567.98,
  "G#6": 1661.22,
});

/**
 * AudioContext を返す。
 */
let audioContext = null;
let didWarmUp = false;

/**
 * AudioContext を生成し、内部状態を初期化する。
 * @returns {AudioContext}
 */
const createAudioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  audioContext = new Ctx();
  didWarmUp = false;
  return audioContext;
};

/**
 * AudioContext を返す。
 * @returns {AudioContext}
 */
const getAudioContext = () => {
  if (!audioContext || audioContext.state === "closed") {
    return createAudioContext();
  }
  return audioContext;
};

/**
 * AudioContext が一時停止状態か判定する。
 * @param {string} state
 * @returns {boolean}
 */
const isAudioContextInterrupted = (state) => state === "suspended" || state === "interrupted";

/**
 * AudioContext をウォームアップする。
 * @param {boolean} force
 */
const warmUpAudioContext = (force = false) => {
  const ctx = getAudioContext();
  if (ctx.state !== "running") return;
  if (didWarmUp && !force) return;
  didWarmUp = true;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.0002, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(now + 0.06);
};

/**
 * AudioContext の復帰を試み、必要なら再生成する。
 * @param {boolean} forceWarmUp
 * @returns {Promise<boolean>}
 */
//##Spec Safariは長時間放置でAudioContextが中断/終了し得るため、復帰処理をここで集中管理する。
async function restoreAudioContext(forceWarmUp = false) {
  let ctx = getAudioContext();
  if (isAudioContextInterrupted(ctx.state)) {
    try {
      await ctx.resume();
    } catch (error) {
      // ユーザー操作が必要な場合はここで止まるため、例外は握りつぶす。
    }
  }
  if (ctx.state === "closed") {
    ctx = createAudioContext();
  }
  if (ctx.state === "running") {
    warmUpAudioContext(forceWarmUp);
    return true;
  }
  return false;
}

/**
 * 最大音量を返す。
 * @returns 
 */
function getMaxVolume() {
  return osDetector.getOS() === "Android" ? MaxVolume * AndroidVolumeMultiplier : MaxVolume;
}

/**
 * クリック音を鳴らす。
 */
function clickSound(volume = MaxVolume, key = "A5") {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = "triangle";   // 角が丸い音色に寄せる
  osc.frequency.value = KeyFrequencies[key] ?? KeyFrequencies.A5;
  
  // 簡易エンベロープでアタック/リリースをつける
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(now + 0.33); // 余韻を少し残す
}

export { clickSound, getMaxVolume, KeyFrequencies, warmUpAudioContext, restoreAudioContext };
