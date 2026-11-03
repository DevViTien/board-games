import type { GameResult } from "@board-games/engine";
import { type TicTacToeState, WINNING_LINES } from "@board-games/games/tictactoe";

/**
 * The indexes in `WINNING_LINES` of every line the winner made (rows 0–2, columns 3–5, the main
 * diagonal 6, the other 7): one, or two when the last move completed two at once. Empty when nobody
 * has won. Read from the board, the rules unchanged.
 */
export function winningLines(result: GameResult | null, state: TicTacToeState): readonly number[] {
  if (result?.kind !== "win") return [];
  return WINNING_LINES.flatMap(([a, b, c], index) => {
    const mark = state.board[a];
    return mark !== null && mark !== undefined && mark === state.board[b] && mark === state.board[c]
      ? [index]
      : [];
  });
}
