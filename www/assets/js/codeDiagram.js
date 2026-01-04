document.addEventListener("DOMContentLoaded", () => {
  const chordSelect = document.getElementById("chordSelect");
  const closeCodeDiagramButton = document.getElementById("closeCodeDiagram");

  const chordPositions = {
    C: [
      { string: 1, fret: 0 },
      { string: 2, fret: 1 },
      { string: 3, fret: 0 },
      { string: 4, fret: 2 },
      { string: 5, fret: 3 },
      { string: 6, fret: -1 },
    ],
    D: [
      { string: 1, fret: 2 },
      { string: 2, fret: 3 },
      { string: 3, fret: 2 },
      { string: 4, fret: 0 },
      { string: 5, fret: -1 },
      { string: 6, fret: -1 },
    ],
    E: [
      { string: 1, fret: 0 },
      { string: 2, fret: 0 },
      { string: 3, fret: 1 },
      { string: 4, fret: 2 },
      { string: 5, fret: 2 },
      { string: 6, fret: 0 },
    ],
    F: [
      { string: 1, fret: 1 },
      { string: 2, fret: 1 },
      { string: 3, fret: 2 },
      { string: 4, fret: 3 },
      { string: 5, fret: 3 },
    ],
    G: [
      { string: 1, fret: 3 },
      { string: 2, fret: 0 },
      { string: 5, fret: 2 },
      { string: 3, fret: 0 },
      { string: 4, fret: 0 },
      { string: 6, fret: 3 },
    ],
    A: [
      { string: 1, fret: 0 },
      { string: 2, fret: 2 },
      { string: 3, fret: 2 },
      { string: 4, fret: 2 },
      { string: 5, fret: 0 },
      { string: 6, fret: -1 },
    ],
    B: [
      { string: 1, fret: 2 },
      { string: 2, fret: 4 },
      { string: 3, fret: 4 },
      { string: 4, fret: 4 },
      { string: 5, fret: 2 },
      { string: 6, fret: -1 },
    ],
  };

  const clearFingers = () => {
    document.querySelectorAll(".fretCell .finger, .fretCell .mute").forEach((mark) => mark.remove());
  };

  const renderChord = (chordName) => {
    clearFingers();
    const positions = chordPositions[chordName];
    if (!positions) return;

    positions.forEach(({ string, fret }) => {
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

  if (closeCodeDiagramButton) {
    closeCodeDiagramButton.addEventListener("click", () => {
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }
});
