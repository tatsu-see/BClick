/**
 * AlphaTexBuilder.js
 * スコアデータから alphaTex 文字列を生成するクラス
 */

class AlphaTexBuilder {
  /**
   * コード表記から危険文字を取り除く。
   * @param {string} value
   * @returns {string}
   */
  sanitizeChordLabel(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.replace(/["\\]/g, "");
  }

  /**
   * コード進行を配列に正規化する。
   * @param {string[] | string} value
   * @returns {string[]}
   */
  normalizeProgression(value) {
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === "string" && item.length > 0);
    }
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.split(/\s+/) : [];
  }

  /**
   * alphaTab に表示する楽譜用の文字列を作成する。
   * @param {object} params
   * @param {string} params.timeSignature
   * @param {number} params.measures
   * @param {number|null} params.barsPerRow
   * @param {string[]|string} params.progression
   * @param {Array} params.bars
   * @returns {string}
   */
  buildAlphaTex({ timeSignature, measures, barsPerRow, progression, bars, tempo } = {}) {
    const signature = typeof timeSignature === "string" ? timeSignature : "4/4";
    const [numeratorRaw, denominatorRaw] = signature.split("/");
    const numeratorValue = Number.parseInt(numeratorRaw, 10);
    const denominatorValue = Number.parseInt(denominatorRaw, 10);
    const numerator = Number.isNaN(numeratorValue) || numeratorValue <= 0 ? 4 : numeratorValue;
    const denominator = Number.isNaN(denominatorValue) || denominatorValue <= 0 ? 4 : denominatorValue;
    const beats = numerator;
    const barSource = Array.isArray(bars) && bars.length > 0 ? bars : null;
    const barCount = barSource ? barSource.length : Number.isFinite(measures) ? measures : 2;
    const progressionList = this.normalizeProgression(progression);
    const progressionSource = progressionList.length > 0 ? progressionList : null;

    /**
     * 16分パターンから表示用トークンを作る。
     * Step1/Step2 の仕様（Specコメント）に合わせて変換する。
     * @param {string[]} pattern
     * @returns {{type: string, len: number, tieFromPrev?: boolean, tieToNext?: boolean}[]}
     */
    const buildSixteenthDisplayTokens = (pattern) => {
      // Step1: 16分音符(休符)＋タイ付きで情報を作成する。
      const step1 = [];
      let prevType = null;
      pattern.forEach((value, index) => {
        if (value === "rest") {
          step1.push({ type: "rest", len: 1 });
          prevType = "rest";
          return;
        }
        if (value === "tie") {
          if (prevType === "rest") {
            // 休符の後ろにタイが来た場合は休符が続く扱いにする。
            step1.push({ type: "rest", len: 1 });
            prevType = "rest";
            return;
          }
          if (step1.length > 0 && step1[step1.length - 1].type === "note") {
            step1[step1.length - 1].tieToNext = true;
          }
          step1.push({ type: "note", len: 1, tieFromPrev: true });
          prevType = "note";
          return;
        }
        if (index === 0 && value === "tieNote") {
          step1.push({ type: "note", len: 1, tieFromPrev: true });
          prevType = "note";
          return;
        }
        step1.push({ type: "note", len: 1 });
        prevType = "note";
      });

      // Step2: 特定パターンは8分音符へ置換する。
      const normalized = pattern.map((value, index) => {
        if (value === "rest") return "rest";
        if (index === 0 && value === "tieNote") return "note";
        return value === "tie" ? "tie" : "note";
      });

      let replaced = null;
      const key = normalized.join("");
      if (!normalized.includes("rest")) {
        const firstTieFromPrev = step1[0]?.tieFromPrev === true;
        switch (key) {
          case "notetienotenote":
            replaced = [
              { type: "note", len: 2, tieFromPrev: firstTieFromPrev },
              { type: "note", len: 1 },
              { type: "note", len: 1 },
            ];
            break;
          case "notetietienote":
            replaced = [
              { type: "note", len: 3, tieFromPrev: firstTieFromPrev },
              { type: "note", len: 1 },
            ];
            break;
          case "notenotetietie":
            replaced = [
              { type: "note", len: 1, tieFromPrev: firstTieFromPrev },
              { type: "note", len: 3 },
            ];
            break;
          case "notenotenotetie":
            replaced = [
              { type: "note", len: 1, tieFromPrev: firstTieFromPrev },
              { type: "note", len: 1 },
              { type: "note", len: 2 },
            ];
            break;
          case "notenotetienote":
            replaced = [
              { type: "note", len: 1, tieFromPrev: firstTieFromPrev },
              { type: "note", len: 2 },
              { type: "note", len: 1 },
            ];
            break;
          default:
            break;
        }
      }

      const baseTokens = replaced || step1;
      const merged = [];
      for (let i = 0; i < baseTokens.length; i += 1) {
        const current = baseTokens[i];
        const next = baseTokens[i + 1];
        const next2 = baseTokens[i + 2];
        const next3 = baseTokens[i + 3];
        if (
          current?.type === "rest" &&
          next?.type === "rest" &&
          next2?.type === "rest" &&
          next3?.type === "rest" &&
          current.len === 1 &&
          next.len === 1 &&
          next2.len === 1 &&
          next3.len === 1
        ) {
          merged.push({ type: "rest", len: 4 });
          i += 3;
          continue;
        }
        if (
          current?.type === "rest" &&
          next?.type === "rest" &&
          current.len === 1 &&
          next.len === 1
        ) {
          merged.push({ type: "rest", len: 2 });
          i += 1;
          continue;
        }
        merged.push(current);
      }

      // tieFromPrev を前の音符の tieToNext に反映する。
      for (let i = 0; i < merged.length; i += 1) {
        const current = merged[i];
        const prev = merged[i - 1];
        if (current?.tieFromPrev && prev?.type === "note") {
          prev.tieToNext = true;
        }
      }
      return merged;
    };

    /**
     * 16分表示用トークンを alphaTex 文字列へ変換する。
     * @param {object} token
     * @param {string} chordLabel
     * @param {boolean} attachChord
     * @returns {string}
     */
    const toSixteenthAlphaTex = (token, chordLabel, attachChord) => {
      const duration = token.len === 1 ? 16
        : token.len === 2 ? 8
          : token.len === 3 ? 8
            : token.len === 4 ? 4
              : 16;
      const dotted = token.len === 3;
      const props = [
        "slashed",
        dotted ? "d" : null,
        attachChord && chordLabel ? `ch "${chordLabel}"` : null,
      ].filter(Boolean).join(" ");
      return token.type === "rest"
        ? `r.${duration} { ${props} }`
        : `C4.${duration} { ${props} }`;
    };

    const barTokens = [];
    let lastBeatDivision = 4;
    for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
      const notes = [];
      const barData = barSource ? barSource[barIndex] : null;
      const getBeatLength = (duration) => {
        if (duration === "16") return 0.25;
        if (duration === "8") return 0.5;
        if (duration === "4") return 1;
        if (duration === "2") return 2;
        if (duration === "1") return 4;
        return 1;
      };
      const normalizeBeatChords = (value) => {
        if (Array.isArray(value)) {
          const normalized = value.map((item) => (typeof item === "string" ? item : ""));
          while (normalized.length < beats) {
            normalized.push("");
          }
          return normalized.slice(0, beats);
        }
        if (typeof value === "string" && value.length > 0) {
          return Array.from({ length: beats }, (_, index) => (index === 0 ? value : ""));
        }
        return Array.from({ length: beats }, () => "");
      };
      const buildBeatChords = () => {
        if (barData && barData.chord) {
          return normalizeBeatChords(barData.chord);
        }
        const fallback = progressionSource ? progressionSource[barIndex % progressionSource.length] : "";
        return normalizeBeatChords(fallback);
      };
      const beatChords = buildBeatChords().map((value) => this.sanitizeChordLabel(value));
      let beatIndex = 0;
      let beatProgress = 0;
      let currentBeatDivision = 4;
      let chordAttached = false;
      const rhythm = barData && Array.isArray(barData.rhythm) && barData.rhythm.length > 0
        ? barData.rhythm
        : Array.from({ length: beats }, () => "4");
      let lastNoteIndex = null;

      // 小節内のリズム配列を順に走査して alphaTex の音符列を構築する。
      for (let rhythmIndex = 0; rhythmIndex < rhythm.length; rhythmIndex += 1) {
        const value = rhythm[rhythmIndex];
        let duration = "4";
        if (value.endsWith("16")) {
          duration = "16";
        } else if (value.endsWith("8")) {
          duration = "8";
        } else if (value.endsWith("4")) {
          duration = "4";
        } else if (value.endsWith("2")) {
          duration = "2";
        } else if (value.endsWith("1")) {
          duration = "1";
        }
        const isRest = value.startsWith("r");
        const isTie = value.startsWith("t");
        const isBarHead = beatIndex === 0 && beatProgress === 0;

        if (beatProgress === 0) {
          currentBeatDivision = Number.parseInt(duration, 10);
        }
        const beatChordLabel = beatChords[beatIndex] || "";
        const beatLength = getBeatLength(duration);

        if (duration === "16" && beatProgress === 0) {
          const slice = rhythm.slice(rhythmIndex, rhythmIndex + 4);
          const pattern = slice.map((raw, index) => {
            if (typeof raw !== "string") return "note";
            if (raw.startsWith("r")) return "rest";
            if (raw.startsWith("t")) return index === 0 ? "tieNote" : "tie";
            return "note";
          });
          const displayTokens = buildSixteenthDisplayTokens(pattern);
          displayTokens.forEach((token) => {
            const isBarHead = beatIndex === 0 && beatProgress === 0;
            const noteText = toSixteenthAlphaTex(
              token,
              beatChordLabel,
              !chordAttached,
            );
            if (token.type === "note" && beatChordLabel && !chordAttached) {
              chordAttached = true;
            }
            if (token.tieFromPrev && isBarHead && barIndex > 0) {
              const needsDivision = currentBeatDivision !== lastBeatDivision;
              const tieToken = needsDivision
                ? `:${currentBeatDivision} - { slashed }`
                : "- { slashed }";
              notes.push(tieToken);
            }
            notes.push(noteText);
            if (token.tieToNext) {
              const needsDivision = currentBeatDivision !== lastBeatDivision;
              const tieToken = needsDivision
                ? `:${currentBeatDivision} - { slashed }`
                : "- { slashed }";
              notes.push(tieToken);
            }
            lastNoteIndex = token.type === "note" ? notes.length - 1 : null;
            beatProgress += token.len / 4;

            while (beatProgress >= 0.999) {
              beatIndex = Math.min(beatIndex + 1, beats - 1);
              beatProgress -= 1;
              lastBeatDivision = currentBeatDivision;
              chordAttached = false;
              if (beatIndex >= beats - 1 && beatProgress > 0.999) {
                beatProgress = 0;
                break;
              }
            }
          });
          rhythmIndex += 3;
          continue;
        }

        let handledTie = false;
        if (isTie) {
          if (lastNoteIndex !== null) {
            const divisionToken = currentBeatDivision !== lastBeatDivision
              ? ` :${currentBeatDivision}`
              : "";
            notes[lastNoteIndex] = `${notes[lastNoteIndex]}${divisionToken} - { slashed }`;
            beatProgress += beatLength;
            handledTie = true;
          } else if (isBarHead && barIndex > 0) {
            const divisionToken = currentBeatDivision !== lastBeatDivision
              ? `:${currentBeatDivision} `
              : "";
            notes.push(`${divisionToken}- { slashed }`);
            beatProgress += beatLength;
            handledTie = true;
          }
        }

        if (handledTie) {
          while (beatProgress >= 0.999) {
            beatIndex = Math.min(beatIndex + 1, beats - 1);
            beatProgress -= 1;
            lastBeatDivision = currentBeatDivision;
            chordAttached = false;
            if (beatIndex >= beats - 1 && beatProgress > 0.999) {
              beatProgress = 0;
              break;
          }
        }
          continue;
        }

        if (isRest) {
          let noteValue = "r.4";
          if (duration === "16") {
            noteValue = "r.16";
          } else if (duration === "8") {
            noteValue = "r.8";
          } else if (duration === "4") {
            noteValue = "r.4";
          } else if (duration === "2") {
            noteValue = "r.2";
          } else if (duration === "1") {
            noteValue = "r.1";
        }
          const noteText = `${noteValue} { slashed }`;
          notes.push(noteText);
          lastNoteIndex = null;
          beatProgress += beatLength;
        } else {
          let noteValue = "C4.4";
          if (duration === "16") {
            noteValue = "C4.16";
          } else if (duration === "8") {
            noteValue = "C4.8";
          } else if (duration === "4") {
            noteValue = "C4.4";
          } else if (duration === "2") {
            noteValue = "C4.2";
          } else if (duration === "1") {
            noteValue = "C4.1";
        }
          let props = "slashed";
          if (beatChordLabel && !chordAttached) {
            props += ` ch "${beatChordLabel}"`;
            chordAttached = true;
          }
          const noteText = `${noteValue} { ${props} }`;
          notes.push(noteText);
          lastNoteIndex = notes.length - 1;
          beatProgress += beatLength;
        }

        while (beatProgress >= 0.999) {
          beatIndex = Math.min(beatIndex + 1, beats - 1);
          beatProgress -= 1;
          lastBeatDivision = currentBeatDivision;
          chordAttached = false;
          if (beatIndex >= beats - 1 && beatProgress > 0.999) {
            beatProgress = 0;
            break;
          }
        }
      }
      barTokens.push(notes.join(" "));
    }

