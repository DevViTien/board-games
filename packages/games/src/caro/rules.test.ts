import {
  createRng,
  currentState,
  listOptionChoices,
  parseGameOptions,
  playMove,
} from "@board-games/engine";
import { deepFreeze, describeGameContract, playRandomGame } from "@board-games/engine/testing";
import { describe, expect, it, vi } from "vitest";

import type { CaroRule } from "./constants";
import { caro, type CaroState, caroWinningLine } from "./rules";
import { cellAt, gameEndingWith, lineOf, newGame, playCells, type RowCol } from "./test-positions";

const rng = createRng(1);

describe("caro setup and options", () => {
  it("declares two players, the Vietnamese folk category, about 10 minutes and the AI", () => {
    expect(caro.meta).toEqual({
      players: { min: 2, max: 2 },
      category: "vn-folk",
      durationMinutes: 10,
      supportsAI: true,
    });
  });

  it("offers the board sizes 15, 19 then infinite and the rules blocked-ends then free", () => {
    expect(listOptionChoices(caro)).toEqual([
      { name: "size", values: [15, 19, "infinite"] },
      { name: "rule", values: ["blocked-ends", "free"] },
    ]);
  });

  it("lists its choices without starting a game", () => {
    const setup = vi.fn(caro.setup);

    listOptionChoices({ ...caro, setup });

    expect(setup).not.toHaveBeenCalled();
  });

  it("starts by default on an empty 15×15 board with the blocked-ends rule, X to move", () => {
    const state = currentState(newGame({}));

    expect(state.size).toBe(15);
    expect(state.rule).toBe("blocked-ends");
    expect(state.board).toHaveLength(225);
    expect(state.board.every((stone) => stone === null)).toBe(true);
    expect(caro.currentPlayer(state)).toBe(0);
    expect(caro.legalMoves(state)).toHaveLength(225);
  });

  it("starts an empty 19×19 board when asked, X to move", () => {
    const state = currentState(newGame({ size: 19 }));

    expect(state.board).toHaveLength(361);
    expect(state.board.every((stone) => stone === null)).toBe(true);
    expect(caro.currentPlayer(state)).toBe(0);
  });

  it("takes the default rule when only the board size is given", () => {
    // Options from outside (a saved game, a room) go through parseGameOptions before setup.
    const parsed = parseGameOptions(caro, { size: 19 });
    const state = parsed.ok ? currentState(newGame(parsed.value)) : null;

    expect(state?.size).toBe(19);
    expect(state?.rule).toBe("blocked-ends");
  });

  it("starts the board that grows with an empty 15×15 area in the middle of a 61×61 cap", () => {
    const state = currentState(newGame({ size: "infinite", rule: "free" }));

    expect(state.infinite).toBe(true);
    expect(state.size).toBe(61);
    expect(state.rule).toBe("free");
    expect(state.board).toHaveLength(61 * 61);
    // Rows and columns 24 to 38, counted from 1.
    expect(state.area).toEqual({ top: 23, left: 23, bottom: 37, right: 37 });
    expect(caro.legalMoves(state)).toHaveLength(225);
    expect(caro.currentPlayer(state)).toBe(0);
  });

  it("keeps a board of fixed size whole and never growing", () => {
    const state = currentState(playCells({ size: 15 }, [0, 224]));

    expect(state.infinite).toBe(false);
    expect(state.area).toEqual({ top: 0, left: 0, bottom: 14, right: 14 });
  });

  it.each([
    ["an unsupported board size", { size: 17 }],
    ["an unknown key", { size: 15, rule: "blocked-ends", renju: true }],
  ])("refuses %s with invalid-options", (_what, options) => {
    expect(parseGameOptions(caro, options)).toEqual({
      ok: false,
      error: "invalid-options",
    });
  });
});

const INFINITE = { size: "infinite", rule: "blocked-ends" } as const;
const at61 = (row: number, col: number) => cellAt(61, [row, col]);

