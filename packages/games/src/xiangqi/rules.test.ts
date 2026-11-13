import {
  AI_LEVEL,
  chooseMove,
  createRng,
  createSession,
  currentState,
  fromRecord,
  RECORD_VERSION,
  toRecord,
} from "@board-games/engine";
import { describeGameContract, neverExpires } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { boardAfter, legalMovesOf, pointOf, type XiangqiBoard } from "./board";
import { xiangqiNotation } from "./notation";
import {
  xiangqi,
  XIANGQI_QUIET_LIMIT,
  XIANGQI_REASON,
  type XiangqiMove,
  type XiangqiState,
  xiangqiStateFromRows,
} from "./rules";

// A game ends within 120 quiet moves after each of at most 30 captures.
describeGameContract(xiangqi, {
  seeds: [1, 2, 3],
  maxPlies: 31 * XIANGQI_QUIET_LIMIT,
  timeout: 60_000,
});

const at = (x: number, y: number) => pointOf(x, y);
const move = (fx: number, fy: number, tx: number, ty: number): XiangqiMove => ({
  from: at(fx, fy),
  to: at(tx, ty),
});

function play(state: XiangqiState, moves: readonly XiangqiMove[]): XiangqiState {
  return moves.reduce((current, next) => {
    expect(xiangqi.legalMoves(current), JSON.stringify(next)).toContainEqual(next);
    return xiangqi.applyMove(current, next);
  }, state);
}

function perft(board: XiangqiBoard, red: boolean, depth: number): number {
  if (depth === 0) return 1;
  let total = 0;
  for (const { from, to } of legalMovesOf(board, red)) {
    total += perft(boardAfter(board, from, to), !red, depth - 1);
  }
  return total;
}

const targetsOf = (state: XiangqiState, x: number, y: number) =>
  xiangqi
    .legalMoves(state)
    .filter((candidate) => candidate.from === at(x, y))
    .map(({ to }) => to)
    .toSorted((a, b) => a - b);

describe("Bàn và quân", () => {
  it("Thế mở đầu: Đỏ to move, 16 pieces each, 44 legal moves", () => {
    const state = xiangqi.setup();
    expect(xiangqi.currentPlayer(state)).toBe(0);
    expect(
      state.board.filter((piece) => piece !== null && piece === piece.toUpperCase()),
    ).toHaveLength(16);
    expect(
      state.board.filter((piece) => piece !== null && piece === piece.toLowerCase()),
    ).toHaveLength(16);
    expect(xiangqi.legalMoves(state)).toHaveLength(44);
  });

  it("counts the published perft from the opening: 44, 1 920, 79 666", { timeout: 60_000 }, () => {
    const { board } = xiangqi.setup();
    expect([1, 2, 3].map((depth) => perft(board, true, depth))).toEqual([44, 1920, 79_666]);
  });
});

describe("Cách đi của quân", () => {
  it("Mã bị cản chân: a piece above the horse blocks both points two up", () => {
    const state = xiangqiStateFromRows([
      "....k....",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "....P....",
      "....H....",
      "...K.....",
    ]);
    const targets = targetsOf(state, 4, 8);
    expect(targets).not.toContain(at(3, 6));
    expect(targets).not.toContain(at(5, 6));
    expect(targets).toContain(at(2, 7));
  });

  it("Pháo ăn qua ngòi: takes over one screen, never stops beyond it", () => {
    const state = xiangqiStateFromRows([
      ".....k...",
      ".........",
      ".........",
      "....p....",
      ".........",
      ".........",
      "....P....",
      "....C....",
      ".........",
      "...K.....",
    ]);
    const targets = targetsOf(state, 4, 7);
    expect(targets).toContain(at(4, 3));
    expect(targets).not.toContain(at(4, 4));
    expect(targets).not.toContain(at(4, 5));
  });

  it("Tượng không qua sông, and is blocked by a piece in its eye", () => {
    const state = xiangqiStateFromRows([
      "....k....",
      ".........",
      ".........",
      ".........",
      ".........",
      "..E......",
      ".P.......",
      ".........",
      ".........",
      "....K....",
    ]);
    const targets = targetsOf(state, 2, 5);
    expect(targets.every((point) => Math.floor(point / 9) >= 5)).toBe(true);
    expect(targets).not.toContain(at(0, 7));
    expect(targets).toContain(at(4, 7));
  });

  it("moves a soldier sideways only once across the river, never back", () => {
    const home = xiangqiStateFromRows([
      "....k....",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "..P......",
      ".........",
      ".........",
      "...K.....",
    ]);
    expect(targetsOf(home, 2, 6)).toEqual([at(2, 5)]);
    const across = xiangqiStateFromRows([
      "....k....",
      ".........",
      ".........",
      "..P......",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "...K.....",
    ]);
    expect(targetsOf(across, 2, 3)).toEqual(
      [at(2, 2), at(1, 3), at(3, 3)].toSorted((a, b) => a - b),
    );
  });
});

