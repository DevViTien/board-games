import "./theme.css";

import { chess } from "@board-games/games/chess";

import { defineGameEntry } from "../define-game-entry";
import { ChessBoard } from "./Board";
import { useChessMoveLabel } from "./move-label";
import { useChessPlayerLabel } from "./player-label";
import { useChessResultDetail } from "./result-detail";
import { useChessSeatSummary } from "./seat-summary";
import { ChessSeatMark } from "./SeatMark";

export const chessEntry = defineGameEntry(chess, {
  Board: ChessBoard,
  usePlayerLabel: useChessPlayerLabel,
  useMoveLabel: useChessMoveLabel,
  useSeatSummary: useChessSeatSummary,
  useResultDetail: useChessResultDetail,
  SeatMark: ChessSeatMark,
});
