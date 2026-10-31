import { tictactoe } from "@board-games/games";

import { defineGameEntry } from "../define-game-entry";
import { TicTacToeBoard } from "./Board";
import { useTicTacToeMoveLabel } from "./move-label";
import { useTicTacToePlayerLabel } from "./player-label";

export const tictactoeEntry = defineGameEntry(tictactoe, {
  Board: TicTacToeBoard,
  usePlayerLabel: useTicTacToePlayerLabel,
  useMoveLabel: useTicTacToeMoveLabel,
});
