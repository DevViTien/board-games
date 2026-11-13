import {
  GAME_CATEGORY,
  type GameDefinition,
  type GameResult,
  type PlayerIndex,
} from "@board-games/engine";

import {
  boardAfter,
  generalInCheck,
  isRedPiece,
  kindOf,
  legalMovesOf,
  XIANGQI_START_ROWS,
  type XiangqiBoard,
  xiangqiBoardFromRows,
  type XiangqiKind,
  xOf,
  yOf,
} from "./board";
import { xiangqiNotation } from "./notation";

/** Why a game ended, in `GameResult.reason`; the app translates it. */
export const XIANGQI_REASON = {
  /** The side to move is in check and has no legal move. */
  Checkmate: "checkmate",
  /** The side to move is not in check and has no legal move: it loses all the same. */
  NoMoves: "no-moves",
  /** A position came a third time while one side checked with every move: that side loses. */
  PerpetualCheck: "perpetual-check",
  /** A position came a third time otherwise: a draw. */
  Repetition: "repetition",
  /** 120 moves in a row without a capture: a draw. */
  Quiet: "quiet",
} as const;

/** Moves in a row without a capture that end a game in a draw (spec "Hoà khi lâu không ăn quân"). */
export const XIANGQI_QUIET_LIMIT = 120;

export interface XiangqiMove {
  readonly from: number;
  readonly to: number;
}

/** A position since the last capture: its key, whether it is a check, and who moved into it. */
interface XiangqiStep {
  readonly key: string;
  readonly check: boolean;
  readonly mover: PlayerIndex | null;
}

/** An end decided while moving (repetition, perpetual check, quiet); mate is read from the board. */
interface XiangqiEnding {
  readonly reason: "perpetual-check" | "repetition" | "quiet";
  /** The side that loses (perpetual check), or `null` for a draw. */
  readonly loser: PlayerIndex | null;
}

export interface XiangqiState {
  readonly board: XiangqiBoard;
  /** 0 Đỏ, 1 Đen. */
  readonly toMove: PlayerIndex;
  /** Moves in a row without a capture. */
  readonly quiet: number;
  /** The positions since the last capture, the current one last (design §1). */
  readonly steps: readonly XiangqiStep[];
  /** Every move of the game in Vietnamese notation, for the score sheet. */
  readonly notes: readonly string[];
  readonly last: XiangqiMove | null;
  readonly ending: XiangqiEnding | null;
}

function keyOf(board: XiangqiBoard, toMove: PlayerIndex): string {
  return `${board.map((piece) => piece ?? ".").join("")}${String(toMove)}`;
}

function startState(): XiangqiState {
  const board = xiangqiBoardFromRows(XIANGQI_START_ROWS);
  return {
    board,
    toMove: 0,
    quiet: 0,
    steps: [{ key: keyOf(board, 0), check: false, mover: null }],
    notes: [],
    last: null,
    ending: null,
  };
}

/** A state set up from rows (tests, the rules page), `toMove` to play, nothing played before. */
export function xiangqiStateFromRows(
  rows: readonly string[],
  toMove: PlayerIndex = 0,
): XiangqiState {
  const board = xiangqiBoardFromRows(rows);
  return {
    board,
    toMove,
    quiet: 0,
    steps: [{ key: keyOf(board, toMove), check: generalInCheck(board, toMove === 0), mover: null }],
    notes: [],
    last: null,
    ending: null,
  };
}

/** Whether the side to move is in check. */
export function xiangqiInCheck(state: Pick<XiangqiState, "board" | "toMove">): boolean {
  return generalInCheck(state.board, state.toMove === 0);
}

/** The end a third repetition makes (spec "Chiếu dai và lặp lại"), or `null`. */
function repetitionEnding(steps: readonly XiangqiStep[]): XiangqiEnding | null {
  const current = steps.at(-1);
  if (current === undefined) return null;
  const seen = steps.filter((step) => step.key === current.key).length;
  if (seen < 3) return null;
  const first = steps.findIndex((step) => step.key === current.key);
  const since = steps.slice(first + 1);
  const checkedAll = (seat: PlayerIndex) => {
    const mine = since.filter((step) => step.mover === seat);
    return mine.length > 0 && mine.every((step) => step.check);
  };
  const red = checkedAll(0);
  const black = checkedAll(1);
  if (red !== black) return { reason: XIANGQI_REASON.PerpetualCheck, loser: red ? 0 : 1 };
  return { reason: XIANGQI_REASON.Repetition, loser: null };
}

