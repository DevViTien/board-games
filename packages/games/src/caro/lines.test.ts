import type { PlayerIndex } from "@board-games/engine";
import { describe, expect, it } from "vitest";

import type { CaroRule } from "./constants";
import { DIRECTIONS, runThrough, stepFrom, wouldWin } from "./lines";
import { cellAt, lineOf, position, type RowCol, type Stones } from "./test-positions";

interface Case {
  readonly name: string;
  readonly size?: 15 | 19;
  readonly rule: CaroRule;
  /** Stones already on the board. */
  readonly stones: Stones;
  /** Where `player` places a stone. */
  readonly move: RowCol;
  readonly player?: PlayerIndex;
  /** The winning line, from one end to the other, or `null` when the move does not win. */
  readonly wins: readonly RowCol[] | null;
}

function winOf({ size = 15, rule, stones, move, player = 0 }: Case): readonly number[] | null {
  const { board } = position({ size, rule }, stones);
  return wouldWin(board, size, cellAt(size, move), player, rule);
}

const cells = (size: number, stones: readonly RowCol[]) =>
  stones.map((stone) => cellAt(size, stone));

const FREE_CASES: readonly Case[] = [
  {
    name: "a horizontal line of five",
    rule: "free",
    stones: { x: lineOf([8, 4], [8, 7]) },
    move: [8, 8],
    wins: lineOf([8, 4], [8, 8]),
  },
  {
    name: "a vertical line of five, for O",
    rule: "free",
    stones: { o: lineOf([3, 5], [6, 5]) },
    move: [7, 5],
    player: 1,
    wins: lineOf([3, 5], [7, 5]),
  },
  {
    name: "a line of five down to the right",
    rule: "free",
    stones: { x: lineOf([2, 2], [5, 5]) },
    move: [6, 6],
    wins: lineOf([2, 2], [6, 6]),
  },
  {
    name: "a line of five down to the left",
    rule: "free",
    stones: { x: lineOf([2, 10], [5, 7]) },
    move: [6, 6],
    wins: lineOf([2, 10], [6, 6]),
  },
  {
    name: "six in a row made by joining two lines",
    rule: "free",
    stones: { x: [...lineOf([8, 2], [8, 3]), ...lineOf([8, 5], [8, 7])] },
    move: [8, 4],
    wins: lineOf([8, 2], [8, 7]),
  },
  {
    name: "five blocked at both ends",
    rule: "free",
    stones: {
      x: lineOf([8, 4], [8, 7]),
      o: [
        [8, 3],
        [8, 9],
      ],
    },
    move: [8, 8],
    wins: lineOf([8, 4], [8, 8]),
  },
  {
    name: "four in a row: no win yet",
    rule: "free",
    stones: { x: lineOf([8, 4], [8, 6]) },
    move: [8, 7],
    wins: null,
  },
];

const BLOCKED_ENDS_CASES: readonly Case[] = [
  {
    name: "five down a diagonal with both ends empty",
    rule: "blocked-ends",
    stones: { x: lineOf([2, 2], [5, 5]) },
    move: [6, 6],
    wins: lineOf([2, 2], [6, 6]),
  },
  {
    name: "five with only one end blocked",
    rule: "blocked-ends",
    stones: { x: lineOf([8, 4], [8, 7]), o: [[8, 3]] },
    move: [8, 8],
    wins: lineOf([8, 4], [8, 8]),
  },
  {
    name: "five down a column blocked at both ends: no win",
    rule: "blocked-ends",
    stones: {
      x: lineOf([3, 5], [6, 5]),
      o: [
        [2, 5],
        [8, 5],
      ],
    },
    move: [7, 5],
    wins: null,
  },
  {
    name: "six with one end open",
    rule: "blocked-ends",
    stones: { x: [...lineOf([8, 2], [8, 3]), ...lineOf([8, 5], [8, 7])], o: [[8, 1]] },
    move: [8, 4],
    wins: lineOf([8, 2], [8, 7]),
  },
  {
    name: "six blocked at both ends: no win",
    rule: "blocked-ends",
    stones: {
      x: [...lineOf([8, 2], [8, 3]), ...lineOf([8, 5], [8, 7])],
      o: [
        [8, 1],
        [8, 8],
      ],
    },
    move: [8, 4],
    wins: null,
  },
  {
    name: "one move making a blocked row and an open column: the column wins",
    rule: "blocked-ends",
    stones: {
      x: [...lineOf([8, 4], [8, 7]), ...lineOf([4, 8], [7, 8])],
      o: [
        [8, 3],
        [8, 9],
      ],
    },
    move: [8, 8],
    wins: lineOf([4, 8], [8, 8]),
  },
];