describe("caro on the board that grows", () => {
  it("refuses a cell outside the area", () => {
    expect(playMove(caro, newGame(INFINITE), { cell: at61(1, 1) }, rng)).toEqual({
      ok: false,
      error: "illegal-move",
    });
    expect(playMove(caro, newGame(INFINITE), { cell: at61(23, 31) }, rng).ok).toBe(false);
    expect(playMove(caro, newGame(INFINITE), { cell: at61(24, 31) }, rng).ok).toBe(true);
  });

  it("grows the area to keep five rows and columns around a stone near its edge", () => {
    const state = currentState(playCells(INFINITE, [at61(24, 31)]));

    // Rows 19 to 38 and columns 24 to 38, counted from 1.
    expect(state.area).toEqual({ top: 18, left: 23, bottom: 37, right: 37 });
    expect(caro.legalMoves(state)).toHaveLength(20 * 15 - 1);
  });

  it("keeps the area as it is for a stone in its middle", () => {
    const before = currentState(newGame(INFINITE));
    const after = currentState(playCells(INFINITE, [at61(31, 31)]));

    expect(after.area).toEqual(before.area);
  });

  it("never grows the area past the cap", () => {
    // A walk of X to the top left corner, O answering far from it.
    const cells: number[] = [];
    for (let step = 0; step < 6; step += 1) {
      cells.push(at61(24 - step * 4, 24 - step * 4), at61(38, 38 - step * 2));
    }
    const state = currentState(playCells(INFINITE, cells));

    expect(state.area.top).toBe(0);
    expect(state.area.left).toBe(0);
    expect(caro.legalMoves(state).every(({ cell }) => cell >= 0 && cell < 61 * 61)).toBe(true);
  });

  it("never shrinks the area, and rebuilds it with the position on undo", () => {
    const grown = playCells(INFINITE, [at61(24, 31), at61(31, 31)]);
    const states = grown.states;

    expect(states.at(-1)?.area).toEqual(states.at(-2)?.area);
    expect(states[0]?.area).toEqual({ top: 23, left: 23, bottom: 37, right: 37 });
  });

  it("names cells by the cap, so a cell keeps its index as the area grows", () => {
    const state = currentState(playCells(INFINITE, [at61(31, 31), at61(24, 24), at61(19, 19)]));

    expect(state.area.top).toBe(13);
    expect(state.board[at61(31, 31)]).toBe(0);
    expect(state.board[at61(24, 24)]).toBe(1);
    expect(state.board[at61(19, 19)]).toBe(0);
  });

  it("wins with five in a column against the top edge of the cap: the edge does not block", () => {
    // X walks up column 31 to row 1; O closes the other end of the column, on row 6.
    const xs: RowCol[] = [
      [24, 31],
      [19, 31],
      [14, 31],
      [9, 31],
      [5, 31],
      [4, 31],
      [3, 31],
      [2, 31],
      [1, 31],
    ];
    const os: RowCol[] = [
      [38, 38],
      [38, 36],
      [38, 34],
      [36, 38],
      [6, 31],
      [36, 36],
      [34, 38],
      [36, 34],
    ];
    const cells = xs.flatMap((x, index) => {
      const o = os[index];
      return o === undefined ? [x] : [x, o];
    });
    const state = currentState(
      playCells(
        INFINITE,
        cells.map(([row, col]) => at61(row, col)),
      ),
    );

    expect(caro.result(state)).toEqual({ kind: "win", winners: [0] });
    expect(caroWinningLine(state)).toHaveLength(5);
  });

  it("is no draw while the cap has empty cells, however many stones are down", () => {
    const { session } = playRandomGame(caro, {
      seed: 5,
      playerCount: 2,
      maxPlies: 400,
      options: { size: "infinite", rule: "blocked-ends" },
    });
    const state = currentState(session);

    if (caro.result(state) === null) expect(caro.legalMoves(state).length).toBeGreaterThan(0);
    expect(caro.result(state)?.kind).not.toBe("draw");
  });
});

