import { ConfigStore } from "./store.js";
import { ensureInAppNavigation, goBackWithFallback } from "./navigationGuard.js";
import { isLanguage } from "../lib/Language.js";

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureInAppNavigation()) return;

  const store = new ConfigStore();
  const chordRootButtons = Array.from(document.querySelectorAll(".chordRoot"));
  const chordQualityButtons = Array.from(document.querySelectorAll(".chordQuality"));
  const closePageButton = document.getElementById("closePage");
  const saveButton = document.getElementById("saveCodeDiagram");
  const fretboard = document.querySelector(".fretboard");
  const MAX_FRET = 10;
  let currentChord = "";

  /**
   * 基本的なポジションデータを定義する。(簡易な抑え方法もあるけど、それは先生に教えてもらう。)
   */
  /*Spec
  ・標準フォームで表示する。
  ・転回形や省略形（構成音の一部やオクターブ違い）で、鳴らす方法もあるけど基本は標準フォームで表示する。
  ・フレットは、「実際に使うフレット範囲＋前後1フレット」の表示にして、見やすさを確保する。
  ・フレットは、（ひとまず）最大10フレットまで用意します。
  ・開放弦は0フレット目に○を表示。ミュート弦は0フレット目に×を表示します。
  ・例えば、使用するフレットが2~4フレットであったとしても、開放弦とミュート弦の表示は必ず表示します。
  */

  // https://hikigatarisuto-labo.jp/category/guitar-code/
  // https://www.aki-f.com/chordbook/item.php?id=0_28

  // メジャー
  const majorChordPositions = {
    C: {
      positions: [
        { string: 1, fret: 0 },
        { string: 2, fret: 1, finger: 1 },
        { string: 3, fret: 0 },
        { string: 4, fret: 2, finger: 2 },
        { string: 5, fret: 3, finger: 3 },
        { string: 6, fret: -1 },
      ],
    },
    D: {
      positions: [
        { string: 1, fret: 2, finger: 2 },
        { string: 2, fret: 3, finger: 3 },
        { string: 3, fret: 2, finger: 1 },
        { string: 4, fret: 0 },
        { string: 5, fret: -1 },
        { string: 6, fret: -1 },
      ],
    },
    E: {
      positions: [
        { string: 1, fret: 0 },
        { string: 2, fret: 0 },
        { string: 3, fret: 1, finger: 1 },
        { string: 4, fret: 2, finger: 2 },
        { string: 5, fret: 2, finger: 3 },
        { string: 6, fret: 0 },
      ],
    },
    F: {
      positions: [
        { string: 1, fret: 1, finger: 1 },
        { string: 2, fret: 1, finger: 1 },
        { string: 3, fret: 2, finger: 2 },
        { string: 4, fret: 3, finger: 4 },
        { string: 5, fret: 3, finger: 3 },
        { string: 6, fret: 1, finger: 1 },
      ],
      barres: [
        { fret: 1, fromString: 1, toString: 6 },
      ],
    },
    G: {
      positions: [
        { string: 1, fret: 3, finger: 4 },
        { string: 2, fret: 0 },
        { string: 5, fret: 2, finger: 2 },
        { string: 3, fret: 0 },
        { string: 4, fret: 0 },
        { string: 6, fret: 3, finger: 3 },
      ],
    },
    A: {
      positions: [
        { string: 1, fret: 0 },
        { string: 2, fret: 2, finger: 3 },
        { string: 3, fret: 2, finger: 2 },
        { string: 4, fret: 2, finger: 1 },
        { string: 5, fret: 0 },
        { string: 6, fret: -1 },
      ],
    },
    B: {
      positions: [
        { string: 1, fret: 2, finger: 1 },
        { string: 2, fret: 4, finger: 4 },
        { string: 3, fret: 4, finger: 3 },
        { string: 4, fret: 4, finger: 2 },
        { string: 5, fret: 2, finger: 1 },
        { string: 6, fret: -1 },
      ],
      barres: [
        { fret: 2, fromString: 1, toString: 5 },
      ],
    },
  };

  // マイナー
  const minorChordPositions = {
    Cm: {
      positions: [
        { string: 1, fret: 3, finger: 1 },
        { string: 2, fret: 4, finger: 2 },
        { string: 3, fret: 5, finger: 4 },
        { string: 4, fret: 5, finger: 3 },
        { string: 5, fret: 3, finger: 1 },
        { string: 6, fret: -1 },
      ],
      barres: [
        { fret: 3, fromString: 1, toString: 5 },
      ],
    },
    Dm: {
      positions: [
        { string: 1, fret: 1, finger: 1 },
        { string: 2, fret: 3, finger: 3 },
        { string: 3, fret: 2, finger: 2 },
        { string: 4, fret: 0 },
        { string: 5, fret: -1 },
        { string: 6, fret: -1 },
      ],
    },
    Em: {
      positions: [
        { string: 1, fret: 0 },
        { string: 2, fret: 0 },
        { string: 3, fret: 0 },
        { string: 4, fret: 2, finger: 3 },
        { string: 5, fret: 2, finger: 2 },
        { string: 6, fret: 0 },
      ],
    },
    Fm: {
      positions: [
        { string: 1, fret: 1, finger: 1 },
        { string: 2, fret: 1, finger: 1 },
        { string: 3, fret: 1, finger: 1 },
        { string: 4, fret: 3, finger: 4 },
        { string: 5, fret: 3, finger: 3 },
        { string: 6, fret: 1, finger: 1 },
      ],
      barres: [
        { fret: 1, fromString: 1, toString: 6 },
      ],
    },
    Gm: {
      positions: [
        { string: 1, fret: 3, finger: 1 },
        { string: 2, fret: 3, finger: 1 },
        { string: 3, fret: 3, finger: 1 },
        { string: 4, fret: 5, finger: 4 },
        { string: 5, fret: 5, finger: 3 },
        { string: 6, fret: 3, finger: 1 },
      ],
      barres: [
        { fret: 3, fromString: 1, toString: 6 },
      ],
    },
    Am: {
      positions: [
        { string: 1, fret: 0 },
        { string: 2, fret: 1, finger: 1 },
        { string: 3, fret: 2, finger: 3 },
        { string: 4, fret: 2, finger: 2 },
        { string: 5, fret: 0 },
        { string: 6, fret: -1 },
      ],
    },
    Bm: {
      positions: [
        { string: 1, fret: 2, finger: 1 },
        { string: 2, fret: 3, finger: 3 },
        { string: 3, fret: 4, finger: 4 },
        { string: 4, fret: 4, finger: 2 },
        { string: 5, fret: 2, finger: 1 },
        { string: 6, fret: 2, finger: 1 },
      ],
      barres: [
        { fret: 2, fromString: 1, toString: 6 },
      ],
    },
  };

  // ディミニッシュ
  const dimChordPositions = {
    Cdim: {
      positions: [
        { string: 1, fret: -1 },
        { string: 2, fret: 4, finger: 4 },
        { string: 3, fret: 2, finger: 1 },
        { string: 4, fret: 4, finger: 3 },
        { string: 5, fret: 3, finger: 2 },
        { string: 6, fret: -1 },
      ],
    },
    Ddim: {
      positions: [
        { string: 1, fret: 1, finger: 2 },
        { string: 2, fret: 0 },
        { string: 3, fret: 1, finger: 1 },
        { string: 4, fret: 0 },
        { string: 5, fret: -1 },
        { string: 6, fret: -1 },
      ],
    },
    Edim: {
      positions: [
        { string: 1, fret: 0 },
        { string: 2, fret: 2, finger: 3 },
        { string: 3, fret: 0 },
        { string: 4, fret: 2, finger: 2 },
        { string: 5, fret: 1, finger: 1 },
        { string: 6, fret: 0 },
      ],
    },
    Fdim: {
      positions: [
        { string: 1, fret: 1, finger: 2 },
        { string: 2, fret: 0 },
        { string: 3, fret: 1, finger: 1 },
        { string: 4, fret: 0 },
        { string: 5, fret: 0 },
        { string: 6, fret: 1, finger: 5 },
      ],
    },
    Gdim: {
      positions: [
        { string: 1, fret: -1 },
        { string: 2, fret: 2, finger: 1 },
        { string: 3, fret: 3, finger: 3 },
        { string: 4, fret: 2, finger: 1 },
        { string: 5, fret: -1 },
        { string: 6, fret: 3, finger: 2 },
      ],
      barres: [
        { fret: 2, fromString: 2, toString: 4 },
      ],
    },
    Adim: {
      positions: [
        { string: 1, fret: 2, finger: 3 },
        { string: 2, fret: 1, finger: 1 },
        { string: 3, fret: 2, finger: 2 },
        { string: 4, fret: 1, finger: 1 },
        { string: 5, fret: 0 },
        { string: 6, fret: -1 },
      ],
      barres: [
        { fret: 1, fromString: 2, toString: 4 },
      ],
    },
    Bdim: {
      positions: [
        { string: 1, fret: -1 },
        { string: 2, fret: 3, finger: 4 },
        { string: 3, fret: 1, finger: 1 },
        { string: 4, fret: 3, finger: 3 },
        { string: 5, fret: 2, finger: 2 },
        { string: 6, fret: -1 },
      ],
    },
  };

  const chordPositions = {
    ...majorChordPositions,
    ...minorChordPositions,
    ...dimChordPositions,
  };

  /**
   * 指番号・ミュート表示をクリアする。
   */
  const clearFingers = () => {
    document.querySelectorAll(".fretCell .finger, .fretCell .mute, .fretCell .open").forEach((mark) => mark.remove());
    document.querySelectorAll(".fretboard .barre").forEach((barre) => barre.remove());
  };

  /**
   * セーハ表示を描画する。
   */
  const renderBarres = (barres) => {
    if (!fretboard || !barres) return;
    const fretboardRect = fretboard.getBoundingClientRect();
    const barreWidth = 16;

    barres.forEach(({ fret, fromString, toString }) => {
      const startCell = document.getElementById(`fret-s${fromString}-f${fret}`);
      const endCell = document.getElementById(`fret-s${toString}-f${fret}`);
      if (!startCell || !endCell) return;

      const startRect = startCell.getBoundingClientRect();
      const endRect = endCell.getBoundingClientRect();
      const left = startRect.left - fretboardRect.left + (startRect.width - barreWidth) / 2;
      const top = startRect.top - fretboardRect.top + (startRect.height - barreWidth) / 2;
      const bottom = endRect.top - fretboardRect.top + (endRect.height - barreWidth) / 2;

      const barre = document.createElement("div");
      barre.className = "barre";
      barre.style.left = `${left}px`;
      barre.style.top = `${top}px`;
      barre.style.width = `${barreWidth}px`;
      barre.style.height = `${bottom - top + barreWidth}px`;
      fretboard.appendChild(barre);
    });
  };

  /**
   * フレットの表示範囲を更新する。
   */
  const updateFretboardRange = (chord) => {
    if (!fretboard || !chord) return;
    const frets = [];
    chord.positions.forEach(({ fret }) => {
      if (Number.isFinite(fret) && fret > 0) {
        frets.push(fret);
      }
    });
    (chord.barres || []).forEach(({ fret }) => {
      if (Number.isFinite(fret) && fret > 0) {
        frets.push(fret);
      }
    });
    const minFret = frets.length > 0 ? Math.min(...frets) : 1;
    const maxFret = frets.length > 0 ? Math.max(...frets) : 1;
    const displayMin = Math.max(1, minFret - 1);
    const displayMax = Math.min(MAX_FRET, maxFret + 1);
    const visibleCount = displayMax - displayMin + 2; // 0フレットを必ず含める
    fretboard.style.gridTemplateColumns = `repeat(${visibleCount}, 44px) 32px`;

    const fretCellRegex = /-f(\d+)$/;
    fretboard.querySelectorAll(".fretCell").forEach((cell) => {
      const match = cell.id.match(fretCellRegex);
      const fret = match ? Number.parseInt(match[1], 10) : null;
      const isVisible = Number.isFinite(fret)
        && (fret === 0 || (fret >= displayMin && fret <= displayMax));
      cell.classList.toggle("isHidden", !isVisible);
    });

    fretboard.querySelectorAll(".fretNumber").forEach((label) => {
      const fret = Number.parseInt(label.dataset.fret, 10);
      const isVisible = Number.isFinite(fret) && fret >= displayMin && fret <= displayMax;
      label.classList.toggle("isHidden", !isVisible);
    });
  };

  /**
   * コードの押さえ方を描画する。
   */
  const renderChord = (chordName) => {
    clearFingers();
    const chord = chordPositions[chordName];
    if (!chord) return;
    currentChord = chordName;
    updateFretboardRange(chord);
    renderBarres(chord.barres);
    const fingerLabelMap = isLanguage("ja")
      ? { 1: "人", 2: "中", 3: "薬", 4: "小", 5: "親" }
      : null;
    const barreFrets = new Set(
      (chord.barres || []).map((barre) => barre.fret),
    );

    chord.positions.forEach(({ string, fret, finger }) => {
      if (fret < 0) {
        const mark = document.createElement("span");
        mark.className = "mute";
        const cell = document.getElementById(`fret-s${string}-f0`);
        if (cell) {
          cell.appendChild(mark);
        }
        return;
      }
      if (fret === 0) {
        const openMark = document.createElement("span");
        openMark.className = "open";
        const cell = document.getElementById(`fret-s${string}-f0`);
        if (cell) {
          cell.appendChild(openMark);
        }
        return;
      }
      const targetFret = fret;
      const cell = document.getElementById(`fret-s${string}-f${targetFret}`);
      if (!cell) return;
      const dot = document.createElement("span");
      dot.className = "finger";
      if (fret > 0 && Number.isFinite(finger) && finger > 0) {
        const label = document.createElement("span");
        label.className = "fingerLabel";

        //Spec 日本語の場合は、指番号を漢字に置き換えて描画する。
        label.textContent = fingerLabelMap?.[finger] || String(finger);
        dot.appendChild(label);
      }
      cell.appendChild(dot);
    });
  };

  /**
   * コード品質ボタンの選択状態を切り替える。
   */
  const setActiveQuality = (button) => {
    chordQualityButtons.forEach((qualityButton) => {
      const isActive = qualityButton === button;
      qualityButton.classList.toggle("isActive", isActive);
      qualityButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  /**
   * ルートボタンの選択状態を切り替える。
   */
  const setActiveRoot = (button) => {
    chordRootButtons.forEach((rootButton) => {
      const isActive = rootButton === button;
      rootButton.classList.toggle("isActive", isActive);
      rootButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  /**
   * 選択中のコード品質ボタンを取得する。
   */
  const getActiveQuality = () =>
    chordQualityButtons.find((button) => button.classList.contains("isActive"));

  /**
   * 選択中のルートボタンを取得する。
   */
  const getActiveRoot = () =>
    chordRootButtons.find((button) => button.classList.contains("isActive"));

  /**
   * 選択中のルート/品質からコード名を生成する。
   */
  const buildChordName = () => {
    const rootButton = getActiveRoot();
    const qualityButton = getActiveQuality();
    if (!rootButton || !qualityButton) return null;
    const root = rootButton.dataset.root || rootButton.textContent.trim();
    const quality = qualityButton.dataset.quality || "maj";
    const suffix = quality === "min" ? "m" : quality === "dim" ? "dim" : "";
    return `${root}${suffix}`;
  };

  chordQualityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveQuality(button);
      const chordName = buildChordName();
      if (chordName) renderChord(chordName);
    });
  });

  chordRootButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRoot(button);
      const chordName = buildChordName();
      if (chordName) renderChord(chordName);
    });
  });

  const savedChord = store.getCodeDiagramChord();
  if (savedChord) {
    const isDim = savedChord.endsWith("dim");
    const isMinor = !isDim && savedChord.endsWith("m");
    const rootValue = isDim
      ? savedChord.slice(0, -3)
      : isMinor
        ? savedChord.slice(0, -1)
        : savedChord;
    const qualityValue = isDim ? "dim" : isMinor ? "min" : "maj";
    const rootButton =
      chordRootButtons.find((button) => (button.dataset.root || button.textContent.trim()) === rootValue)
      || chordRootButtons[0];
    const qualityButton =
      chordQualityButtons.find((button) => button.dataset.quality === qualityValue)
      || chordQualityButtons[0];
    if (rootButton) setActiveRoot(rootButton);
    if (qualityButton) setActiveQuality(qualityButton);
    renderChord(savedChord);
  } else {
    const defaultRoot = chordRootButtons[0];
    const defaultQuality = chordQualityButtons[0];
    if (defaultRoot) setActiveRoot(defaultRoot);
    if (defaultQuality) setActiveQuality(defaultQuality);
    const chordName = buildChordName();
    if (chordName) renderChord(chordName);
  }

  /**
   * 1つ前の画面へ戻る。
   */
  const goBack = () => {
    goBackWithFallback();
  };

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      goBack();
    });
  }

  /**
   * 選択中のコードを保存して戻る。
   */
  const saveAndGoBack = () => {
    if (currentChord) {
      store.setCodeDiagramChord(currentChord);
    }
    goBack();
  };

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      saveAndGoBack();
    });
  }
});
