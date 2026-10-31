import { TICTACTOE_SIZE, type TicTacToeMove } from "@board-games/games";
import { useTranslations } from "next-intl";

/** A move read out by its cell, row and column counted from 1, as the cells are named. */
export function useTicTacToeMoveLabel(): (move: TicTacToeMove) => string {
  const t = useTranslations("Games.tictactoe");
  return ({ cell }) =>
    t("move", { row: Math.floor(cell / TICTACTOE_SIZE) + 1, col: (cell % TICTACTOE_SIZE) + 1 });
}
