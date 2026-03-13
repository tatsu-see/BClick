// pitchy.js - McLeod Pitch Method によるピッチ検出ライブラリ
// Source: https://github.com/ianprime0509/pitchy
// License: MIT (see assets/licenses/pitchy.MIT.txt)
// fft.js への依存を相対パスに変換済み

import FFT from './fft.js';

/**
 * @typedef {Float32Array | Float64Array | number[]} Buffer
 */

/**
 * オートコリレーション計算クラス
 * @template {Buffer} T
 */
export class Autocorrelator {
  /** @private @readonly @type {number} */
  _inputLength;
  /** @private @type {FFT} */
  _fft;
  /** @private @type {(size: number) => T} */
  _bufferSupplier;
  /** @private @type {T} */
  _paddedInputBuffer;
  /** @private @type {T} */
  _transformBuffer;
  /** @private @type {T} */
  _inverseBuffer;

  static forFloat32Array(inputLength) {
    return new Autocorrelator(inputLength, (length) => new Float32Array(length));
  }

  static forFloat64Array(inputLength) {
    return new Autocorrelator(inputLength, (length) => new Float64Array(length));
  }

  static forNumberArray(inputLength) {
    return new Autocorrelator(inputLength, (length) => Array(length));
  }

  constructor(inputLength, bufferSupplier) {
    if (inputLength < 1) {
      throw new Error(`Input length must be at least one`);
    }
    this._inputLength = inputLength;
    this._fft = new FFT(ceilPow2(2 * inputLength));
    this._bufferSupplier = bufferSupplier;
    this._paddedInputBuffer = this._bufferSupplier(this._fft.size);
    this._transformBuffer = this._bufferSupplier(2 * this._fft.size);
    this._inverseBuffer = this._bufferSupplier(2 * this._fft.size);
  }

  get inputLength() {
    return this._inputLength;
  }

  autocorrelate(input, output = this._bufferSupplier(input.length)) {
    if (input.length !== this._inputLength) {
      throw new Error(`Input must have length ${this._inputLength} but had length ${input.length}`);
    }
    for (let i = 0; i < input.length; i++) {
      this._paddedInputBuffer[i] = input[i];
    }
    for (let i = input.length; i < this._paddedInputBuffer.length; i++) {
      this._paddedInputBuffer[i] = 0;
    }
    this._fft.realTransform(this._transformBuffer, this._paddedInputBuffer);
    this._fft.completeSpectrum(this._transformBuffer);
    const tb = this._transformBuffer;
    for (let i = 0; i < tb.length; i += 2) {
      tb[i] = tb[i] * tb[i] + tb[i + 1] * tb[i + 1];
      tb[i + 1] = 0;
    }
    this._fft.inverseTransform(this._inverseBuffer, this._transformBuffer);
    for (let i = 0; i < input.length; i++) {
      output[i] = this._inverseBuffer[2 * i];
    }
    return output;
  }
}

/**
 * キー最大値のインデックス配列を返す（MPM内部処理）
 * @param input {ArrayLike<number>}
 * @returns {number[]}
 */
function getKeyMaximumIndices(input) {
  /** @type {number[]} */ const keyIndices = [];
  let lookingForMaximum = false;
  let max = -Infinity;
  let maxIndex = -1;

  for (let i = 1; i < input.length - 1; i++) {
    if (input[i - 1] <= 0 && input[i] > 0) {
      lookingForMaximum = true;
      maxIndex = i;
      max = input[i];
    } else if (input[i - 1] > 0 && input[i] <= 0) {
      lookingForMaximum = false;
      if (maxIndex !== -1) {
        keyIndices.push(maxIndex);
      }
    } else if (lookingForMaximum && input[i] > max) {
      max = input[i];
      maxIndex = i;
    }
  }

  return keyIndices;
}

/**
 * 放物線補間でピーク位置を精密化する（MPM内部処理）
 * @param index {number}
 * @param data {ArrayLike<number>}
 * @returns {[number, number]}
 */
function refineResultIndex(index, data) {
  const [x0, x1, x2] = [index - 1, index, index + 1];
  const [y0, y1, y2] = [data[x0], data[x1], data[x2]];

  const a = y0 / 2 - y1 + y2 / 2;
  const b = -(y0 / 2) * (x1 + x2) + y1 * (x0 + x2) - (y2 / 2) * (x0 + x1);
  const c = (y0 * x1 * x2) / 2 - y1 * x0 * x2 + (y2 * x0 * x1) / 2;

  const xMax = -b / (2 * a);
  const yMax = a * xMax * xMax + b * xMax + c;
  return [xMax, yMax];
}

