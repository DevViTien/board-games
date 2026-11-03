import {
  GAME_CATEGORY,
  type GameDefinition,
  type PlayerIndex,
  type SetupContext,
} from "@board-games/engine";

import { caroCandidateMoves, caroEvaluate } from "./ai";
import { CARO_RULE, CARO_SIZES, type CaroRule, type CaroSize } from "./constants";
import { type CaroBoard, wouldWin } from "./lines";
import { CARO_DEFAULT_OPTIONS, type CaroOptions, parseCaroOptions } from "./options";

export interface CaroState {
  /** The rule options are part of the state, since the AI (in a Worker) only receives the state. */
  readonly size: CaroSize;
  readonly rule: CaroRule;
  /** `size × size` cells, row by row from the top left. */
  readonly board: CaroBoard;
  readonly toMove: PlayerIndex;
  /** Cells holding a stone: the game is a draw once all are filled without a winner. */
  readonly filled: number;
  /** Found once, by the move that won: only a line through the stone just placed can win. */
  readonly win: { readonly player: PlayerIndex; readonly cells: readonly number[] } | null;
}

export interface CaroMove {
  /** Index of the cell, `0 … size² − 1` row by row. */
  readonly cell: number;
}

function isOver(state: CaroState): boolean {
  return state.win !== null || state.filled === state.board.length;
}

/** The cells of the winning line, from one end to the other, or `null` while nobody has won. */
export function caroWinningLine(state: CaroState): readonly number[] | null {
  return state.win?.cells ?? null;
}

export const caro = {
  id: "caro",
  meta: {
    players: { min: 2, max: 2 },
    category: GAME_CATEGORY.VnFolk,
    durationMinutes: 10,
    supportsAI: true,
  },
  defaultOptions: CARO_DEFAULT_OPTIONS,
  // Display order: the default first.
  optionChoices: { size: CARO_SIZES, rule: [CARO_RULE.BlockedEnds, CARO_RULE.Free] },
  parseOptions: parseCaroOptions,
  setup: ({ options }: SetupContext<CaroOptions>): CaroState => ({
    size: options.size,
    rule: options.rule,
    board: Array.from({ length: options.size * options.size }, () => null),
    toMove: 0,
    filled: 0,
    win: null,
  }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => {
    const moves: CaroMove[] = [];
    if (isOver(state)) return moves;
    state.board.forEach((stone, cell) => {
      if (stone === null) moves.push({ cell });
    });
    return moves;
  },
  applyMove: (state, { cell }) => {
    const line = wouldWin(state.board, state.size, cell, state.toMove, state.rule);
    return {
      ...state,
      board: state.board.map((stone, index) => (index === cell ? state.toMove : stone)),
      toMove: 1 - state.toMove,
      filled: state.filled + 1,
      win: line === null ? null : { player: state.toMove, cells: line },
    };
  },
  result: (state) => {
    if (state.win !== null) return { kind: "win", winners: [state.win.player] };
    return state.filled === state.board.length ? { kind: "draw" } : null;
  },
  evaluate: caroEvaluate,
  candidateMoves: caroCandidateMoves,
  // Matching a move while replaying a record compares keys: a number is far cheaper than JSON.
  moveKey: ({ cell }) => String(cell),
} as const satisfies GameDefinition<CaroState, CaroMove, never, CaroOptions>;
