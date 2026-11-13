import "./theme.css";

import { xiangqi } from "@board-games/games/xiangqi";

import { defineGameEntry } from "../define-game-entry";
import { XiangqiBoard } from "./Board";
import { XiangqiSeatMark } from "./SeatMark";
import {
  useXiangqiMoveLabel,
  useXiangqiPlayerLabel,
  useXiangqiResultDetail,
  useXiangqiSeatSummary,
} from "./words";

export const xiangqiEntry = defineGameEntry(xiangqi, {
  Board: XiangqiBoard,
  usePlayerLabel: useXiangqiPlayerLabel,
  useMoveLabel: useXiangqiMoveLabel,
  useSeatSummary: useXiangqiSeatSummary,
  useResultDetail: useXiangqiResultDetail,
  SeatMark: XiangqiSeatMark,
});
