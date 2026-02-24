/**
 * recordingManager.js
 * マイク録音・IndexedDB永続化・Web Audio API同期再生を管理するクラス。
 * editScore.js から使用する。ライブラリとして他の画面でも再利用可能。
 */

//##Spec IndexedDB のデータベース名・ストア名・レコードキー
const DB_NAME = "bclick-recording-db";
const STORE_NAME = "recordings";
const RECORD_KEY = "main"; // 1アプリにつき1つの録音データを保持する

/**
 * RecordingManager
 * マイク録音の開始・停止・IndexedDB保存と、Web Audio API を使った同期再生を管理する。
 */
export class RecordingManager {
  constructor() {
    /** @type {IDBDatabase|null} */
    this._db = null;
    /** @type {MediaRecorder|null} */
    this._mediaRecorder = null;
    /** @type {Blob[]} */
    this._recordedChunks = [];
    /** @type {AudioContext|null} */
    this._audioCtx = null;
    /** @type {AudioBufferSourceNode|null} */
    this._sourceNode = null;
    /** @type {AudioBuffer|null} */
    this._audioBuffer = null;
    /** @type {boolean} */
    this._isPaused = false;
    /** @type {number} */
    this._pauseOffset = 0; // 一時停止時点の再生位置（秒）
    /** @type {number} */
    this._playbackStartCtxTime = 0; // 再生開始時の AudioContext 時刻（オフセット込み基準）
    /** @type {boolean} */
    this._currentLoop = false; // 現在のループ設定
    /** @type {MediaStream|null} */
    this._prewarmStream = null; // 事前取得済みのマイクストリーム
  }

  // ─── IndexedDB ───────────────────────────────────────────────

  /**
   * IndexedDB を開く（遅延初期化）。
   * @returns {Promise<IDBDatabase>}
   */
  async _openDB() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        // バージョン1: 録音データ保存用ストアを作成する
        e.target.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 録音 Blob を IndexedDB に保存する。
   * @param {Blob} blob
   * @returns {Promise<void>}
   */
  async _saveBlob(blob) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(blob, RECORD_KEY);
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * IndexedDB から録音 Blob を読み込む。
   * @returns {Promise<Blob|null>}
   */
  async _loadBlob() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ─── 録音 ────────────────────────────────────────────────────

  /**
   * マイクストリームを事前取得する。
   * ●Rec モード選択時に呼ぶことで、録音開始時の getUserMedia 遅延を回避する。
   * @returns {Promise<void>}
   */
  async prewarmMic() {
    if (this._prewarmStream) return;
    this._prewarmStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  /**
   * 事前取得済みのマイクストリームを解放する。
   * ●Rec モードから離れたとき（別モードへ切り替え）に呼ぶ。
   */
  releasePrewarmMic() {
    if (this._prewarmStream) {
      this._prewarmStream.getTracks().forEach((t) => t.stop());
      this._prewarmStream = null;
    }
  }

  /**
   * マイク録音を開始する。既存の録音データは削除してから開始する。
   * 事前取得済みストリーム（_prewarmStream）があればそれを使い、遅延を最小化する。
   * @returns {Promise<void>}
   */
  async startRecording() {
    // 前回の録音を削除し、古い AudioBuffer も破棄する
    await this.deleteRecording();
    this._audioBuffer = null;
    // 事前取得済みストリームを優先して使う（getUserMedia 遅延の回避）
    let stream;
    if (this._prewarmStream) {
      stream = this._prewarmStream;
      this._prewarmStream = null;
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    this._recordedChunks = [];
    this._mediaRecorder = new MediaRecorder(stream);
    this._mediaRecorder.ondataavailable = (e) => {
      // 100ms ごとにチャンクを収集する（途中停止時もデータが残るよう）
      if (e.data.size > 0) {
        this._recordedChunks.push(e.data);
      }
    };
    this._mediaRecorder.start(100);
  }

  /**
   * 録音を停止して IndexedDB に保存する。途中停止時も収集済みデータを保存する。
   * @returns {Promise<void>}
   */
  async stopRecording() {
    if (!this._mediaRecorder) return;
    // すでに停止済みの場合は収集済みチャンクを保存する
    if (this._mediaRecorder.state === "inactive") {
      if (this._recordedChunks.length > 0) {
        const blob = new Blob(this._recordedChunks, {
          type: this._mediaRecorder.mimeType || "audio/webm",
        });
        await this._saveBlob(blob);
      }
      this._recordedChunks = [];
      this._mediaRecorder = null;
      return;
    }
    return new Promise((resolve) => {
      this._mediaRecorder.onstop = async () => {
        if (this._recordedChunks.length > 0) {
          const blob = new Blob(this._recordedChunks, {
            type: this._mediaRecorder.mimeType || "audio/webm",
          });
          await this._saveBlob(blob);
        }
        // マイクストリームを解放する
        this._mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        this._recordedChunks = [];
        this._mediaRecorder = null;
        resolve();
      };
      this._mediaRecorder.stop();
    });
  }

  /**
   * 録音中かどうかを返す。
   * @returns {boolean}
   */
  isRecording() {
    return this._mediaRecorder?.state === "recording";
  }

  // ─── IndexedDB 操作 ──────────────────────────────────────────

  /**
   * 録音データが IndexedDB に存在するかを確認する。
   * @returns {Promise<boolean>}
   */
  async hasRecording() {
    try {
      const blob = await this._loadBlob();
      return blob !== null;
    } catch {
      return false;
    }
  }

  /**
   * 録音データを IndexedDB から削除する。
   * @returns {Promise<void>}
   */
  async deleteRecording() {
    const db = await this._openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(RECORD_KEY);
      tx.oncomplete = resolve;
      tx.onerror = resolve; // エラーでも続行
    });
  }