describe("caro moves", () => {
  it("places the stone of the player to move and passes the turn", () => {
    const state = currentState(playCells({}, [cellAt(15, [8, 8])]));

    expect(state.board[cellAt(15, [8, 8])]).toBe(0);
    expect(caro.currentPlayer(state)).toBe(1);
  });

  it("refuses a move on a cell that holds a stone, leaving the board unchanged", () => {
    const session = playCells({}, [cellAt(15, [8, 8])]);

    expect(playMove(caro, session, { cell: cellAt(15, [8, 8]) }, rng)).toEqual({
      ok: false,
      error: "illegal-move",
    });
    expect(caro.legalMoves(currentState(session))).not.toContainEqual({
      cell: cellAt(15, [8, 8]),
    });
  });

  it("refuses the 226th cell on a 15×15 board, which only a 19×19 board has", () => {
    expect(playMove(caro, newGame({}), { cell: 225 }, rng)).toEqual({
      ok: false,
      error: "illegal-move",
    });
    expect(playMove(caro, newGame({ size: 19 }), { cell: 225 }, rng).ok).toBe(true);
  });

  it("never changes the state it is given", () => {
    const before = deepFreeze(currentState(playCells({}, [0, 1, 2, 3])));

    const after = caro.applyMove(before, { cell: 4 });

    expect(before.board[4]).toBeNull();
    expect(after.board[4]).toBe(0);
  });
});

interface EndingCase {
  readonly name: string;
  readonly rule: CaroRule;
  /** The side placing the final stone. */
  readonly mover: "x" | "o";
  /** The mover's stones, the final move last. */
  readonly stones: readonly RowCol[];
  readonly others?: readonly RowCol[];
  /** The winning line, from one end to the other; `null` when the final move does not win. */
  readonly line: readonly RowCol[] | null;
}

/** Scenarios played on both board sizes; `size` places the ones that are about the right edge. */
function endings(size: number): readonly EndingCase[] {
  const right = size;
  return [
    {
      name: "a horizontal five under the free rule",
      rule: "free",
      mover: "x",
      stones: lineOf([8, 4], [8, 8]),
      line: lineOf([8, 4], [8, 8]),
    },
    {
      name: "O's vertical five under the free rule",
      rule: "free",
      mover: "o",
      stones: lineOf([3, 5], [7, 5]),
      line: lineOf([3, 5], [7, 5]),
    },
    {
      name: "a five down to the right under the free rule",
      rule: "free",
      mover: "x",
      stones: lineOf([2, 2], [6, 6]),
      line: lineOf([2, 2], [6, 6]),
    },
    {
      name: "a five down to the left under the free rule",
      rule: "free",
      mover: "x",
      stones: lineOf([2, 10], [6, 6]),
      line: lineOf([2, 10], [6, 6]),
    },
    {
      name: "six joined in the middle under the free rule",
      rule: "free",
      mover: "x",
      stones: [...lineOf([8, 2], [8, 3]), ...lineOf([8, 5], [8, 7]), [8, 4]],
      line: lineOf([8, 2], [8, 7]),
    },
    {
      name: "a five blocked at both ends under the free rule",
      rule: "free",
      mover: "x",
      stones: lineOf([8, 4], [8, 8]),
      others: [
        [8, 3],
        [8, 9],
      ],
      line: lineOf([8, 4], [8, 8]),
    },
    {
      name: "four in a row",
      rule: "free",
      mover: "x",
      stones: lineOf([8, 4], [8, 7]),
      line: null,
    },
    {
      name: "a diagonal five with both ends empty under blocked-ends",
      rule: "blocked-ends",
      mover: "x",
      stones: lineOf([2, 2], [6, 6]),
      line: lineOf([2, 2], [6, 6]),
    },
    {
      name: "a five blocked at one end under blocked-ends",
      rule: "blocked-ends",
      mover: "x",
      stones: lineOf([8, 4], [8, 8]),
      others: [[8, 3]],
      line: lineOf([8, 4], [8, 8]),
    },
    {
      name: "a vertical five blocked at both ends under blocked-ends",
      rule: "blocked-ends",
      mover: "x",
      stones: lineOf([3, 5], [7, 5]),
      others: [
        [2, 5],
        [8, 5],
      ],
      line: null,
    },
    {
      name: "six with an open end under blocked-ends",
      rule: "blocked-ends",
      mover: "x",
      stones: [...lineOf([8, 2], [8, 3]), ...lineOf([8, 5], [8, 7]), [8, 4]],
      others: [[8, 1]],
      line: lineOf([8, 2], [8, 7]),
    },
    {
      name: "six blocked at both ends under blocked-ends",
      rule: "blocked-ends",
      mover: "x",
      stones: [...lineOf([8, 2], [8, 3]), ...lineOf([8, 5], [8, 7]), [8, 4]],
      others: [
        [8, 1],
        [8, 8],
      ],
      line: null,
    },
    {
      name: "one move making a blocked row and an open column under blocked-ends",
      rule: "blocked-ends",
      mover: "x",
      stones: [...lineOf([8, 4], [8, 7]), ...lineOf([4, 8], [7, 8]), [8, 8]],
      others: [
        [8, 3],
        [8, 9],
      ],
      line: lineOf([4, 8], [8, 8]),
    },
    {
      name: "a five from the corner, the far end blocked, under blocked-ends",
      rule: "blocked-ends",
      mover: "x",
      stones: [...lineOf([1, 2], [1, 5]), [1, 1]],
      others: [[1, 6]],
      line: lineOf([1, 1], [1, 5]),
    },
    {
      name: "a five against the right edge, O before it and at the start of the next row",
      rule: "blocked-ends",
      mover: "x",
      stones: lineOf([3, right - 4], [3, right]),
      others: [
        [3, right - 5],
        [4, 1],
      ],
      line: lineOf([3, right - 4], [3, right]),
    },
    {
      name: "stones at the end of row 3 and the start of row 4",
      rule: "blocked-ends",
      mover: "x",
      stones: [...lineOf([3, right - 2], [3, right]), [4, 1], [4, 2]],
      line: null,
    },
    {
      name: "a five covering a whole short diagonal in the corner under blocked-ends",
      rule: "blocked-ends",
      mover: "x",
      stones: [...lineOf([1, 5], [2, 4]), ...lineOf([4, 2], [5, 1]), [3, 3]],
      line: lineOf([1, 5], [5, 1]),
    },
  ];
}

