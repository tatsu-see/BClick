
// コード
// ギターのコードは 「三和音」「四和音」「テンション」「分数」「変化系」に分類されるらしい。
// 三和音系（トライアド）が基本らしいので、まずそこから使う。
export const naturalMajorChordPool = ["C", "D", "E", "F", "G", "A", "B"];
export const naturalMinorChordPool = ["Cm", "Dm", "Em", "Fm", "Gm", "Am", "Bm"];
export const naturalChordPool = [...naturalMajorChordPool, ...naturalMinorChordPool];

export const sharpMajorChordPool = ["C#", "F#", "G#", "A#"];
export const sharpMinorChordPool = ["C#m", "D#m", "F#m", "G#m", "A#m"];
export const sharpChordPool = [...sharpMajorChordPool, ...sharpMinorChordPool];

export const flatMajorChordPool = ["Db", "Eb", "Gb", "Ab", "Bb", "Cb"];
export const flatMinorChordPool = ["Ebm", "Abm", "Bbm"];
export const flatChordPool = [...flatMajorChordPool, ...flatMinorChordPool];

export const chordPool = naturalMajorChordPool;

// コード対応するフレットを押す場所を定義する。