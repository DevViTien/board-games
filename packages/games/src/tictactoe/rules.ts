import { GAME_CATEGORY, type GameDefinition, type PlayerIndex } from "@board-games/engine";

/** A cell holds the seat of the player who marked it (0 = X, 1 = O), or `null` when empty. */
export type TicTacToeCell = PlayerIndex | null;

export interface TicTacToeState {
  /** Nine cells, row by row from the top left. */
  readonly board: readonly TicTacToeCell[];
  readonly toMove: PlayerIndex;
}

export interface TicTacToeMove {
  /** Index of the cell to mark, 0–8 row by row. */
  readonly cell: number;
}

export const TICTACTOE_SIZE = 3;

export const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

function winnerOf(board: readonly TicTacToeCell[]): PlayerIndex | null {
  for (const [a, b, c] of WINNING_LINES) {
    const mark = board[a];
    if (mark !== null && mark !== undefined && mark === board[b] && mark === board[c]) return mark;
  }
  return null;
}

export const tictactoe = {
  id: "tictactoe",
  meta: {
    players: { min: 2, max: 2 },
    category: GAME_CATEGORY.Classic,
    durationMinutes: 2,
    supportsAI: true,
  },
  defaultOptions: {},
  // Typed so the inferred State is the full TicTacToeState, not the all-empty board it starts as.
  setup: (): TicTacToeState => ({
    board: Array.from({ length: TICTACTOE_SIZE * TICTACTOE_SIZE }, () => null),
    toMove: 0,
  }),
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
  // Each line holding only `player`'s marks scores +10^n (n marks), only the opponent's −10^n, and
  // a blocked line 0: an integer within ±800, as the AI's scale asks.
  evaluate: (state, player) =>
    WINNING_LINES.reduce((total, line) => {
      const marks = line.map((cell) => state.board[cell]);
      const mine = marks.filter((mark) => mark === player).length;
      const theirs = marks.filter((mark) => mark !== null && mark !== player).length;
      if (mine > 0 && theirs === 0) return total + 10 ** mine;
      if (theirs > 0 && mine === 0) return total - 10 ** theirs;
      return total;
    }, 0),
} as const satisfies GameDefinition<TicTacToeState, TicTacToeMove>;
