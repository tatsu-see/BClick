import { majorChordPositions } from "./maj.js";
import { minorChordPositions } from "./min.js";
import { dimChordPositions } from "./dim.js";
import { sus4ChordPositions } from "./sus4.js";

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