  // ─── 再生 ────────────────────────────────────────────────────

  /**
   * 再生用 AudioContext を取得する（遅延初期化）。
   * @returns {AudioContext}
   */
  _getAudioCtx() {
    if (!this._audioCtx || this._audioCtx.state === "closed") {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this._audioCtx = new Ctx();
    }
    return this._audioCtx;
  }

  /**
   * 録音データをデコードして AudioBuffer を準備する。
   * 前回の AudioBuffer がある場合はそれを再利用する。
   * @returns {Promise<AudioBuffer>}
   */
  async _prepareBuffer() {
    if (this._audioBuffer) return this._audioBuffer;
    const blob = await this._loadBlob();
    if (!blob) throw new Error("録音データがありません");
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = this._getAudioCtx();
    this._audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return this._audioBuffer;
  }

  /**
   * 録音再生を開始する。
   * 呼び出し元は bclick:clickcyclestarted イベント受信直後にこのメソッドを呼ぶことで
   * クリック音との同期を最大化できる。
   * @param {boolean} loop - trueのとき末尾で先頭に戻ってループする
   * @returns {Promise<void>}
   */
  async startPlayback(loop = false) {
    const ctx = this._getAudioCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    await this._prepareBuffer();
    this._isPaused = false;
    this._pauseOffset = 0;
    this._currentLoop = loop;
    // AudioContext 時刻の currentTime でできる限り早く再生スケジュールを組む
    this._playInternal(ctx, ctx.currentTime, 0, loop);
  }

  /**
   * AudioBufferSourceNode をスケジュールして再生する内部処理。
   * @param {AudioContext} ctx
   * @param {number} startAtCtxTime - 再生開始時刻（AudioContext 時間）
   * @param {number} offset - 再生オフセット（秒）
   * @param {boolean} loop
   */
  _playInternal(ctx, startAtCtxTime, offset, loop) {
    this._stopCurrentNode();
    const source = ctx.createBufferSource();
    source.buffer = this._audioBuffer;
    source.loop = loop;
    source.connect(ctx.destination);
    source.start(startAtCtxTime, offset);
    this._sourceNode = source;
    // offset を引くことで「録音の先頭から数えた時刻」として基準を統一する
    this._playbackStartCtxTime = startAtCtxTime - offset;
  }

  /**
   * 再生を一時停止する。
   */
  pausePlayback() {
    if (!this._sourceNode || this._isPaused) return;
    const ctx = this._getAudioCtx();
    // 現在の再生位置を保存する
    const elapsed = ctx.currentTime - this._playbackStartCtxTime;
    this._pauseOffset = Math.max(0, elapsed);
    this._stopCurrentNode();
    this._isPaused = true;
  }

  /**
   * 一時停止から再開する。
   */
  resumePlayback() {
    if (!this._audioBuffer || !this._isPaused) return;
    const ctx = this._getAudioCtx();
    this._isPaused = false;
    this._playInternal(ctx, ctx.currentTime, this._pauseOffset, this._currentLoop);
  }

  /**
   * 再生を完全停止する（一時停止位置もリセット）。
   * 次回 startPlayback 時に先頭から再生される。
   * AudioBuffer はキャッシュしたまま（次回再生の高速化のため）。
   * 新規録音時（startRecording）でバッファは破棄される。
   */
  stopPlayback() {
    this._stopCurrentNode();
    this._isPaused = false;
    this._pauseOffset = 0;
  }

  /**
   * AudioBuffer を事前デコードして準備する（公開メソッド）。
   * Rec▶ モード選択時に呼ぶことで、startPlayback 時のデコード遅延を回避する。
   * @returns {Promise<void>}
   */
  async prepareBuffer() {
    try {
      await this._prepareBuffer();
    } catch {
      // 録音データが無い場合は無視する
    }
  }

  /**
   * 現在の再生を止めて先頭から即座に再生し直す（ループ再同期用）。
   * 一時停止中は何もしない。
   */
  restartPlayback() {
    if (!this._audioBuffer || this._isPaused) return;
    const ctx = this._getAudioCtx();
    this._isPaused = false;
    this._pauseOffset = 0;
    this._playInternal(ctx, ctx.currentTime, 0, this._currentLoop);
  }

  /**
   * 現在の SourceNode を停止して解放する。
   */
  _stopCurrentNode() {
    if (this._sourceNode) {
      try {
        this._sourceNode.stop();
      } catch {
        // すでに終了済みの場合は無視する
      }
      this._sourceNode.disconnect();
      this._sourceNode = null;
    }
  }
}