/** Plays `ending` to its final move, checking that the game never ends before it. */
function playEnding(size: 15 | 19, { rule, mover, stones, others = [] }: EndingCase): CaroState {
  const moves = gameEndingWith(size, mover, stones, others);
  const session = playCells({ size, rule }, moves, (state, index) => {
    expect(caro.result(state), `after move ${index + 1}`).toBeNull();
  });
  return currentState(session);
}

describe.each([15, 19] as const)("caro endings on a %i×%i board", (size) => {
  it.each(endings(size))("$name", (ending) => {
    const state = playEnding(size, ending);
    const winner = ending.mover === "x" ? 0 : 1;

    if (ending.line === null) {
      expect(caro.result(state)).toBeNull();
      expect(caroWinningLine(state)).toBeNull();
      expect(caro.currentPlayer(state)).toBe(1 - winner);
      return;
    }
    expect(caro.result(state)).toEqual({ kind: "win", winners: [winner] });
    expect(caroWinningLine(state)).toEqual(ending.line.map((stone) => cellAt(size, stone)));
    expect(caro.legalMoves(state)).toEqual([]);
  });
});

describe("caro on a 19×19 board", () => {
  it("lets O win on the last row against the bottom-right corner, X before the line", () => {
    const state = playEnding(19, {
      name: "",
      rule: "blocked-ends",
      mover: "o",
      stones: lineOf([19, 15], [19, 19]),
      others: [[19, 14]],
      line: null,
    });

    expect(caro.result(state)).toEqual({ kind: "win", winners: [1] });
    expect(caroWinningLine(state)).toEqual(lineOf([19, 15], [19, 19]).map((s) => cellAt(19, s)));
  });
});

// Full 15×15 boards (113 X, 112 O) whose only line of five, if any, goes through the final move.
// Every pair of cells alternates X and O, shifting by a row, so no other line exceeds two or three.
const NO_FIVE = [
  "XXOOXXOOXXOOXXO",
  "OOXXOOXXOOXXOOX",
  "XXOOXXOOXXOOXXO",
  "OOXXOOXXOOXXOOX",
  "XXOOXXOOXXOOXXO",
  "OOXXOOXXOOXXOOX",
  "XXOOXXOOXXOOXXO",
  "OOXXOOXXOOXXOOX",
  "XXOOXXOOXXOOXXO",
  "OOXXOOXXOOXXOOX",
  "XXOOXXOOXXOOXXO",
  "OOXXOOXXOOXXOOX",
  "XXOOXXOOXXOOXXO",
  "OOXXOOXXOOXXOOX",
  "XXOOXXOOXXOOXXO",
];
/** Row 1 starts O X X X X X O: a five blocked at both ends. */
const BLOCKED_FIVE_LAST = ["OXXXXXOOXXOOXXO", ...NO_FIVE.slice(1, -1), "XXOOXXOOXXOOXOO"];
/** Row 1 starts X X X X X O: a five against the edge, blocked at one end. */
const OPEN_FIVE_LAST = ["XXXXXOOOXXOOXXO", ...NO_FIVE.slice(1, -1), "XXOOXXOOXXOOXOO"];

