import "./theme.css";

import { caro } from "@board-games/games/caro";

import { defineGameEntry } from "../define-game-entry";
import { CaroBoard } from "./Board";
import { useCaroMoveLabel } from "./move-label";
import { useCaroPlayerLabel } from "./player-label";
import { useCaroResultDetail } from "./result-detail";

export const caroEntry = defineGameEntry(caro, {
  Board: CaroBoard,
  usePlayerLabel: useCaroPlayerLabel,
  useMoveLabel: useCaroMoveLabel,
  useResultDetail: useCaroResultDetail,
});