const EDGE_CASES: readonly Case[] = [
  {
    name: "five from the corner rightwards, the far end blocked",
    rule: "blocked-ends",
    stones: { x: lineOf([1, 2], [1, 5]), o: [[1, 6]] },
    move: [1, 1],
    wins: lineOf([1, 1], [1, 5]),
  },
  {
    name: "five against the right edge, O before it and at the start of the next row",
    rule: "blocked-ends",
    stones: {
      x: lineOf([3, 11], [3, 14]),
      o: [
        [3, 10],
        [4, 1],
      ],
    },
    move: [3, 15],
    wins: lineOf([3, 11], [3, 15]),
  },
  {
    name: "stones at the end of row 3 and the start of row 4 do not join",
    rule: "free",
    stones: { x: [...lineOf([3, 13], [3, 15]), [4, 1]] },
    move: [4, 2],
    wins: null,
  },
  {
    name: "stones at the end of row 3 do not join the start of row 4 either way",
    rule: "free",
    stones: { x: [...lineOf([3, 13], [3, 14]), ...lineOf([4, 1], [4, 2])] },
    move: [3, 15],
    wins: null,
  },
  {
    name: "five down to the right against the right edge, O before it and on the wrapped cell",
    rule: "blocked-ends",
    stones: {
      x: lineOf([2, 11], [5, 14]),
      o: [
        [1, 10],
        [8, 1],
      ],
    },
    move: [6, 15],
    wins: lineOf([2, 11], [6, 15]),
  },
  {
    name: "five down to the left against the left edge, O before it and on the wrapped cell",
    rule: "blocked-ends",
    stones: {
      x: lineOf([2, 5], [5, 2]),
      o: [
        [1, 6],
        [6, 15],
      ],
    },
    move: [6, 1],
    wins: lineOf([2, 5], [6, 1]),
  },
  {
    name: "a diagonal down to the right does not wrap onto the next rows",
    rule: "free",
    stones: { x: lineOf([1, 12], [4, 15]) },
    move: [6, 1],
    wins: null,
  },
  {
    name: "a diagonal down to the left does not wrap onto the same row's far end",
    rule: "free",
    stones: { x: lineOf([1, 4], [4, 1]) },
    move: [4, 15],
    wins: null,
  },
  {
    name: "five covering a whole short diagonal in the corner",
    rule: "blocked-ends",
    stones: { x: [...lineOf([1, 5], [2, 4]), ...lineOf([4, 2], [5, 1])] },
    move: [3, 3],
    wins: lineOf([1, 5], [5, 1]),
  },
  {
    name: "O's five on the last row of a 19×19 board, X before it",
    size: 19,
    rule: "blocked-ends",
    stones: { o: lineOf([19, 15], [19, 18]), x: [[19, 14]] },
    move: [19, 19],
    player: 1,
    wins: lineOf([19, 15], [19, 19]),
  },
  {
    name: "O's five on the last row of a 19×19 board, placed in the middle",
    size: 19,
    rule: "blocked-ends",
    stones: { o: [...lineOf([19, 15], [19, 16]), ...lineOf([19, 18], [19, 19])], x: [[19, 14]] },
    move: [19, 17],
    player: 1,
    wins: lineOf([19, 15], [19, 19]),
  },
];

describe("wouldWin", () => {
  describe.each([
    ["the free rule", FREE_CASES],
    ["the blocked-ends rule", BLOCKED_ENDS_CASES],
    ["the edge of the board", EDGE_CASES],
  ])("with %s", (_what, cases) => {
    it.each(cases)("$name", (testCase) => {
      const size = testCase.size ?? 15;
      expect(winOf(testCase)).toEqual(testCase.wins === null ? null : cells(size, testCase.wins));
    });
  });

  it("lets the free rule win where blocked-ends does not", () => {
    const stones: Stones = {
      x: lineOf([3, 5], [6, 5]),
      o: [
        [2, 5],
        [8, 5],
      ],
    };
    const move: RowCol = [7, 5];

    expect(winOf({ name: "", rule: "free", stones, move, wins: null })).toEqual(
      cells(15, lineOf([3, 5], [7, 5])),
    );
    expect(winOf({ name: "", rule: "blocked-ends", stones, move, wins: null })).toBeNull();
  });
});

describe("runThrough", () => {
  it("lists the line from one end to the other, whichever stone it starts from", () => {
    const { board } = position({}, { x: lineOf([5, 3], [9, 7]) });
    const [, , downRight] = DIRECTIONS;
    if (downRight === undefined) throw new Error("missing direction");

    for (const stone of lineOf([5, 3], [9, 7])) {
      expect(runThrough(board, 15, cellAt(15, stone), 0, downRight)).toEqual(
        cells(15, lineOf([5, 3], [9, 7])),
      );
    }
  });

  it("stops at a stone of the other player and at the edge", () => {
    const { board } = position({}, { x: lineOf([1, 1], [1, 3]), o: [[1, 4]] });
    const [horizontal] = DIRECTIONS;
    if (horizontal === undefined) throw new Error("missing direction");

    expect(runThrough(board, 15, cellAt(15, [1, 2]), 0, horizontal)).toEqual(
      cells(15, lineOf([1, 1], [1, 3])),
    );
  });
});

describe("stepFrom", () => {
  it("never wraps past the edge, in any direction", () => {
    for (const size of [15, 19]) {
      for (let cell = 0; cell < size * size; cell += 1) {
        for (const direction of DIRECTIONS) {
          for (const sign of [1, -1] as const) {
            const next = stepFrom(size, cell, direction, sign);
            if (next === null) continue;
            const rowMove = Math.floor(next / size) - Math.floor(cell / size);
            const colMove = (next % size) - (cell % size);
            // `+ 0` turns −0 into 0.
            expect([rowMove, colMove]).toEqual([sign * direction[0] + 0, sign * direction[1] + 0]);
          }
        }
      }
    }
  });
});
