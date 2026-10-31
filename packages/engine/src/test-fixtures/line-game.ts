import { GAME_CATEGORY } from "../constants";
import type { GameDefinition, PlayerIndex } from "../types";

// Three in a row on a 3×3 board, with an evaluation. The engine may not import packages/games, so
// the AI is tested on this small copy of the rules.

export interface LineState {
  readonly board: readonly (PlayerIndex | null)[];
  readonly toMove: PlayerIndex;
}

export interface LineMove {
  readonly cell: number;
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

function winnerOf(board: readonly (PlayerIndex | null)[]): PlayerIndex | null {
  for (const [a, b, c] of LINES) {
    const mark = board[a];
    if (mark !== null && mark !== undefined && mark === board[b] && mark === board[c]) return mark;
  }
  return null;
}

export const lineGame = {
  id: "line",
  meta: {
    players: { min: 2, max: 2 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 1,
    supportsAI: true,
  },
  defaultOptions: {},
  setup: (): LineState => ({ board: Array.from({ length: 9 }, () => null), toMove: 0 }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) =>
    winnerOf(state.board) === null
      ? state.board.flatMap((mark, cell) => (mark === null ? [{ cell }] : []))
      : [],
  applyMove: (state, move) => ({
    board: state.board.map((mark, cell) => (cell === move.cell ? state.toMove : mark)),
    toMove: 1 - state.toMove,
  }),
  result: (state) => {
    const winner = winnerOf(state.board);
    if (winner !== null) return { kind: "win", winners: [winner] };
    return state.board.every((mark) => mark !== null) ? { kind: "draw" } : null;
  },
  // Each line with only `player`'s marks scores +10^n, only the opponent's −10^n.
  evaluate: (state, player) =>
    LINES.reduce((total, line) => {
      const marks = line.map((cell) => state.board[cell]);
      const mine = marks.filter((mark) => mark === player).length;
      const theirs = marks.filter((mark) => mark !== null && mark !== player).length;
      if (mine > 0 && theirs === 0) return total + 10 ** mine;
      if (theirs > 0 && mine === 0) return total - 10 ** theirs;
      return total;
    }, 0),
} as const satisfies GameDefinition<LineState, LineMove>;

/** A position from a string of 9 characters: "X", "O" or "." per cell, row by row. */
export function linePosition(cells: string): LineState {
  const board = Array.from({ length: 9 }, (_unused, index) => {
    const cell = cells.charAt(index);
    return cell === "X" ? 0 : cell === "O" ? 1 : null;
  });
  const marks = board.filter((mark) => mark !== null).length;
  return { board, toMove: marks % 2 };
}
