
const MaxVolume = 2.0;

/**
 * 最大音量を返す。
 * @returns 
 */
function getMaxVolume() {
  return MaxVolume;
}

/**
 * クリック音を鳴らす。
 */
function clickSound(volume = MaxVolume) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = "triangle";   // 角が丸い音色に寄せる
  osc.frequency.value = 880; // ラ
  
  // 簡易エンベロープでアタック/リリースをつける
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(now + 0.13); // 余韻を少し残す
}

export { clickSound, getMaxVolume };
