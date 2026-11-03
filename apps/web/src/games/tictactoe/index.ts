import "./theme.css";

import { tictactoe } from "@board-games/games/tictactoe";

import { defineGameEntry } from "../define-game-entry";
import { TicTacToeBoard } from "./Board";
import { useTicTacToeMoveLabel } from "./move-label";
import { useTicTacToePlayerLabel } from "./player-label";
import { useTicTacToeResultDetail } from "./result-detail";

export const tictactoeEntry = defineGameEntry(tictactoe, {
  Board: TicTacToeBoard,
  usePlayerLabel: useTicTacToePlayerLabel,
  useMoveLabel: useTicTacToeMoveLabel,
  useResultDetail: useTicTacToeResultDetail,
});
