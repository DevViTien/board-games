import { CHESS_PIECE, type ChessState } from "@board-games/games/chess";

import type { SeatMarkProps } from "../types";
import { ChessPiece } from "./pieces";
import { colourOfSeat } from "./player-label";

/** A seat's mark beside the board: the king of its side on a light square (a stand-in avatar). */
export function ChessSeatMark({ player }: SeatMarkProps<ChessState>) {
  return (
    <span
      aria-hidden
      className="flex size-full items-center justify-center rounded-[6px] border border-game-line bg-game-board"
    >
      <ChessPiece type={CHESS_PIECE.King} look={colourOfSeat(player)} className="size-[88%]" />
    </span>
  );
}
