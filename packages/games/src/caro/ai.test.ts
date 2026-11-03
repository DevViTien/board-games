import {
  AI_LEVEL,
  type AiLevel,
  chooseMove,
  createRng,
  type PlayerIndex,
} from "@board-games/engine";
import { expiresImmediately, neverExpires, playRandomGame } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { caroCandidateMoves, caroEvaluate, fiveCellWindows } from "./ai";
import { CANDIDATE_LIMIT, CANDIDATE_RADIUS } from "./constants";
import { caro, type CaroState } from "./rules";
import { cellAt, drawnPosition, lineOf, position, type RowCol, rowColOf } from "./test-positions";

const ALL_LEVELS = Object.values(AI_LEVEL);

function candidateCells(state: CaroState): number[] {
  return caroCandidateMoves(state).map((move) => move.cell);
}

function aiCell(state: CaroState, level: AiLevel, seed = 1, now = neverExpires()): number {
  const chosen = chooseMove(caro, state, { level, rng: createRng(seed), now, timeLimitMs: 1000 });
  if (!chosen.ok) throw new Error(chosen.error);
  return chosen.value.cell;
}

/** The distance in rows or columns, whichever is larger, from `cell` to the nearest stone. */
function distanceToStones(state: CaroState, cell: number): number {
  const [row, col] = rowColOf(state.size, cell);
  let nearest = Number.POSITIVE_INFINITY;
  state.board.forEach((stone, other) => {
    if (stone === null) return;
    const [r, c] = rowColOf(state.size, other);
    nearest = Math.min(nearest, Math.max(Math.abs(r - row), Math.abs(c - col)));
  });
  return nearest;
}

/** A crowded middle game: far more empty cells near the stones than the AI keeps. */
const CROWDED = [
  "...............",
  "...............",
  "...............",
  "...............",
  "...............",
  ".....X.O.X.....",
  "....O.X.O.X....",
  ".....X.O.X.O...",
  "....O.X.O.X....",
  ".....O.X.O.....",
];

describe("caro candidate moves", () => {
  it.each([
    [15, [8, 8]],
    [19, [10, 10]],
  ] as const)("are the centre alone on an empty board of size %i", (size, centre) => {
    expect(candidateCells(position({ size }, {}))).toEqual([cellAt(size, centre)]);
  });

  it("are empty cells at most two rows and columns from a stone", () => {
    for (const seed of [1, 2, 3]) {
      const { session } = playRandomGame(caro, {
        seed,
        playerCount: 2,
        maxPlies: 30,
        options: { size: 19, rule: "blocked-ends" },
      });
      for (const state of session.states.slice(1)) {
        if (caro.result(state) !== null) continue;
        for (const cell of candidateCells(state)) {
          expect(state.board[cell]).toBeNull();
          expect(distanceToStones(state, cell)).toBeLessThanOrEqual(CANDIDATE_RADIUS);
        }
      }
    }
  });

  it("keep at most the limit besides the forced cells, best first and always in the same order", () => {
    const state = drawnPosition({}, CROWDED, 0);
    const cells = candidateCells(state);

    expect(cells).toHaveLength(CANDIDATE_LIMIT);
    expect(candidateCells(JSON.parse(JSON.stringify(state)) as CaroState)).toEqual(cells);
  });

  it("always include a cell where the opponent makes five, even far down the order", () => {
    // O has four on row 12, blocked by X on the left: (12, 7) makes five, on the rim of the stones.
    const state = drawnPosition(
      {},
      [...CROWDED, "...............", ".XOOOO.........", "...............", "..............."],
      0,
    );
    const cells = candidateCells(state);

    expect(cells.length).toBeGreaterThan(CANDIDATE_LIMIT);
    expect(cells).toContain(cellAt(15, [12, 7]));
  });

  it("put the player's own win first, then the opponent's", () => {
    const state = position(
      {},
      {
        x: [...lineOf([3, 3], [3, 6]), [9, 9]],
        o: [...lineOf([7, 3], [7, 6]), [9, 10]],
      },
      1,
    );
    const [first, second] = candidateCells(state);

    expect([first, second]).toEqual([cellAt(15, [7, 2]), cellAt(15, [7, 7])]);
  });

  it("include both empty cells of O X X X X _ _ under blocked-ends", () => {
    // O to move: the first cell blocks X's five, the second kills it (both ends would be O).
    const state = position(
      {},
      {
        o: [
          [5, 1],
          [10, 10],
        ],
        x: lineOf([5, 2], [5, 5]),
      },
      1,
    );

    expect(candidateCells(state).slice(0, 2)).toEqual([cellAt(15, [5, 6]), cellAt(15, [5, 7])]);
  });

  it("include the cell where X wins in the corner, whoever is to move", () => {
    // X on row 1, columns 2–5, O on column 6: (1, 1) wins for X, the edge does not block.
    const stones = { x: lineOf([1, 2], [1, 5]), o: [[1, 6] as RowCol, [10, 10] as RowCol] };

    expect(candidateCells(position({}, stones, 0))[0]).toBe(cellAt(15, [1, 1]));
    expect(candidateCells(position({}, stones, 1))[0]).toBe(cellAt(15, [1, 1]));
  });

  it("are empty once the game is over", () => {
    const state: CaroState = {
      ...position({}, { x: lineOf([1, 1], [1, 5]) }),
      win: { player: 0, cells: [0, 1, 2, 3, 4] },
    };

    expect(caroCandidateMoves(state)).toEqual([]);
  });
});