    const layoutLine = Number.isFinite(barsPerRow) && barsPerRow > 0
      ? `\\track { defaultSystemsLayout ${barsPerRow} }`
      : null;
    const tempoValue = Number.parseInt(tempo, 10);
    const tempoLine = Number.isFinite(tempoValue) && tempoValue > 0
      ? `\\tempo ${tempoValue}`
      : null;

    const alphaTex = [
      layoutLine,
      tempoLine,
      `\\ts ${numerator} ${denominator}`,
      ".",
      `:${denominator} ${barTokens.join(" | ")} |`,
    ].filter(Boolean).join("\n");

    // ●DEBUG: alphaTabへ渡す最終alphaTex
    console.log("AlphaTexBuilder alphaTex:", alphaTex);

/*Spec（このコメントは消さないこと）
  alphaTex に渡す文字列の例）4/4拍の場合、１小節部のみ

  ・4部音符4つ。
  :4 C4.4 { slashed ch "D" } C4.4 { slashed } C4.4 { slashed } C4.4 { slashed } |

  ・4部音符4つ、2拍目にタイ。
  ::4 C4.4 { slashed ch "D" } - { slashed } C4.4 { slashed } C4.4 { slashed } |

  ・先頭4部音符、後は8分音符。
  :4 C4.4 { slashed ch "D" } C4.8 { slashed } C4.8 { slashed } C4.8 { slashed } C4.8 { slashed } C4.8 { slashed } C4.8 { slashed } |

  ・先頭4部音符、2拍目にタイを付けて後は8分音符。
  :4 C4.4 { slashed ch "D" } :8 - { slashed } C4.8 { slashed } C4.8 { slashed } C4.8 { slashed } C4.8 { slashed } C4.8 { slashed } |

  ・先頭16分音符、後は4部音符で2拍目にタイを付ける。
  :4 C4.16 { slashed ch "D" } C4.16 { slashed } C4.16 { slashed } C4.16 { slashed } :4 - { slashed } C4.4 { slashed } C4.4 { slashed } |

  ・先頭16分音符（音符内2番目は⌒）、後は4部音符。
  :4 C4.8 { slashed ch "D" } C4.16 { slashed } C4.16 { slashed } C4.4 { slashed } C4.4 { slashed } C4.4 { slashed } |

  ・先頭16分音符（音符内2番目と4番目は⌒）、後は4部音符。
  :4 C4.16 { slashed ch "D" } - { slashed } C4.16 { slashed } - { slashed } C4.4 { slashed } C4.4 { slashed } C4.4 { slashed } |


  下記は console から変数値を更新するために使う。
  alphaTex = '\\track { defaultSystemsLayout 1 }\n\\tempo 62\n\\ts 4 4\n.\n' + ''
*/

    return alphaTex;
  }
}

export default AlphaTexBuilder;
