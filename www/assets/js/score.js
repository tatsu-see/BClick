/**
 * score.js
 * alphaTabで2小節のリズム譜 (4/4, 四分音符×4) を表示する。
 */

document.addEventListener("DOMContentLoaded", () => {
  if (!window.alphaTab) return;

  const container = document.getElementById("score");
  if (!container) return;
  container.textContent = "";

  const alphaTex = [
    "\\title \"Rhythm\"",
    ".",
    ":4 0.6 { slashed } 0.6 { slashed } 0.6 { slashed } 0.6 { slashed } |",
    "   0.6 { slashed } 0.6 { slashed } 0.6 { slashed } 0.6 { slashed } |",
  ].join("\n");

  const settings = {
    tex: true,
    display: {
      staveProfile: window.alphaTab.StaveProfile.Score,
    },
    notation: {
      rhythmMode: window.alphaTab.TabRhythmMode.Hidden,
    },
  };

  container.textContent = alphaTex;
  new window.alphaTab.AlphaTabApi(container, settings);
});
