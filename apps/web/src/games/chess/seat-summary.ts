import type { PlayerIndex } from "@board-games/engine";
import {
  CHESS_PIECE,
  chessBoard,
  type ChessPieceType,
  type ChessState,
} from "@board-games/games/chess";
import { useFormatter, useTranslations } from "next-intl";

import type { SeatSummary } from "../types";
import { colourOfSeat } from "./player-label";

/** What each piece is worth for the summary only (the rules never count material). */
const POINTS = {
  [CHESS_PIECE.Queen]: 9,
  [CHESS_PIECE.Rook]: 5,
  [CHESS_PIECE.Bishop]: 3,
  [CHESS_PIECE.Knight]: 3,
  [CHESS_PIECE.Pawn]: 1,
} as const satisfies Partial<Record<ChessPieceType, number>>;

type CountedPiece = keyof typeof POINTS;

/** Largest first, as a player counts them. */
const COUNTED = Object.keys(POINTS) as readonly CountedPiece[];

/** For each piece type, how many more of it `player` has than the other side (negative: fewer). */
function pieceSurplus(
  state: ChessState,
  player: PlayerIndex,
): Readonly<Record<CountedPiece, number>> {
  const mine = colourOfSeat(player);
  const surplus: Record<CountedPiece, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  for (const piece of chessBoard(state)) {
    if (piece === null || piece.type === CHESS_PIECE.King) continue;
    surplus[piece.type] += piece.color === mine ? 1 : -1;
  }
  return surplus;
}

/**
 * Hook returning a seat's material line beside the board: for the side ahead, how many points it is
 * up and the pieces it has more of ("Hơn 5 điểm: Mã, 2 Tốt", "+5" on a phone); nothing for the
 * other side, nor when both are level.
 */
export function useChessSeatSummary(): (
  player: PlayerIndex,
  state: ChessState,
) => SeatSummary | null {
  const t = useTranslations("Games.chess");
  const format = useFormatter();
  return (player, state) => {
    const surplus = pieceSurplus(state, player);
    const points = COUNTED.reduce((sum, type) => sum + POINTS[type] * surplus[type], 0);
    if (points <= 0) return null;
    const pieces = COUNTED.filter((type) => surplus[type] > 0).map((type) =>
      t("summary.piece", {
        count: surplus[type],
        piece: t(`pieces.${type}`),
        plural: t(`piecesPlural.${type}`),
      }),
    );
    return {
      full: t("summary.full", {
        points,
        pieces: format.list(pieces, { type: "unit", style: "short" }),
      }),
      short: t("summary.short", { points }),
    };
  };
}
