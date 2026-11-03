import "./theme.css";

import { ludo } from "@board-games/games/ludo";

import { defineGameEntry } from "../define-game-entry";
import { LudoBoard } from "./Board";
import { useLudoMoveLabel } from "./move-label";
import { useLudoPlayerLabel } from "./player-label";
import { useLudoResultDetail } from "./result-detail";
import { useLudoSeatSummary } from "./seat-summary";
import { LudoSeatMark } from "./SeatMark";

export const ludoEntry = defineGameEntry(ludo, {
  Board: LudoBoard,
  usePlayerLabel: useLudoPlayerLabel,
  useMoveLabel: useLudoMoveLabel,
  useSeatSummary: useLudoSeatSummary,
  useResultDetail: useLudoResultDetail,
  SeatMark: LudoSeatMark,
});
