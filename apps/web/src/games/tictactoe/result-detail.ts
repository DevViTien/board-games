import type { GameResult } from "@board-games/engine";
import { type TicTacToeState, WINNING_LINES } from "@board-games/games/tictactoe";
import { useFormatter, useTranslations } from "next-intl";

import { useTicTacToePlayerLabel } from "./player-label";
import { winningLines } from "./winning-line";

/**
 * Hook returning the result card's line of a Tic-tac-toe game: where the three marks are, both
 * lines when the last move made two at once.
 */
export function useTicTacToeResultDetail(): (
  result: GameResult,
  state: TicTacToeState,
) => string | null {
  const t = useTranslations("Games.tictactoe.result");
  const format = useFormatter();
  const playerLabel = useTicTacToePlayerLabel();
  const whereOf = (index: number) => {
    if (index < 3) return t("row", { n: index + 1 });
    if (index < 6) return t("col", { n: index - 2 });
    return index === 6 ? t("diagonal") : t("antiDiagonal");
  };
  return (result, state) => {
    const lines = winningLines(result, state);
    const first = lines[0] === undefined ? undefined : WINNING_LINES[lines[0]]?.[0];
    const mark = first === undefined ? null : state.board[first];
    if (mark === null || mark === undefined) return null;
    return t("line", {
      mark: playerLabel(mark),
      where: format.list(lines.map(whereOf), { type: "conjunction" }),
    });
  };
}