function apply(state: XiangqiState, { from, to }: XiangqiMove): XiangqiState {
  const mover = state.toMove;
  const capture = state.board[to] != null;
  const board = boardAfter(state.board, from, to);
  const toMove = 1 - mover;
  const check = generalInCheck(board, toMove === 0);
  const step = { key: keyOf(board, toMove), check, mover };
  const steps = capture ? [step] : [...state.steps, step];
  const quiet = capture ? 0 : state.quiet + 1;
  // The 120th quiet move draws only a game not over by its rules: a mate on it still wins.
  const ending =
    repetitionEnding(steps) ??
    (quiet >= XIANGQI_QUIET_LIMIT && legalMovesOf(board, toMove === 0).length > 0
      ? { reason: XIANGQI_REASON.Quiet, loser: null }
      : null);
  return {
    board,
    toMove,
    quiet,
    steps,
    notes: [...state.notes, xiangqiNotation(state.board, from, to)],
    last: { from, to },
    ending,
  };
}

function resultOf(state: XiangqiState): GameResult | null {
  const { ending } = state;
  if (ending !== null) {
    return ending.loser === null
      ? { kind: "draw", reason: ending.reason }
      : { kind: "win", winners: [1 - ending.loser], reason: ending.reason };
  }
  if (legalMovesOf(state.board, state.toMove === 0).length > 0) return null;
  return {
    kind: "win",
    winners: [1 - state.toMove],
    reason: xiangqiInCheck(state) ? XIANGQI_REASON.Checkmate : XIANGQI_REASON.NoMoves,
  };
}

/** What each kind is worth to the AI (design §4); the rules never count material. */
const WORTH: Readonly<Record<XiangqiKind, number>> = {
  k: 0,
  a: 200,
  e: 200,
  h: 400,
  r: 900,
  c: 450,
  p: 100,
};

/** A piece's worth where it stands, for the side it belongs to. */
function pieceScore(kind: XiangqiKind, red: boolean, x: number, y: number): number {
  // Rows from its own back rank: 0 at home, 9 at the other side's back rank.
  const advance = red ? 9 - y : y;
  switch (kind) {
    case "p": {
      if (advance < 5) return WORTH.p;
      // Across the river: twice as strong, more near the other palace's columns and rows.
      const nearPalace = x >= 3 && x <= 5 && advance >= 7 && advance <= 9 ? 40 : 0;
      return 2 * WORTH.p + 10 * (advance - 5) + nearPalace;
    }
    case "h":
      // A horse on the edge is poor; forward and central, good.
      return WORTH.h + (x === 0 || x === 8 ? -30 : 0) + Math.min(advance, 6) * 6;
    case "c":
      // The central file (Pháo đầu) and the home rows are where a cannon starts its work.
      return WORTH.c + (x === 4 ? 20 : 0);
    case "r":
      return WORTH.r + (x === 0 || x === 8 ? 0 : 10) + Math.min(advance, 5) * 4;
    default:
      return WORTH[kind];
  }
}

/** How good `state` looks for `player`: material and placement, an integer. */
function xiangqiEvaluate(state: XiangqiState, player: PlayerIndex): number {
  let red = 0;
  let black = 0;
  state.board.forEach((piece, point) => {
    if (piece == null) return;
    const score = pieceScore(kindOf(piece), isRedPiece(piece), xOf(point), yOf(point));
    if (isRedPiece(piece)) red += score;
    else black += score;
  });
  return player === 0 ? red - black : black - red;
}

/** Legal moves, the most promising first for the search: big captures by small pieces, then the rest. */
function orderedMoves(state: XiangqiState): XiangqiMove[] {
  const moves = legalMovesOf(state.board, state.toMove === 0);
  const gain = ({ from, to }: XiangqiMove) => {
    const taken = state.board[to];
    const moving = state.board[from];
    if (taken == null || moving == null) return 0;
    return WORTH[kindOf(taken)] * 10 - WORTH[kindOf(moving)];
  };
  return moves.toSorted((a, b) => gain(b) - gain(a));
}

export const xiangqi = {
  id: "xiangqi",
  meta: {
    players: { min: 2, max: 2 },
    category: GAME_CATEGORY.VnFolk,
    durationMinutes: 20,
    supportsAI: true,
  },
  defaultOptions: {},
  setup: startState,
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) =>
    resultOf(state) === null ? legalMovesOf(state.board, state.toMove === 0) : [],
  applyMove: apply,
  result: resultOf,
  evaluate: xiangqiEvaluate,
  // Every legal move (none may be left out: a move that wins or stops a win at once is among
  // them), ordered so alpha-beta cuts more.
  candidateMoves: (state) => (resultOf(state) === null ? orderedMoves(state) : []),
  moveKey: ({ from, to }) => `${String(from)}-${String(to)}`,
} as const satisfies GameDefinition<XiangqiState, XiangqiMove>;
