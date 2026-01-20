/**
 * リズムプレビューをABCJSで描画するクラス
 */
class RhythmPreviewRenderer {
  /**
   * @param {HTMLElement} container
   * @param {Function} getTimeSignature
   * @param {Function} buildTokens
   */
  constructor(container, getTimeSignature, buildTokens) {
    this.container = container;
    this.getTimeSignature = getTimeSignature;
    this.buildTokens = buildTokens;
  }

  /**
   * 連桁表示のためにABCJS用の文字列を生成する。
   */
  buildBeamedNotes(tokens) {
    const noteToAbc = (token) => {
      const length = token.length === 1 ? "" : token.length.toString();
      if (token.type === "rest") {
        return `z${length}`;
      }
      return `B${length}`;
    };

    const groups = [];
    let currentGroup = [];

    tokens.forEach((token) => {
      const isBeamCandidate = token.type === "note" && token.length <= 2;
      if (isBeamCandidate) {
        currentGroup.push(token);
        return;
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      groups.push([token]);
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups
      .map((group) => {
        if (group.length >= 2) {
          return group.map((token) => noteToAbc(token)).join("");
        }
        return noteToAbc(group[0]);
      })
      .join(" ");
  }

  /**
   * プレビューを描画する。
   */
  render(patternItem) {
    if (!this.container || !window.ABCJS) return;
    const timeSignature = this.getTimeSignature ? this.getTimeSignature() : "4/4";
    const tokens = this.buildTokens ? this.buildTokens(patternItem) : [];
    const notes = this.buildBeamedNotes(tokens);
    const abcText = [
      "X:1",
      "L:1/16",
      "%%stretchlast 1",
      "%%stemdir up",
      "%%stafflines 1",
      `M:${timeSignature}`,
      "K:C",
      "V:1 clef=none stafflines=1 stem=up",
      `| ${notes} |`,
    ].join("\n");

    this.container.textContent = "";
    window.ABCJS.renderAbc(this.container, abcText, {
      add_classes: true,
      responsive: "resize",
      staffwidth: 140,
    });
  }
}

export default RhythmPreviewRenderer;
