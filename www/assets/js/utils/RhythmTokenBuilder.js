/**
 * リズムパターンからABCJS用のトークンを生成するクラス
 */
class RhythmTokenBuilder {
  /**
   * リズムパターンからABCJS用のトークンを生成する。
   * @param {{ division: number, pattern: string[] }} patternItem
   * @returns {{ type: string, length: number, tieFromPrev?: boolean, tieToNext?: boolean }[]}
   */
  buildAbcTokens(patternItem) {
    const division = patternItem.division;
    const pattern = Array.isArray(patternItem.pattern) ? patternItem.pattern : ["note"];
    let unit = 4;
    if (division === 1) {
      unit = 16;
    } else if (division === 2) {
      unit = 8;
    } else if (division === 4) {
      unit = 4;
    } else if (division === 8) {
      unit = 2;
    } else {
      unit = 1;
    }

    const tokens = [];
    let lastToken = null;

    const pushToken = (type, length) => {
      const token = { type, length };
      tokens.push(token);
      lastToken = token;
      return token;
    };

    const pushTieNote = () => {
      const token = pushToken("note", unit);
      token.tieFromPrev = true;
      return token;
    };

    const pushNoteWithTie = (length, tieFromPrev, tieToNext) => {
      const token = pushToken("note", length);
      if (tieFromPrev) token.tieFromPrev = true;
      if (tieToNext) token.tieToNext = true;
      return token;
    };

    const handleTie = () => {
      if (lastToken && lastToken.type === "note") {
        lastToken.tieToNext = true;
        return pushToken("note", unit);
      }
      if (lastToken && lastToken.type === "rest") {
        lastToken.length += unit;
        return lastToken;
      }
      return pushToken("rest", unit);
    };

    const handleSingleToken = (value) => {
      if (value === "rest") {
        pushToken("rest", unit);
        return;
      }
      if (value === "tieNote") {
        pushTieNote();
        return;
      }
      pushToken("note", unit);
    };

    /**
     * 16分音符のパターンからABCJS用のトークンを生成する。
     * @param {string[]} patternValues
     */
    const buildSixteenthTokens = (patternValues) => {
      // Step1: 16分音符(休符)＋タイ付きで情報を作成する。
      const step1 = [];
      let prevType = null;
      patternValues.forEach((value, index) => {
        if (value === "rest") {
          step1.push({ type: "rest", length: unit });
          prevType = "rest";
          return;
        }
        if (value === "tie") {
          if (prevType === "rest") {
            // 休符の後ろにタイが来た場合は休符が続く扱いにする。
            step1.push({ type: "rest", length: unit });
            prevType = "rest";
            return;
          }
          if (step1.length > 0 && step1[step1.length - 1].type === "note") {
            step1[step1.length - 1].tieToNext = true;
          }
          step1.push({ type: "note", length: unit, tieFromPrev: true });
          prevType = "note";
          return;
        }
        if (index === 0 && value === "tieNote") {
          step1.push({ type: "note", length: unit, tieFromPrev: true });
          prevType = "note";
          return;
        }
        step1.push({ type: "note", length: unit });
        prevType = "note";
      });

      // Step2: 特定パターンは8分音符へ置換する。
      const normalized = patternValues.map((value, index) => {
        if (value === "rest") return "rest";
        if (index === 0 && value === "tieNote") return "note";
        return value === "tie" ? "tie" : "note";
      });
      const key = normalized.join("");
      const firstTieFromPrev = step1[0]?.tieFromPrev === true;
      let replaced = null;

      if (!normalized.includes("rest")) {
        switch (key) {
          case "notetienotenote":
            replaced = [
              { type: "note", length: unit * 2, tieFromPrev: firstTieFromPrev },
              { type: "note", length: unit },
              { type: "note", length: unit },
            ];
            break;
          case "notetietienote":
            replaced = [
              { type: "note", length: unit * 3, tieFromPrev: firstTieFromPrev },
              { type: "note", length: unit },
            ];
            break;
          case "notenotetietie":
            replaced = [
              { type: "note", length: unit, tieFromPrev: firstTieFromPrev },
              { type: "note", length: unit * 3 },
            ];
            break;
          case "notenotenotetie":
            replaced = [
              { type: "note", length: unit, tieFromPrev: firstTieFromPrev },
              { type: "note", length: unit },
              { type: "note", length: unit * 2 },
            ];
            break;
          case "notenotetienote":
            replaced = [
              { type: "note", length: unit, tieFromPrev: firstTieFromPrev },
              { type: "note", length: unit * 2 },
              { type: "note", length: unit },
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
          current.type === "rest" &&
          next?.type === "rest" &&
          next2?.type === "rest" &&
          next3?.type === "rest" &&
          current.length === unit &&
          next.length === unit &&
          next2.length === unit &&
          next3.length === unit
        ) {
          merged.push({ type: "rest", length: unit * 4 });
          i += 3;
          continue;
        }
        if (
          current.type === "rest" &&
          next?.type === "rest" &&
          current.length === unit &&
          next.length === unit
        ) {
          merged.push({ type: "rest", length: unit * 2 });
          i += 1;
          continue;
        }
        merged.push(current);
      }

      for (let i = 0; i < merged.length; i += 1) {
        const current = merged[i];
        const prev = merged[i - 1];
        if (current?.tieFromPrev && prev?.type === "note") {
          prev.tieToNext = true;
        }
      }

      merged.forEach((token) => {
        const nextToken = pushToken(token.type, token.length);
        if (token.tieFromPrev) nextToken.tieFromPrev = true;
        if (token.tieToNext) nextToken.tieToNext = true;
      });
    };

    /**
     * 8分音符のパターンからABCJS用のトークンを生成する。
     * @param {string[]} patternValues
     */
    const buildEighthTokens = (patternValues) => {
      const baseTokens = [];
      patternValues.forEach((value, index) => {
        if (index === 0 && value === "tieNote") {
          baseTokens.push({ type: "note", length: unit, tieFromPrev: true });
          return;
        }
        if (value === "rest") {
          baseTokens.push({ type: "rest", length: unit });
          return;
        }
        baseTokens.push({ type: "note", length: unit });
      });

      // 8分休符が2つ連続する場合は4分休符に置換する（タイ情報は削除）
      const merged = [];
      for (let i = 0; i < baseTokens.length; i += 1) {
        const current = baseTokens[i];
        const next = baseTokens[i + 1];
        if (
          current.type === "rest" &&
          next?.type === "rest" &&
          current.length === unit &&
          next.length === unit
        ) {
          merged.push({ type: "rest", length: unit * 2 });
          i += 1;
          continue;
        }
        merged.push(current);
      }

      merged.forEach((token) => {
        const nextToken = pushToken(token.type, token.length);
        if (token.tieFromPrev) nextToken.tieFromPrev = true;
        if (token.tieToNext) nextToken.tieToNext = true;
      });
    };

    // 全音符/2分/4分は同じ処理、8分は専用関数で処理する
    switch (division) {
      case 1:
      case 2:
      case 4:
        handleSingleToken(pattern[0]);
        break;
      case 8:
        buildEighthTokens(pattern.slice(0, 2));
        break;
      case 16:
      default:
        buildSixteenthTokens(pattern.slice(0, 4));
        break;
    }
    return tokens;
  }
}

export default RhythmTokenBuilder;
