import type { PlayerIndex } from "@board-games/engine";
import {
  type Fence,
  FENCE_RACE_ISSUE,
  fenceRaceDistance,
  type FenceRaceFenceIssue,
  type FenceRaceMove,
  type FenceRaceSide,
  type FenceRaceState,
  sameFence,
} from "@board-games/games/fence-race";
import { useFormatter, useTranslations } from "next-intl";

import { cellName, columnName, rowName } from "./board-layout";
import { seatColour } from "./piece-style";

/** The seat that played the last move, the one before the seat to move. */
export function lastMover({ toMove, pawns }: FenceRaceState): PlayerIndex {
  return (toMove + pawns.length - 1) % pawns.length;
}

/** The state as it would be with `fence` placed. */
export function withFence(state: FenceRaceState, fence: Fence): FenceRaceState {
  return { ...state, fences: [...state.fences, fence] };
}

/** The state as it would be with `fence` gone. */
export function withoutFence(state: FenceRaceState, fence: Fence): FenceRaceState {
  return { ...state, fences: state.fences.filter((other) => !sameFence(other, fence)) };
}

export interface WayChange {
  readonly player: PlayerIndex;
  readonly before: number;
  readonly after: number;
}

/** Whose way a change of the fences lengthens or shortens, seat by seat. */
export function wayChanges(before: FenceRaceState, after: FenceRaceState): readonly WayChange[] {
  return before.pawns.flatMap((_pawn, player) => {
    const stepsBefore = fenceRaceDistance(before, player);
    const stepsAfter = fenceRaceDistance(after, player);
    return stepsBefore === stepsAfter ? [] : [{ player, before: stepsBefore, after: stepsAfter }];
  });
}

/**
 * The words of the board around a position: a fence named by the cells it stands between, never by
 * "across" or "along" (which way that is depends on the turn of the board), and so the same on every
 * player's screen.
 */
export function useFenceWords(viewer: PlayerIndex | null) {
  const t = useTranslations("Games.fence-race");
  const format = useFormatter();
  const colour = (player: PlayerIndex) => t(`colours.${seatColour(player)}`);
  const nameOf = (player: PlayerIndex) => (player === viewer ? t("you") : colour(player));
  const names = (players: readonly PlayerIndex[]) =>
    format.list(players.map(nameOf), { type: "conjunction" });
  /** "rào giữa hàng 4 và 5, cột C–D". */
  const fenceName = ({ row, col, dir }: Fence, rows: number) =>
    dir === "h"
      ? t("fence.row", {
          low: rowName(row + 1, rows),
          high: rowName(row, rows),
          left: columnName(col),
          right: columnName(col + 1),
        })
      : t("fence.col", {
          left: columnName(col),
          right: columnName(col + 1),
          low: rowName(row + 1, rows),
          high: rowName(row, rows),
        });
  return {
    nameOf,
    names,
    fenceName,
    /** A fence's name to begin a line with: "Rào giữa hàng 4 và 5, cột C–D." */
    fenceLine: (fence: Fence, rows: number) => {
      const name = fenceName(fence, rows);
      return t("fenceLine", { fence: `${name.charAt(0).toUpperCase()}${name.slice(1)}` });
    },
    /** Why a fence may not go there. */
    issue: (issue: FenceRaceFenceIssue, rows: number): string => {
      switch (issue.code) {
        case FENCE_RACE_ISSUE.Overlap:
          return t("issue.overlap", { fence: fenceName(issue.fence, rows) });
        case FENCE_RACE_ISSUE.Cross:
          return t("issue.cross", { fence: fenceName(issue.fence, rows) });
        case FENCE_RACE_ISSUE.Seals:
          return t("issue.seals", { players: names(issue.seats) });
        case FENCE_RACE_ISSUE.NoFences:
          return t("issue.noFences");
        default:
          return t("issue.outOfBoard");
      }
    },
    /** Whose way changes: "Xanh dương: 6 → 9 bước". */
    changes: (changes: readonly WayChange[]) =>
      format.list(
        changes.map(({ player, before, after }) =>
          t("change", { player: nameOf(player), before, after }),
        ),
        { type: "unit", style: "short" },
      ),
    /** "Về cổng màu đỏ ● ở cạnh trên trước mọi người." */
    goal: (player: PlayerIndex, side: FenceRaceSide) =>
      t("goal", {
        colour: t(`colourWords.${seatColour(player)}`),
        symbol: t(`symbols.${seatColour(player)}`),
        side: t(`sides.${side}`),
      }),
  };
}

/** A move as an action, after the name of who played it: the text of `useMoveLabel`. */
export function useFenceMoveWords() {
  const t = useTranslations("Games.fence-race");
  const { fenceName } = useFenceWords(null);
  return (move: FenceRaceMove, rows: number): string => {
    if (move.kind === "step") return t("move.step", { cell: cellName(move, rows) });
    return t(move.kind === "fence" ? "move.fence" : "move.break", {
      fence: fenceName(move, rows),
    });
  };
}
