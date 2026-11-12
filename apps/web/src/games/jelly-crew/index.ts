import "./theme.css";

import { jellyCrew } from "@board-games/games/jelly-crew";

import { defineGameEntry } from "../define-game-entry";
import { JellyCrewBoard } from "./Board";
import { JellyCrewSeatMark } from "./SeatMark";
import {
  useJellyCrewMoveLabel,
  useJellyCrewPlayerLabel,
  useJellyCrewResultDetail,
  useJellyCrewSeatSummary,
} from "./words";

export const jellyCrewEntry = defineGameEntry(jellyCrew, {
  Board: JellyCrewBoard,
  usePlayerLabel: useJellyCrewPlayerLabel,
  useMoveLabel: useJellyCrewMoveLabel,
  useSeatSummary: useJellyCrewSeatSummary,
  useResultDetail: useJellyCrewResultDetail,
  SeatMark: JellyCrewSeatMark,
});
