import type { XiangqiState } from "@board-games/games/xiangqi";

import type { SeatMarkProps } from "../types";
import { XiangqiPieceDisc } from "./pieces";

/** A seat's mark beside the board: the general of its side (帥 or 將). */
export function XiangqiSeatMark({ player }: SeatMarkProps<XiangqiState>) {
  return <XiangqiPieceDisc piece={player === 0 ? "K" : "k"} className="size-full" />;
}
