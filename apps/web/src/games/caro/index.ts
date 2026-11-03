import { caro } from "@board-games/games/caro";

import { defineGameEntry } from "../define-game-entry";
import { CaroBoard } from "./Board";
import { useCaroMoveLabel } from "./move-label";
import { useCaroPlayerLabel } from "./player-label";

export const caroEntry = defineGameEntry(caro, {
  Board: CaroBoard,
  usePlayerLabel: useCaroPlayerLabel,
  useMoveLabel: useCaroMoveLabel,
});
