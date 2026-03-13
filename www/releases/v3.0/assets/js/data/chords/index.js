import { majorChordPositions } from "./maj.js?v=20260308";
import { minorChordPositions } from "./min.js?v=20260308";
import { dimChordPositions } from "./dim.js?v=20260308";
import { sus4ChordPositions } from "./sus4.js?v=20260308";

export {
  majorChordPositions,
  minorChordPositions,
  dimChordPositions,
  sus4ChordPositions,
};

export const chordPositions = {
  ...majorChordPositions,
  ...minorChordPositions,
  ...dimChordPositions,
  ...sus4ChordPositions,
};

