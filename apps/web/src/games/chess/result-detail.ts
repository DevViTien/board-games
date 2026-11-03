import type { GameResult } from "@board-games/engine";
import { chess, CHESS_RESULT_REASON, type ChessState } from "@board-games/games/chess";
import { useTranslations } from "next-intl";

import { useChessPlayerLabel } from "./player-label";

const REASONS: ReadonlySet<string> = new Set(Object.values(CHESS_RESULT_REASON));

/**
 * Hook returning the result card's line of a Chess game: why it ended. `{player}` is the side to
 * move, which is the side without a move on a stalemate and the side that claimed a draw.
 */
export function useChessResultDetail(): (result: GameResult, state: ChessState) => string | null {
  const t = useTranslations("Games.chess.result");
  const playerLabel = useChessPlayerLabel();
  return (result, state) => {
    const { reason } = result;
    if (reason === undefined || !REASONS.has(reason)) return null;
    const player = playerLabel(chess.currentPlayer(state));
    switch (reason) {
      case CHESS_RESULT_REASON.Checkmate:
        return t("checkmate");
      case CHESS_RESULT_REASON.Stalemate:
        return t("stalemate", { player });
      case CHESS_RESULT_REASON.InsufficientMaterial:
        return t("insufficient-material");
      case CHESS_RESULT_REASON.ThreefoldClaim:
        return t("threefold-claim", { player });
      case CHESS_RESULT_REASON.FiftyMoveClaim:
        return t("fifty-move-claim", { player });
      case CHESS_RESULT_REASON.FivefoldRepetition:
        return t("fivefold-repetition");
      default:
        return t("seventy-five-move");
    }
  };
}
