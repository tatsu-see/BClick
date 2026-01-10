document.addEventListener("DOMContentLoaded", () => {
  const chordSelect = document.getElementById("chordSelect");
  const minorChordSelect = document.getElementById("minorChordSelect");
  const closePageButton = document.getElementById("closePage");
  const fretboard = document.querySelector(".fretboard");

  /**
   * 基本的なポジションデータを定義する。(簡易な抑え方法もあるけど、それは先生に教えてもらう。)
   */

  // メジャーコード
  const majorChordPositions = {
    C: {
      positions: [
        { string: 1, fret: 0, finger: 0 },
        { string: 2, fret: 1, finger: 1 },
        { string: 3, fret: 0, finger: 0 },
        { string: 4, fret: 2, finger: 2 },
        { string: 5, fret: 3, finger: 3 },
        { string: 6, fret: -1, finger: null },
      ],
    },
    D: {
      positions: [
        { string: 1, fret: 2, finger: 2 },
        { string: 2, fret: 3, finger: 3 },
        { string: 3, fret: 2, finger: 1 },
        { string: 4, fret: 0, finger: 0 },
        { string: 5, fret: -1, finger: null },
        { string: 6, fret: -1, finger: null },
      ],
    },
    E: {
      positions: [
        { string: 1, fret: 0, finger: 0 },
        { string: 2, fret: 0, finger: 0 },
        { string: 3, fret: 1, finger: 1 },
        { string: 4, fret: 2, finger: 2 },
        { string: 5, fret: 2, finger: 3 },
        { string: 6, fret: 0, finger: 0 },
      ],
    },
    F: {
      positions: [
        { string: 3, fret: 2, finger: 2 },
        { string: 4, fret: 3, finger: 3 },
        { string: 5, fret: 3, finger: 4 },
      ],
      barres: [
        { fret: 1, fromString: 1, toString: 6 },
      ],
    },
    G: {
      positions: [
        { string: 1, fret: 3, finger: 3 },
        { string: 2, fret: 0, finger: 0 },
        { string: 5, fret: 2, finger: 1 },
        { string: 3, fret: 0, finger: 0 },
        { string: 4, fret: 0, finger: 0 },
        { string: 6, fret: 3, finger: 2 },
      ],
    },
    A: {
      positions: [
        { string: 1, fret: 0, finger: 0 },
        { string: 2, fret: 2, finger: 1 },
        { string: 3, fret: 2, finger: 2 },
        { string: 4, fret: 2, finger: 3 },
        { string: 5, fret: 0, finger: 0 },
        { string: 6, fret: -1, finger: null },
      ],
    },
    B: {
      positions: [
        { string: 2, fret: 4, finger: 3 },
        { string: 3, fret: 4, finger: 4 },
        { string: 4, fret: 4, finger: 2 },
        { string: 5, fret: 2, finger: 1 },
        { string: 6, fret: -1, finger: null },
      ],
      barres: [
        { fret: 2, fromString: 1, toString: 5 },
      ],
    },
  };

  // マイナーコード
  const minorChordPositions = {
    Cm: {
      positions: [
        { string: 1, fret: 3, finger: 1 },
        { string: 2, fret: 4, finger: 3 },
        { string: 3, fret: 5, finger: 4 },
        { string: 4, fret: 5, finger: 2 },
        { string: 5, fret: 3, finger: 1 },
        { string: 6, fret: -1, finger: null },
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
        { string: 4, fret: 0, finger: 0 },
        { string: 5, fret: -1, finger: null },
        { string: 6, fret: -1, finger: null },
      ],
    },
    Em: {
      positions: [
        { string: 1, fret: 0, finger: 0 },
        { string: 2, fret: 0, finger: 0 },
        { string: 3, fret: 0, finger: 0 },
        { string: 4, fret: 2, finger: 2 },
        { string: 5, fret: 2, finger: 3 },
        { string: 6, fret: 0, finger: 0 },
      ],
    },
    Fm: {
      positions: [
        { string: 1, fret: 1, finger: 1 },
        { string: 2, fret: 1, finger: 1 },
        { string: 3, fret: 1, finger: 1 },
        { string: 4, fret: 3, finger: 3 },
        { string: 5, fret: 3, finger: 4 },
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
        { string: 4, fret: 5, finger: 3 },
        { string: 5, fret: 5, finger: 4 },
        { string: 6, fret: 3, finger: 1 },
      ],
      barres: [
        { fret: 3, fromString: 1, toString: 6 },
      ],
    },
    Am: {
      positions: [
        { string: 1, fret: 0, finger: 0 },
        { string: 2, fret: 1, finger: 1 },
        { string: 3, fret: 2, finger: 2 },
        { string: 4, fret: 2, finger: 3 },
        { string: 5, fret: 0, finger: 0 },
        { string: 6, fret: -1, finger: null },
      ],
    },
    Bm: {
      positions: [
        { string: 1, fret: 2, finger: 1 },
        { string: 2, fret: 3, finger: 2 },
        { string: 3, fret: 4, finger: 3 },
        { string: 4, fret: 4, finger: 4 },
        { string: 5, fret: 2, finger: 1 },
        { string: 6, fret: 0, finger: 0 },
      ],
      barres: [
        { fret: 2, fromString: 1, toString: 5 },
      ],
    },
  };

  const chordPositions = {
    ...majorChordPositions,
    ...minorChordPositions,
  };

  const clearFingers = () => {
    document.querySelectorAll(".fretCell .finger, .fretCell .mute").forEach((mark) => mark.remove());
    document.querySelectorAll(".fretboard .barre").forEach((barre) => barre.remove());
  };

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

  const renderChord = (chordName) => {
    clearFingers();
    const chord = chordPositions[chordName];
    if (!chord) return;
    renderBarres(chord.barres);

    chord.positions.forEach(({ string, fret }) => {
      const targetFret = fret < 0 ? 0 : fret;
      const cell = document.getElementById(`fret-s${string}-f${targetFret}`);
      if (!cell) return;
      if (fret < 0) {
        const mark = document.createElement("span");
        mark.className = "mute";
        cell.appendChild(mark);
        return;
      }
      const dot = document.createElement("span");
      dot.className = fret === 0 ? "finger fingerOpen" : "finger";
      cell.appendChild(dot);
    });
  };

  if (chordSelect) {
    chordSelect.addEventListener("change", () => {
      renderChord(chordSelect.value);
    });
    renderChord(chordSelect.value);
  }

  if (minorChordSelect) {
    minorChordSelect.addEventListener("change", () => {
      renderChord(minorChordSelect.value);
    });
    // 初期表示はメジャーのまま
  }

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }
});