describe("caro evaluate", () => {
  it("looks at 572 windows of five on 15×15 and 1,020 on 19×19", () => {
    expect(fiveCellWindows(15)).toHaveLength(572);
    expect(fiveCellWindows(19)).toHaveLength(1020);
  });

  it("flips sign when seen from the other player", () => {
    for (const seed of [1, 2]) {
      const { session } = playRandomGame(caro, {
        seed,
        playerCount: 2,
        maxPlies: 60,
        options: { size: 15, rule: "blocked-ends" },
      });
      for (const state of session.states) {
        expect(caroEvaluate(state, 1) + caroEvaluate(state, 0)).toBe(0);
      }
    }
  });

  it("does not count a line that the blocked-ends rule cannot let win", () => {
    // O X X X X _ O: the only cell making five for X lies between the line and O.
    const stones = { x: lineOf([8, 3], [8, 6]), o: [[8, 2] as RowCol, [8, 8] as RowCol] };
    const blocked = position({ rule: "blocked-ends" }, stones, 1);
    const free = position({ rule: "free" }, stones, 1);

    expect(caroEvaluate(blocked, 0)).toBeLessThan(caroEvaluate(free, 0));
  });

  it("does not count a broken line whose gap would make six blocked at both ends", () => {
    // O X X X X _ X O: filling the gap makes six X with O at both ends, which cannot win.
    const stones = {
      x: [...lineOf([8, 3], [8, 6]), [8, 8] as RowCol],
      o: [[8, 2] as RowCol, [8, 9] as RowCol, [2, 2] as RowCol],
    };
    const blocked = position({ rule: "blocked-ends" }, stones, 1);
    const free = position({ rule: "free" }, stones, 1);

    expect(caroEvaluate(blocked, 0)).toBeLessThan(caroEvaluate(free, 0));
  });

  it("scores an open four above a four blocked at one end", () => {
    const open = position({}, { x: lineOf([8, 4], [8, 7]), o: [[2, 2]] }, 1);
    const blocked = position({}, { x: lineOf([8, 4], [8, 7]), o: [[8, 3]] }, 1);

    expect(caroEvaluate(open, 0)).toBeGreaterThan(caroEvaluate(blocked, 0));
  });

  it("stays an integer below 10^8 on a crowded 19×19 board", () => {
    const { session } = playRandomGame(caro, {
      seed: 4,
      playerCount: 2,
      maxPlies: 361,
      options: { size: 19, rule: "free" },
    });
    for (const state of session.states) {
      for (const player of [0, 1] as const) {
        const value = caroEvaluate(state, player);
        expect(Number.isInteger(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThan(1e8);
      }
    }
  });
});

describe("caro AI", () => {
  it.each(ALL_LEVELS)("opens on the centre of an empty 15×15 board (%s)", (level) => {
    // Only the centre is considered, so even Hard answers without searching: a clock that never
    // runs out and may be read only once proves it does not wait for the time limit.
    for (const seed of [1, 2, 3]) {
      expect(aiCell(position({}, {}), level, seed, neverExpires(1))).toBe(cellAt(15, [8, 8]));
    }
  });

  it("at Medium, blocks a four that is blocked at one end", () => {
    const state = position(
      {},
      {
        x: lineOf([8, 4], [8, 7]),
        o: [
          [8, 3],
          [3, 3],
          [3, 12],
          [12, 12],
        ],
      },
      1,
    );

    for (const seed of [1, 2, 3])
      expect(aiCell(state, AI_LEVEL.Medium, seed)).toBe(cellAt(15, [8, 8]));
  });

  it("at Medium, blocks a broken four in its gap", () => {
    const state = position(
      {},
      {
        x: [
          [8, 4],
          [8, 5],
          [8, 7],
          [8, 8],
        ],
        o: [
          [3, 3],
          [3, 12],
          [12, 3],
          [12, 12],
        ],
      },
      1,
    );

    for (const seed of [1, 2, 3])
      expect(aiCell(state, AI_LEVEL.Medium, seed)).toBe(cellAt(15, [8, 6]));
  });

  it("at Medium, blocks against the edge of the board", () => {
    // The AI plays O; X has row 1, columns 2–5, O column 6: X wins on (1, 1) unless blocked.
    const state = position(
      { rule: "blocked-ends" },
      {
        x: lineOf([1, 2], [1, 5]),
        o: [
          [1, 6],
          [10, 10],
          [12, 4],
        ],
      },
      1,
    );

    for (const seed of [1, 2, 3])
      expect(aiCell(state, AI_LEVEL.Medium, seed)).toBe(cellAt(15, [1, 1]));
  });

  it.each([AI_LEVEL.Medium, AI_LEVEL.Hard])(
    "takes its own five before blocking the opponent's, even out of time (%s)",
    (level) => {
      // O (the AI) has an open four on row 10; X has a four on row 8 too.
      const state = position(
        {},
        { x: [...lineOf([8, 4], [8, 7]), [2, 2]], o: [...lineOf([10, 4], [10, 7]), [8, 3]] },
        1,
      );
      const wins = [cellAt(15, [10, 3]), cellAt(15, [10, 8])];

      for (const seed of [1, 2, 3]) {
        expect(wins).toContain(aiCell(state, level, seed, expiresImmediately()));
      }
    },
  );

  it("wins in the corner at Medium", () => {
    // The AI plays X: row 1, columns 2–5, O on column 6.
    const state = position(
      { rule: "blocked-ends" },
      {
        x: [...lineOf([1, 2], [1, 5]), [9, 9]],
        o: [
          [1, 6],
          [9, 10],
          [10, 10],
          [11, 11],
        ],
      },
      0,
    );

    expect(aiCell(state, AI_LEVEL.Medium)).toBe(cellAt(15, [1, 1]));
  });

  it("at Easy, never plays far from the stones on a 19×19 board", () => {
    const state = position(
      { size: 19 },
      {
        x: [
          [10, 10],
          [9, 11],
        ],
        o: [[10, 11]],
      },
    );

    for (let seed = 0; seed < 40; seed += 1) {
      expect(distanceToStones(state, aiCell(state, AI_LEVEL.Easy, seed))).toBeLessThanOrEqual(
        CANDIDATE_RADIUS,
      );
    }
  });

  it("at Medium, evaluates no more than r·(c + 1) positions on a 19×19 middle game", () => {
    const state = drawnPosition({ size: 19 }, [
      "...................",
      "...................",
      "...................",
      "...................",
      "...................",
      "...................",
      ".......X.O.........",
      "........XO.........",
      ".......OXX.O.......",
      "........OX.X.......",
      ".......X.O.........",
      "......O...X........",
      "...................",
    ]);
    let evaluations = 0;
    const counting = {
      ...caro,
      evaluate: (counted: CaroState, player: PlayerIndex) => {
        evaluations += 1;
        return caro.evaluate(counted, player);
      },
    };

    const chosen = chooseMove(counting, state, {
      level: AI_LEVEL.Medium,
      rng: createRng(1),
      now: neverExpires(),
      timeLimitMs: 500,
    });

    const roots = caroCandidateMoves(state);
    const replies = Math.max(
      ...roots.map((move) => caroCandidateMoves(caro.applyMove(state, move)).length),
    );
    expect(chosen.ok).toBe(true);
    expect(evaluations).toBeGreaterThan(0);
    expect(evaluations).toBeLessThanOrEqual(roots.length * (replies + 1));
  });
});
