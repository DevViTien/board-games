import { type ChessMove, type ChessState, isChessDrawClaim } from "@board-games/games/chess";
import { useTranslations } from "next-intl";

import { parseSan } from "./san";

/**
 * A move read out as what was done, to follow a name ("Minh vừa đi Mã g1 tới f3"): the piece, its
 * squares, a capture, castling on either side, the piece a pawn became, check or checkmate. The
 * move itself names only its squares: the rest is in its notation, the last of `state.san` (the
 * state after the move). An en passant capture reads as any capture: its notation is the same.
 */
export function useChessMoveLabel(): (move: ChessMove, state: ChessState) => string {
  const t = useTranslations("Games.chess");
  return (move, state) => {
    if (isChessDrawClaim(move)) return t("move.claim");
    const san = state.san.at(-1);
    if (san === undefined) return t("move.quiet", { piece: t("pieces.p"), ...move });
    const parsed = parseSan(san);
    let words: string;
    if (parsed.castle !== null) {
      words = t(parsed.castle === "king" ? "move.castleKing" : "move.castleQueen");
    } else {
      const squares = { piece: t(`pieces.${parsed.piece}`), from: move.from, to: move.to };
      words = parsed.capture ? t("move.capture", squares) : t("move.quiet", squares);
      if (parsed.promotion !== null) {
        words = t("move.promotion", { move: words, piece: t(`pieces.${parsed.promotion}`) });
      }
    }
    if (parsed.check === "check") return t("move.check", { move: words });
    if (parsed.check === "mate") return t("move.mate", { move: words });
    return words;
  };
}
