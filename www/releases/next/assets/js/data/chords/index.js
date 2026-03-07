import { majorChordPositions } from "./maj.js";
import { minorChordPositions } from "./min.js";
import { dimChordPositions } from "./dim.js";

export {
  majorChordPositions,
  minorChordPositions,
  dimChordPositions,
};

export const chordPositions = {
  ...majorChordPositions,
  ...minorChordPositions,
  ...dimChordPositions,
};
