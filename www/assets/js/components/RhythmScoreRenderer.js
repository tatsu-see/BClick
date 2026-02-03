/**
 * RhythmScoreRenderer.js
 * alphaTab 描画に特化したリズム譜レンダラー
 */

import AlphaTexBuilder from "../utils/AlphaTexBuilder.js";

class RhythmScoreRenderer {
  constructor(containerId, { alphaTexBuilder = null } = {}) {
    this.container = typeof containerId === "string"
      ? document.getElementById(containerId)
      : containerId;
    this.alphaTexBuilder = alphaTexBuilder || new AlphaTexBuilder();
    this.data = {
      tempo: null,
      timeSignature: "4/4",
      measures: 2,
      barsPerRow: null,
      progression: [],
      bars: [],
    };
  }

  /**
   * レンダリング対象のデータを設定する。
   * @param {object} data
   */
  setData(data = {}) {
    this.data = {
      ...this.data,
      ...data,
    };
  }

  /**
   * 現在のSVGを取得する。
   * @returns {SVGElement[]}
   */
  getSvgs() {
    if (!this.container) return [];
    return Array.from(this.container.querySelectorAll("svg"));
  }

  /**
   * alphaTabを描画する。
   */
  render() {
    if (!this.container || !window.alphaTab) return;
    this.container.textContent = "";
    const settings = {
      tex: true,
      display: {
        staveProfile: window.alphaTab.StaveProfile.Score,
        scale: 0.95,
      },
    };
    if (Number.isFinite(this.data.barsPerRow) && this.data.barsPerRow > 0) {
      const layoutMode = window.alphaTab.SystemsLayoutMode?.Model ?? 1;
      settings.display.systemsLayoutMode = layoutMode;
    }
    this.container.textContent = this.alphaTexBuilder.buildAlphaTex(this.data);
    new window.alphaTab.AlphaTabApi(this.container, settings);
  }
}

export default RhythmScoreRenderer;
