import { TICTACTOE_SIZE, type TicTacToeMove } from "@board-games/games/tictactoe";
import { useTranslations } from "next-intl";

/**
 * A move read out as placing a stone on its cell, row and column counted from 1, as the cells are
 * named ("đánh hàng 2, cột 3"). The board is always 3×3, so the state the play screen also passes
 * is not needed.
 */
export function useTicTacToeMoveLabel(): (move: TicTacToeMove) => string {
  const t = useTranslations("Games.tictactoe");
  return ({ cell }) =>
    t("move", { row: Math.floor(cell / TICTACTOE_SIZE) + 1, col: (cell % TICTACTOE_SIZE) + 1 });
}