/** The moves filling `rows`, X and O alternating, with X's stone on `last` played last. */
function fillingMoves(rows: readonly string[], last: RowCol): number[] {
  const finalCell = cellAt(15, last);
  const marks = rows.join("");
  const xs: number[] = [];
  const os: number[] = [];
  for (let cell = 0; cell < marks.length; cell += 1) {
    if (marks.charAt(cell) === "O") os.push(cell);
    else if (cell !== finalCell) xs.push(cell);
  }
  expect([xs.length, os.length]).toEqual([112, 112]);
  return [...xs.flatMap((x, index) => [x, os[index] ?? -1]), finalCell];
}

describe("caro full board", () => {
  function fill(rows: readonly string[], last: RowCol, rule: CaroRule): CaroState {
    const moves = fillingMoves(rows, last);
    return currentState(
      playCells({ rule }, moves, (state, index) => {
        expect(caro.result(state), `after move ${index + 1}`).toBeNull();
      }),
    );
  }

  it("is a draw once the last cell is filled without a line of five", () => {
    const state = fill(NO_FIVE, [15, 14], "blocked-ends");

    expect(caro.result(state)).toEqual({ kind: "draw" });
    expect(caroWinningLine(state)).toBeNull();
    expect(caro.legalMoves(state)).toEqual([]);
  });

  it("is a win, not a draw, when the move filling the board makes an open five", () => {
    const state = fill(OPEN_FIVE_LAST, [1, 3], "blocked-ends");

    expect(caro.result(state)).toEqual({ kind: "win", winners: [0] });
    expect(caroWinningLine(state)).toEqual(lineOf([1, 1], [1, 5]).map((s) => cellAt(15, s)));
  });

  it("is a draw when the move filling the board makes a five blocked at both ends", () => {
    expect(caro.result(fill(BLOCKED_FIVE_LAST, [1, 4], "blocked-ends"))).toEqual({
      kind: "draw",
    });
    // The same board under the free rule is a win.
    expect(caro.result(fill(BLOCKED_FIVE_LAST, [1, 4], "free"))).toEqual({
      kind: "win",
      winners: [0],
    });
  });
});

describe("caroWinningLine", () => {
  it("is null while the game goes on", () => {
    expect(caroWinningLine(currentState(playCells({}, [0, 1, 2])))).toBeNull();
  });

  it("lists the five cells of a diagonal win from one end to the other", () => {
    const state = playEnding(15, {
      name: "",
      rule: "blocked-ends",
      mover: "x",
      stones: [...lineOf([4, 4], [5, 5]), ...lineOf([7, 7], [8, 8]), [6, 6]],
      line: null,
    });

    expect(caroWinningLine(state)).toEqual(lineOf([4, 4], [8, 8]).map((s) => cellAt(15, s)));
  });

  it("lists all six cells of a win joined in the middle, from one end to the other", () => {
    const state = playEnding(15, {
      name: "",
      rule: "blocked-ends",
      mover: "x",
      stones: [...lineOf([2, 9], [4, 9]), ...lineOf([6, 9], [7, 9]), [5, 9]],
      line: null,
    });

    expect(caroWinningLine(state)).toEqual(lineOf([2, 9], [7, 9]).map((s) => cellAt(15, s)));
  });
});

// Random games are long on these boards: a few seeds per combination of options. The board that
// grows has its own file (`infinite-contract.test.ts`), so it runs next to this one.
describe.each([
  [15, "blocked-ends", [1, 2]],
  [15, "free", [1]],
  [19, "blocked-ends", [1]],
  [19, "free", [1]],
] as const)("caro contract with size %i and the %s rule", (size, rule, seeds) => {
  describeGameContract(caro, {
    seeds,
    maxPlies: size * size,
    options: { size, rule },
    timeout: 10_000,
  });
});
