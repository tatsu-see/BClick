/**
 * tapTempo.js
 * タップテンポコントローラー。
 * タップ間隔からBPMを計算し、指定回数タップされたらテンポを確定する。
 * 指定時間タップがなければリセットする。
 * index画面・editScore画面の両方から共通で使用する。
 */
export class TapTempoController {
  /**
   * @param {Object} options
   * @param {number}   [options.tapCount=4]             - 確定に必要なタップ回数
   * @param {number}   [options.resetMs=2000]           - リセットまでの無操作時間(ms)
   * @param {number}   [options.minBpm=30]              - テンポ下限（CLAUDE.md 仕様）
   * @param {number}   [options.maxBpm=240]             - テンポ上限（CLAUDE.md 仕様）
   * @param {Function} [options.onTempoDetected=null]   - テンポ確定時コールバック (bpm) => void
   * @param {Function} [options.onFirstTap=null]        - 最初のタップ時コールバック () => void
   * @param {Function} [options.onReset=null]           - タイムアウトリセット時コールバック () => void
   */
  constructor({
    tapCount = 4,
    resetMs = 2000,
    minBpm = 30,
    maxBpm = 240,
    onTempoDetected = null,
    onFirstTap = null,
    onReset = null,
  } = {}) {
    this.tapCount = tapCount;
    this.resetMs = resetMs;
    this.minBpm = minBpm;
    this.maxBpm = maxBpm;
    this.onTempoDetected = typeof onTempoDetected === "function" ? onTempoDetected : null;
    this.onFirstTap = typeof onFirstTap === "function" ? onFirstTap : null;
    this.onReset = typeof onReset === "function" ? onReset : null;

    // タップタイムスタンプ履歴
    this._taps = [];
    // リセット用タイマーID
    this._resetTimer = null;
  }

  /**
   * タップを記録する。
   * - 最初のタップ時に onFirstTap を呼ぶ。
   * - tapCount 回タップされたら平均BPMを計算し onTempoDetected を呼ぶ。
   * - タップ後 resetMs ms 経過したら _taps をリセットし onReset を呼ぶ。
   */
  recordTap() {
    const now = Date.now();

    // リセットタイマーをいったんキャンセル
    clearTimeout(this._resetTimer);
    this._resetTimer = null;

    // 最初のタップ時にコールバックを呼ぶ
    if (this._taps.length === 0) {
      this.onFirstTap?.();
    }

    this._taps.push(now);

    // tapCount 回たまったらBPM確定
    if (this._taps.length >= this.tapCount) {
      // 各タップ間隔の平均を計算
      let totalInterval = 0;
      for (let i = 1; i < this._taps.length; i++) {
        totalInterval += this._taps[i] - this._taps[i - 1];
      }
      const avgInterval = totalInterval / (this._taps.length - 1);
      const bpm = Math.round(60000 / avgInterval);

      // 上限下限チェック（CLAUDE.md 仕様）
      const clampedBpm = Math.min(this.maxBpm, Math.max(this.minBpm, bpm));

      // タップ履歴をリセットして確定
      this._taps = [];
      this.onTempoDetected?.(clampedBpm);
      return;
    }

    // 次のタップが来なかった場合のリセットタイマーをセット
    this._resetTimer = setTimeout(() => {
      this._taps = [];
      this._resetTimer = null;
      this.onReset?.();
    }, this.resetMs);
  }
}
