import "./theme.css";

import { forbiddenTriangle } from "@board-games/games/forbidden-triangle";

import { defineGameEntry } from "../define-game-entry";
import { ForbiddenTriangleBoard } from "./Board";
import { ForbiddenTriangleSeatMark } from "./SeatMark";
import {
  useForbiddenTriangleMoveLabel,
  useForbiddenTrianglePlayerLabel,
  useForbiddenTriangleResultDetail,
  useForbiddenTriangleSeatSummary,
} from "./words";

export const forbiddenTriangleEntry = defineGameEntry(forbiddenTriangle, {
  Board: ForbiddenTriangleBoard,
  usePlayerLabel: useForbiddenTrianglePlayerLabel,
  useMoveLabel: useForbiddenTriangleMoveLabel,
  useSeatSummary: useForbiddenTriangleSeatSummary,
  useResultDetail: useForbiddenTriangleResultDetail,
  SeatMark: ForbiddenTriangleSeatMark,
});
