import { ludo } from "@board-games/games/ludo";

import { defineGameEntry } from "../define-game-entry";
import { LudoBoard } from "./Board";
import { useLudoMoveLabel } from "./move-label";
import { useLudoPlayerLabel } from "./player-label";

export const ludoEntry = defineGameEntry(ludo, {
  Board: LudoBoard,
  usePlayerLabel: useLudoPlayerLabel,
  useMoveLabel: useLudoMoveLabel,
});
