import { describe, expect, it } from "vitest";

import { chessSquareAt, chessSquareName, isChessDrawClaim } from "./board";

describe("chess board helpers", () => {
  it("names squares by file and rank counted from 0, a1 to h8", () => {
    expect(chessSquareName(0, 0)).toBe("a1");
    expect(chessSquareName(4, 1)).toBe("e2");
    expect(chessSquareName(7, 7)).toBe("h8");
  });

  it("names the squares of the board in the order a1, b1, …, h8", () => {
    expect(
      Array.from({ length: 64 }, (_unused, index) => chessSquareAt(index)).slice(0, 9),
    ).toEqual(["a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1", "a2"]);
    expect(chessSquareAt(60)).toBe("e8");
    expect(chessSquareAt(63)).toBe("h8");
  });

  it.each([
    [8, 0],
    [0, 8],
    [-1, 0],
    [0, 1.5],
  ])("refuses file %d, rank %d", (file, rank) => {
    expect(() => chessSquareName(file, rank)).toThrow(RangeError);
  });

  it("tells a draw claim from a piece move", () => {
    expect(isChessDrawClaim({ type: "claim-draw" })).toBe(true);
    expect(isChessDrawClaim({ from: "e2", to: "e4" })).toBe(false);
    expect(isChessDrawClaim({ from: "e7", to: "e8", promotion: "q" })).toBe(false);
  });
});
