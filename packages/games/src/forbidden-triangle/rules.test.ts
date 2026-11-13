import {
  createRng,
  createSession,
  currentState,
  ENGINE_ERROR,
  fromRecord,
  RECORD_VERSION,
  toRecord,
} from "@board-games/engine";
import { describeGameContract } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import {
  closesTriangle,
  forbiddenTriangle,
  type ForbiddenTriangleGuests,
  type ForbiddenTriangleState,
  lineCount,
  lineOf,
  pairOf,
  parseForbiddenTriangleOptions,
  safeLines,
} from "./rules";

describeGameContract(forbiddenTriangle, { seeds: [1, 2, 3, 4], maxPlies: 21 });
describeGameContract(forbiddenTriangle, { seeds: [5, 6], maxPlies: 21, options: { guests: 5 } });
describeGameContract(forbiddenTriangle, { seeds: [7, 8], maxPlies: 21, options: { guests: 7 } });

const [A, B, C, D, E] = [0, 1, 2, 3, 4];

function start(guests: ForbiddenTriangleGuests = 6): ForbiddenTriangleState {
  return forbiddenTriangle.setup({ playerCount: 2, options: { guests } });
}

/** Plays the lines joining each pair, in turn from Đỏ. */
function play(
  state: ForbiddenTriangleState,
  pairs: readonly (readonly [number, number])[],
): ForbiddenTriangleState {
  return pairs.reduce((current, [a, b]) => {
    const line = lineOf(current.guests, a, b);
    expect(forbiddenTriangle.legalMoves(current)).toContainEqual({ line });
    return forbiddenTriangle.applyMove(current, { line });
  }, state);
}

describe("Bàn và người chơi", () => {
  it("Ván mặc định: six guests, 15 lines undrawn, Đỏ to move", () => {
    const state = forbiddenTriangle.setup({
      playerCount: 2,
      options: forbiddenTriangle.defaultOptions,
    });
    expect(state.guests).toBe(6);
    expect(state.lines).toHaveLength(15);
    expect(forbiddenTriangle.legalMoves(state)).toHaveLength(15);
    expect(forbiddenTriangle.currentPlayer(state)).toBe(0);
  });

  it("has 10, 15 and 21 lines for 5, 6 and 7 guests", () => {
    expect([5, 6, 7].map(lineCount)).toEqual([10, 15, 21]);
    expect(start(7).lines).toHaveLength(21);
  });

  it("Số khách lạ: refuses other options", () => {
    expect(parseForbiddenTriangleOptions({ guests: 8 })).toBeNull();
    expect(parseForbiddenTriangleOptions({ guests: "6" })).toBeNull();
    expect(parseForbiddenTriangleOptions({ guests: 6, colours: 3 })).toBeNull();
    expect(parseForbiddenTriangleOptions({})).toEqual({ guests: 6 });
    expect(createSession(forbiddenTriangle, { playerCount: 2, options: { guests: 8 } })).toEqual({
      ok: false,
      error: ENGINE_ERROR.InvalidOptions,
    });
  });

  it("numbers every pair once, both ways", () => {
    for (const guests of [5, 6, 7]) {
      const seen = new Set<number>();
      for (let a = 0; a < guests; a += 1) {
        for (let b = a + 1; b < guests; b += 1) {
          const line = lineOf(guests, a, b);
          expect(lineOf(guests, b, a)).toBe(line);
          expect(pairOf(guests, line)).toEqual([a, b]);
          seen.add(line);
        }
      }
      expect(seen.size).toBe(lineCount(guests));
      expect(lineOf(guests, 2, 2)).toBe(-1);
      expect(lineOf(guests, 0, guests)).toBe(-1);
    }
  });
});

describe("Nối dây", () => {
  it("Lượt luân phiên: A–B is red, Xanh to move, and A–B no longer legal", () => {
    const state = play(start(), [[A, B]]);
    const line = lineOf(6, A, B);
    expect(state.lines[line]).toBe(0);
    expect(state.last).toBe(line);
    expect(forbiddenTriangle.currentPlayer(state)).toBe(1);
    expect(forbiddenTriangle.legalMoves(state)).not.toContainEqual({ line });
  });
});

describe("Thua khi khép tam giác", () => {
  it("Đỏ khép tam giác: Xanh wins, the triangle A–B–C", () => {
    const state = play(start(), [
      [A, B],
      [D, E],
      [B, C],
      [D, A],
      [A, C],
    ]);
    expect(forbiddenTriangle.result(state)).toEqual({
      kind: "win",
      winners: [1],
      reason: "triangle",
    });
    expect(state.lost).toEqual({ player: 0, triangle: [A, B, C] });
    expect(forbiddenTriangle.legalMoves(state)).toEqual([]);
  });

  it("Tam giác hai màu: Xanh closing a red corner goes on", () => {
    const state = play(start(), [
      [A, B],
      [D, E],
      [B, C],
      [A, C],
    ]);
    expect(forbiddenTriangle.result(state)).toBeNull();
    expect(state.lost).toBeNull();
  });

  it("tells the third guest of the triangle a line would close, and the safe lines left", () => {
    const state = play(start(), [
      [A, B],
      [D, E],
      [B, C],
    ]);
    expect(closesTriangle(state, 0, lineOf(6, A, C))).toBe(B);
    expect(closesTriangle(state, 1, lineOf(6, A, C))).toBeNull();
    // Đếm dây an toàn: 12 undrawn lines, one of them closing Đỏ's triangle.
    expect(safeLines(state, 0)).toHaveLength(11);
    expect(safeLines(state, 1)).toHaveLength(12);
  });
});

describe("Hoà khi hết dây", () => {
  it("Hoà ở bàn 5 khách: Đỏ the ring, Xanh the diagonals", () => {
    const ring = [
      [A, B],
      [B, C],
      [C, D],
      [D, E],
      [E, A],
    ] as const;
    const diagonals = [
      [A, C],
      [C, E],
      [E, B],
      [B, D],
      [D, A],
    ] as const;
    const state = play(
      start(5),
      ring.flatMap((pair, index) => [pair, diagonals[index] ?? pair]),
    );
    expect(forbiddenTriangle.result(state)).toEqual({ kind: "draw", reason: "full" });
  });

  it("Bàn 6 khách không hoà: 1,000 random games all end with a loser before the lines run out", () => {
    const rng = createRng(42);
    for (let game = 0; game < 1000; game += 1) {
      let state = start(6);
      while (forbiddenTriangle.result(state) === null) {
        const moves = forbiddenTriangle.legalMoves(state);
        state = forbiddenTriangle.applyMove(
          state,
          moves[rng.nextInt(0, moves.length - 1)] ?? { line: 0 },
        );
      }
      expect(forbiddenTriangle.result(state)?.kind).toBe("win");
    }
  });
});

describe("records", () => {
  it("rebuilds a game from its record, as a room stores it", () => {
    const created = createSession(forbiddenTriangle, { playerCount: 2, options: { guests: 7 } });
    if (!created.ok) throw new Error(created.error);
    const lines = [0, 5, 9, 14, 20];
    const record = {
      ...toRecord(created.value),
      version: RECORD_VERSION,
      entries: lines.map((line) => ({ move: { line } })),
    };
    const rebuilt = fromRecord(forbiddenTriangle, JSON.parse(JSON.stringify(record)));
    if (!rebuilt.ok) throw new Error(rebuilt.error);
    expect(currentState(rebuilt.value).lines.filter((owner) => owner !== null)).toHaveLength(5);
  });
});
