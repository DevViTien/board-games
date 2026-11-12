import {
  GAME_CATEGORY,
  type GameDefinition,
  type PlayerIndex,
  type SetupContext,
} from "@board-games/engine";

import { caroCandidateMoves, caroEvaluate } from "./ai";
import { CARO_INFINITE, CARO_RULE, CARO_SIZES, type CaroRule } from "./constants";
import { type CaroBoard, wouldWin } from "./lines";
import { CARO_DEFAULT_OPTIONS, caroGridSide, type CaroOptions, parseCaroOptions } from "./options";

/** Rows and columns of the board, counted from 0 at the top left, both ends included. */
export interface CaroArea {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

export interface CaroState {
  /**
   * The side of the square of cells: 15 or 19, or the hidden cap of the board that grows. The rule
   * options are part of the state, since the AI (in a Worker) only receives the state.
   */
  readonly size: number;
  /** The board that grows: its `area` widens around the stones, up to the `size × size` cap. */
  readonly infinite: boolean;
  readonly rule: CaroRule;
  /** `size × size` cells, row by row from the top left. */
  readonly board: CaroBoard;
  /**
   * Where stones may go: the whole board of a fixed size; on the board that grows, the middle
   * `CARO_INFINITE.start` cells at first, then always `CARO_INFINITE.margin` cells around every
   * stone, within the cap. It never shrinks.
   */
  readonly area: CaroArea;
  readonly toMove: PlayerIndex;
  /** Cells holding a stone: the game is a draw once all are filled without a winner. */
  readonly filled: number;
  /** Found once, by the move that won: only a line through the stone just placed can win. */
  readonly win: { readonly player: PlayerIndex; readonly cells: readonly number[] } | null;
}

export interface CaroMove {
  /** Index of the cell, `0 … size² − 1` row by row (of the cap, on the board that grows). */
  readonly cell: number;
}

/** The area a game starts with: the whole board, or the middle of the cap on the board that grows. */
export function caroStartArea(size: number, infinite: boolean): CaroArea {
  if (!infinite) return { top: 0, left: 0, bottom: size - 1, right: size - 1 };
  const first = Math.floor((size - CARO_INFINITE.start) / 2);
  const last = first + CARO_INFINITE.start - 1;
  return { top: first, left: first, bottom: last, right: last };
}

/**
 * The area after a stone on `cell`: the smallest rectangle holding `area` and every cell at most
 * `CARO_INFINITE.margin` rows and columns from it, within the board. On a board of fixed size the
 * area is the whole board already, so it stays as it is.
 */
export function caroGrowArea(area: CaroArea, size: number, cell: number): CaroArea {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const { margin } = CARO_INFINITE;
  const next = {
    top: Math.max(0, Math.min(area.top, row - margin)),
    left: Math.max(0, Math.min(area.left, col - margin)),
    bottom: Math.min(size - 1, Math.max(area.bottom, row + margin)),
    right: Math.min(size - 1, Math.max(area.right, col + margin)),
  };
  return next.top === area.top &&
    next.left === area.left &&
    next.bottom === area.bottom &&
    next.right === area.right
    ? area
    : next;
}

/** Whether `cell` of a `size × size` board lies in `area`. */
export function caroInArea(area: CaroArea, size: number, cell: number): boolean {
  const row = Math.floor(cell / size);
  const col = cell % size;
  return row >= area.top && row <= area.bottom && col >= area.left && col <= area.right;
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
  setup: ({ options }: SetupContext<CaroOptions>): CaroState => {
    const size = caroGridSide(options.size);
    const infinite = options.size === "infinite";
    return {
      size,
      infinite,
      rule: options.rule,
      board: Array.from({ length: size * size }, () => null),
      area: caroStartArea(size, infinite),
      toMove: 0,
      filled: 0,
      win: null,
    };
  },
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => {
    const moves: CaroMove[] = [];
    if (isOver(state)) return moves;
    const { area, board, size } = state;
    for (let row = area.top; row <= area.bottom; row += 1) {
      for (let col = area.left; col <= area.right; col += 1) {
        const cell = row * size + col;
        if (board[cell] === null) moves.push({ cell });
      }
    }
    return moves;
  },
  applyMove: (state, { cell }) => {
    const line = wouldWin(state.board, state.size, cell, state.toMove, state.rule);
    return {
      ...state,
      board: state.board.map((stone, index) => (index === cell ? state.toMove : stone)),
      toMove: 1 - state.toMove,
      filled: state.filled + 1,
      area: caroGrowArea(state.area, state.size, cell),
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
