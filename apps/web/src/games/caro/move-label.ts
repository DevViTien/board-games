import type { CaroMove, CaroState } from "@board-games/games/caro";
import { useTranslations } from "next-intl";

/**
 * A move read out as placing a stone on its cell, row and column counted from 1, as the cells are
 * named ("đánh hàng 2, cột 3"). A move is only a cell index, so the board size comes from the state
 * of the game it was played in.
 */
export function useCaroMoveLabel(): (move: CaroMove, state: CaroState) => string {
  const t = useTranslations("Games.caro");
  return ({ cell }, { size }) =>
    t("move", { row: Math.floor(cell / size) + 1, col: (cell % size) + 1 });
}
