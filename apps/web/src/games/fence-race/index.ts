import "./theme.css";

import { fenceRace } from "@board-games/games/fence-race";

import { defineGameEntry } from "../define-game-entry";
import { FenceRaceBoard } from "./Board";
import { useFenceRaceMoveLabel } from "./move-label";
import { useFenceRacePlayerLabel } from "./player-label";
import { useFenceRaceResultDetail } from "./result-detail";
import { useFenceRaceSeatSummary } from "./seat-summary";
import { FenceRaceSeatMark } from "./SeatMark";

export const fenceRaceEntry = defineGameEntry(fenceRace, {
  Board: FenceRaceBoard,
  usePlayerLabel: useFenceRacePlayerLabel,
  useMoveLabel: useFenceRaceMoveLabel,
  useSeatSummary: useFenceRaceSeatSummary,
  useResultDetail: useFenceRaceResultDetail,
  SeatMark: FenceRaceSeatMark,
});