describe("Tướng không đối mặt và không tự để bị chiếu", () => {
  it("Lộ mặt Tướng: the only piece between the generals cannot leave their column", () => {
    const state = xiangqiStateFromRows([
      "....k....",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "....C....",
      ".........",
      "....K....",
    ]);
    expect(targetsOf(state, 4, 7).every((point) => point % 9 === 4)).toBe(true);
  });
});

describe("Thắng khi chiếu bí hoặc hết nước", () => {
  it("Chiếu bí: two rooks mate the black general", () => {
    const state = xiangqiStateFromRows(
      [
        "R...k....",
        "........R",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        "...K.....",
      ],
      1,
    );
    expect(xiangqi.result(state)).toEqual({
      kind: "win",
      winners: [0],
      reason: XIANGQI_REASON.Checkmate,
    });
    expect(xiangqi.legalMoves(state)).toEqual([]);
  });

  it("Hết nước là thua: Đen not in check with no move loses", () => {
    // The black general in a palace corner, its two points taken away by soldiers it cannot take.
    const state = xiangqiStateFromRows(
      [
        "...k.....",
        "....P....",
        "...P.....",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        "....K....",
      ],
      1,
    );
    expect(xiangqi.result(state)).toMatchObject({ kind: "win", winners: [0] });
    expect(xiangqi.result(state)?.reason).toBe(XIANGQI_REASON.NoMoves);
  });
});

describe("Chiếu dai và lặp lại", () => {
  it("Chiếu dai thì thua: a rook checking back and forth loses at the third repetition", () => {
    const start = xiangqiStateFromRows([
      "....k....",
      ".........",
      "R........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "...K.....",
    ]);
    const end = play(start, [
      move(0, 2, 0, 0),
      move(4, 0, 4, 1),
      move(0, 0, 0, 1),
      move(4, 1, 4, 0),
      move(0, 1, 0, 0),
      move(4, 0, 4, 1),
      move(0, 0, 0, 1),
      move(4, 1, 4, 0),
      move(0, 1, 0, 0),
    ]);
    expect(xiangqi.result(end)).toEqual({
      kind: "win",
      winners: [1],
      reason: XIANGQI_REASON.PerpetualCheck,
    });
  });

  it("Lặp lại không chiếu thì hoà: horses back and forth draw", () => {
    const start = xiangqi.setup();
    const round = [move(7, 9, 6, 7), move(7, 0, 6, 2), move(6, 7, 7, 9), move(6, 2, 7, 0)];
    const end = play(start, [...round, ...round]);
    expect(xiangqi.result(end)).toEqual({ kind: "draw", reason: XIANGQI_REASON.Repetition });
  });
});

describe("Hoà khi lâu không ăn quân", () => {
  it("120 nước không ăn quân: a draw at the 120th quiet move", () => {
    const nearly = {
      ...xiangqi.setup(),
      quiet: XIANGQI_QUIET_LIMIT - 1,
    };
    const end = xiangqi.applyMove(nearly, move(7, 7, 4, 7));
    expect(xiangqi.result(end)).toEqual({ kind: "draw", reason: XIANGQI_REASON.Quiet });
  });

  it("a mate on the 120th quiet move still wins", () => {
    const nearly = {
      ...xiangqiStateFromRows([
        "....k....",
        "R........",
        ".........",
        ".........",
        ".........",
        "........R",
        ".........",
        ".........",
        ".........",
        "...K.....",
      ]),
      quiet: XIANGQI_QUIET_LIMIT - 1,
    };
    const end = xiangqi.applyMove(nearly, move(8, 5, 8, 0));
    expect(xiangqi.result(end)).toEqual({
      kind: "win",
      winners: [0],
      reason: XIANGQI_REASON.Checkmate,
    });
  });

  it("starts counting again after a capture", () => {
    const state = xiangqi.setup();
    const after = play(state, [move(7, 7, 7, 0)]);
    expect(after.quiet).toBe(0);
    expect(after.steps).toHaveLength(1);
  });
});