/**
 * McLeod Pitch Method（MPM）によるピッチ検出クラス
 * @template {Buffer} T
 */
export class PitchDetector {
  /** @private @type {Autocorrelator<T>} */
  _autocorrelator;
  /** @private @type {T} */
  _nsdfBuffer;
  /** @private @type {number} */
  _clarityThreshold = 0.9;
  /** @private @type {number} */
  _minVolumeAbsolute = 0.0;
  /** @private @type {number} */
  _maxInputAmplitude = 1.0;

  static forFloat32Array(inputLength) {
    return new PitchDetector(inputLength, (length) => new Float32Array(length));
  }

  static forFloat64Array(inputLength) {
    return new PitchDetector(inputLength, (length) => new Float64Array(length));
  }

  static forNumberArray(inputLength) {
    return new PitchDetector(inputLength, (length) => Array(length));
  }

  constructor(inputLength, bufferSupplier) {
    this._autocorrelator = new Autocorrelator(inputLength, bufferSupplier);
    this._nsdfBuffer = bufferSupplier(inputLength);
  }

  get inputLength() {
    return this._autocorrelator.inputLength;
  }

  set clarityThreshold(threshold) {
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
      throw new Error('clarityThreshold must be a number in the range (0, 1]');
    }
    this._clarityThreshold = threshold;
  }

  set minVolumeAbsolute(volume) {
    if (!Number.isFinite(volume) || volume < 0 || volume > this._maxInputAmplitude) {
      throw new Error(`minVolumeAbsolute must be a number in the range [0, ${this._maxInputAmplitude}]`);
    }
    this._minVolumeAbsolute = volume;
  }

  set minVolumeDecibels(db) {
    if (!Number.isFinite(db) || db > 0) {
      throw new Error('minVolumeDecibels must be a number <= 0');
    }
    this._minVolumeAbsolute = this._maxInputAmplitude * 10 ** (db / 10);
  }

  set maxInputAmplitude(amplitude) {
    if (!Number.isFinite(amplitude) || amplitude <= 0) {
      throw new Error('maxInputAmplitude must be a number > 0');
    }
    this._maxInputAmplitude = amplitude;
  }

  /**
   * ピッチを検出して [周波数(Hz), 明瞭度(0-1)] を返す
   * 検出不可の場合は [0, 0] を返す
   * @param input {ArrayLike<number>}
   * @param sampleRate {number}
   * @returns {[number, number]}
   */
  findPitch(input, sampleRate) {
    if (this._belowMinimumVolume(input)) return [0, 0];
    this._nsdf(input);
    const keyMaximumIndices = getKeyMaximumIndices(this._nsdfBuffer);
    if (keyMaximumIndices.length === 0) return [0, 0];
    const nMax = Math.max(...keyMaximumIndices.map((i) => this._nsdfBuffer[i]));
    const resultIndex = keyMaximumIndices.find(
      (i) => this._nsdfBuffer[i] >= this._clarityThreshold * nMax,
    );
    const [refinedResultIndex, clarity] = refineResultIndex(
      // @ts-expect-error resultIndex is guaranteed to be defined
      resultIndex,
      this._nsdfBuffer,
    );
    return [sampleRate / refinedResultIndex, Math.min(clarity, 1.0)];
  }

  /** @private */
  _belowMinimumVolume(input) {
    if (this._minVolumeAbsolute === 0) return false;
    let squareSum = 0;
    for (let i = 0; i < input.length; i++) {
      squareSum += input[i] ** 2;
    }
    return Math.sqrt(squareSum / input.length) < this._minVolumeAbsolute;
  }

  /** @private */
  _nsdf(input) {
    this._autocorrelator.autocorrelate(input, this._nsdfBuffer);
    let m = 2 * this._nsdfBuffer[0];
    /** @type {number} */ let i;
    for (i = 0; i < this._nsdfBuffer.length && m > 0; i++) {
      this._nsdfBuffer[i] = (2 * this._nsdfBuffer[i]) / m;
      m -= input[i] ** 2 + input[input.length - i - 1] ** 2;
    }
    for (; i < this._nsdfBuffer.length; i++) {
      this._nsdfBuffer[i] = 0;
    }
  }
}

/**
 * 2のべき乗に切り上げる
 * @param {number} v
 * @returns {number}
 */
function ceilPow2(v) {
  v--;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  v++;
  return v;
}
