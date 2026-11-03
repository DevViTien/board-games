import type { PlayerIndex } from "@board-games/engine";
import { CHESS_COLOR, type ChessColor } from "@board-games/games/chess";
import { useTranslations } from "next-intl";

/** The side a seat plays: seat 0 White, seat 1 Black. */
export function colourOfSeat(player: PlayerIndex): ChessColor {
  return player === 1 ? CHESS_COLOR.Black : CHESS_COLOR.White;
}

/** The seat that plays a side. */
export function seatOfColour(colour: ChessColor): PlayerIndex {
  return colour === CHESS_COLOR.Black ? 1 : 0;
}

/** A seat is named by its side: "Trắng", "Đen". */
export function useChessPlayerLabel(): (player: PlayerIndex) => string {
  const t = useTranslations("Games.chess.players");
  return (player) => t(colourOfSeat(player) === CHESS_COLOR.Black ? "black" : "white");
}
