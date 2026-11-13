import type { GameResult, PlayerIndex } from "@board-games/engine";
import {
  FORBIDDEN_TRIANGLE_REASON,
  type ForbiddenTriangleMove,
  type ForbiddenTriangleState,
  pairOf,
  safeLines,
} from "@board-games/games/forbidden-triangle";
import { useTranslations } from "next-intl";

import type { SeatSummary } from "../types";
import { guestName } from "./board-layout";

/** Two or three guests joined by dashes: "A–C", "A–B–D". */
export function guestsName(guests: readonly number[]): string {
  return guests.map(guestName).join("–");
}

/** Seat 0 draws red lines and moves first; seat 1 draws blue ones. */
export function useForbiddenTrianglePlayerLabel(): (player: PlayerIndex) => string {
  const t = useTranslations("Games.forbidden-triangle.players");
  return (player) => (player === 0 ? t("red") : t("blue"));
}

/** A move read out as the line it draws: "nối A–C". */
export function useForbiddenTriangleMoveLabel(): (
  move: ForbiddenTriangleMove,
  state: ForbiddenTriangleState,
) => string {
  const t = useTranslations("Games.forbidden-triangle");
  return ({ line }, state) => t("move", { line: guestsName(pairOf(state.guests, line)) });
}

/**
 * The result card's line: who closed which triangle ("Đỏ khép tam giác A–B–C."), or, after a
 * draw, that every line was drawn without one.
 */
export function useForbiddenTriangleResultDetail(): (
  result: GameResult,
  state: ForbiddenTriangleState,
) => string | null {
  const t = useTranslations("Games.forbidden-triangle.result");
  const playerLabel = useForbiddenTrianglePlayerLabel();
  return (result, state) => {
    if (state.lost !== null) {
      return t("triangle", {
        player: playerLabel(state.lost.player),
        triangle: guestsName(state.lost.triangle),
      });
    }
    return result.reason === FORBIDDEN_TRIANGLE_REASON.Full ? t("full") : null;
  };
}

/**
 * A seat's line in the players' panel: the lines it can still draw without closing its own
 * triangle, or, on its turn with none left, that every line closes one. The same on a phone.
 */
export function useForbiddenTriangleSeatSummary(): (
  player: PlayerIndex,
  state: ForbiddenTriangleState,
) => SeatSummary {
  const t = useTranslations("Games.forbidden-triangle.summary");
  return (player, state) => {
    const safe = safeLines(state, player).length;
    const over = state.lost !== null || state.lines.every((owner) => owner !== null);
    // Once the game is over, the lines each one drew: safe lines no longer mean anything.
    const drawn = state.lines.filter((owner) => owner === player).length;
    const line = over
      ? t("drawn", { count: drawn })
      : safe === 0 && state.toMove === player
        ? t("stuck")
        : t("safe", { count: safe });
    return { full: line, short: line };
  };
}