describe("Ký hiệu nước đi", () => {
  it("Pháo đầu và Mã lên: P2-5, M8.7, then M2.3 and X9-8", () => {
    const state = play(xiangqi.setup(), [
      move(7, 7, 4, 7),
      move(7, 0, 6, 2),
      move(7, 9, 6, 7),
      move(8, 0, 7, 0),
    ]);
    expect(state.notes).toEqual(["P2-5", "M8.7", "M2.3", "X9-8"]);
  });

  it("writes forward, back and steps: X1.2, X1/1, Tg5.1", () => {
    const board = xiangqiStateFromRows([
      "....k....",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "........R",
      ".........",
      "...K.....",
    ]).board;
    expect(xiangqiNotation(board, at(8, 7), at(8, 5))).toBe("X1.2");
    expect(xiangqiNotation(board, at(8, 7), at(8, 8))).toBe("X1/1");
    expect(xiangqiNotation(board, at(4, 0), at(4, 1))).toBe("Tg5.1");
  });

  it("marks the front and back of two pieces on one column, and three soldiers t, g, s", () => {
    const board = xiangqiStateFromRows([
      "....k....",
      ".........",
      "..P......",
      "..P......",
      "..P......",
      ".........",
      ".........",
      "..C......",
      "..C......",
      "...K.....",
    ]).board;
    expect(xiangqiNotation(board, at(2, 7), at(4, 7))).toBe("Pt-5");
    expect(xiangqiNotation(board, at(2, 8), at(3, 8))).toBe("Ps-6");
    expect(xiangqiNotation(board, at(2, 2), at(2, 1))).toBe("Bt.1");
    expect(xiangqiNotation(board, at(2, 3), at(1, 3))).toBe("Bg-8");
    expect(xiangqiNotation(board, at(2, 4), at(3, 4))).toBe("Bs-6");
  });

  it("adds the column when two columns hold two soldiers each, or one holds four", () => {
    const twoColumns = xiangqiStateFromRows([
      "....k....",
      ".........",
      ".P.....P.",
      ".P.....P.",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "...K.....",
    ]).board;
    expect(xiangqiNotation(twoColumns, at(7, 2), at(7, 1))).toBe("Bt2.1");
    expect(xiangqiNotation(twoColumns, at(1, 2), at(1, 1))).toBe("Bt8.1");
    expect(xiangqiNotation(twoColumns, at(1, 3), at(0, 3))).toBe("Bs8-9");

    const four = xiangqiStateFromRows([
      "...k.....",
      "..P......",
      "..P......",
      "..P......",
      "..P......",
      ".........",
      ".........",
      ".........",
      ".........",
      "....K....",
    ]).board;
    expect(xiangqiNotation(four, at(2, 1), at(3, 1))).toBe("B17-6");
    expect(xiangqiNotation(four, at(2, 3), at(1, 3))).toBe("B37-8");
  });
});

describe("Máy chơi Cờ tướng", () => {
  function aiMove(state: XiangqiState, level: "easy" | "medium" | "hard" = AI_LEVEL.Medium) {
    const chosen = chooseMove(xiangqi, state, {
      level,
      rng: createRng(1),
      now: neverExpires(),
      timeLimitMs: 0,
    });
    if (!chosen.ok) throw new Error(chosen.error);
    return chosen.value;
  }

  it("Máy chiếu bí: Medium mates in one", () => {
    // Đen to move mates with its rook along the back rank, the red general boxed in by its own advisors.
    const state = xiangqiStateFromRows(
      [
        "....k....",
        ".........",
        ".........",
        ".........",
        "r........",
        ".........",
        ".........",
        ".........",
        "...APA...",
        "....K....",
      ],
      1,
    );
    const chosen = aiMove(state);
    const after = xiangqi.applyMove(state, chosen);
    expect(xiangqi.result(after)?.reason).toBe(XIANGQI_REASON.Checkmate);
  });

  it("Máy ăn Xe treo: Medium takes a rook left unguarded", () => {
    const state = xiangqiStateFromRows(
      [
        "....k....",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        "R.......r",
        ".........",
        "...K.....",
      ],
      1,
    );
    expect(aiMove(state)).toEqual(move(8, 7, 0, 7));
  });

  it("always plays a legal move, on every level", () => {
    const rng = createRng(5);
    let state = xiangqi.setup();
    for (let ply = 0; ply < 20 && xiangqi.result(state) === null; ply += 1) {
      const level = [AI_LEVEL.Easy, AI_LEVEL.Medium][ply % 2] ?? AI_LEVEL.Easy;
      const chosen = chooseMove(xiangqi, state, { level, rng, now: () => 0, timeLimitMs: 0 });
      if (!chosen.ok) throw new Error(chosen.error);
      expect(xiangqi.legalMoves(state)).toContainEqual(chosen.value);
      state = xiangqi.applyMove(state, chosen.value);
    }
  });

  it("scores material and placement as an integer, the same from both sides", () => {
    const state = xiangqi.setup();
    expect(xiangqi.evaluate(state, 0)).toBe(0);
    const up = play(state, [move(7, 7, 7, 0)]);
    expect(xiangqi.evaluate(up, 0)).toBeGreaterThan(300);
    expect(xiangqi.evaluate(up, 1) + xiangqi.evaluate(up, 0)).toBe(0);
  });
});

describe("records", () => {
  it("rebuilds a game from its record, as a room stores it", () => {
    const created = createSession(xiangqi, { playerCount: 2 });
    if (!created.ok) throw new Error(created.error);
    const moves = [move(7, 7, 4, 7), move(7, 0, 6, 2), move(7, 9, 6, 7)];
    const record = {
      ...toRecord(created.value),
      version: RECORD_VERSION,
      entries: moves.map((entry) => ({ move: entry })),
    };
    const rebuilt = fromRecord(xiangqi, JSON.parse(JSON.stringify(record)));
    if (!rebuilt.ok) throw new Error(rebuilt.error);
    expect(currentState(rebuilt.value).notes).toEqual(["P2-5", "M8.7", "M2.3"]);
  });
});
