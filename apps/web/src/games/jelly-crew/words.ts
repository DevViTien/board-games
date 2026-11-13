"use client";

import type { GameResult, PlayerIndex } from "@board-games/engine";
import {
  JELLY_CREW_BLOCKED,
  JELLY_CREW_REASON,
  type JellyCrewDirection,
  type JellyCrewGroup,
  type JellyCrewKind,
  jellyCrewLayoutOf,
  type JellyCrewMove,
  jellyCrewMoveParts,
  type JellyCrewState,
  type JellyCrewStep,
} from "@board-games/games/jelly-crew";
import { useFormatter, useTranslations } from "next-intl";

import type { GameTime } from "@/transport/types";

import type { SeatSummary } from "../types";

/** The name of a seat: the colour of its character ("Lam", "Hồng", "Cam", "Ngọc"). */
export function useJellyCrewPlayerLabel(): (player: PlayerIndex) => string {
  const t = useTranslations("Games.jelly-crew.seats");
  return (player) => t(String(player + 1) as "1");
}

/** The sign of a group (● ▲ ■), as the board draws it. */
export function useGroupSign(): (group: JellyCrewGroup) => string {
  const t = useTranslations("Games.jelly-crew.groups");
  return (group) => t(group);
}

/**
 * How a move is read out, from what the state after it says it did (`state.last`), naming the
 * character: "Hồng đi sang phải, cửa ● mở", "Lam đẩy thạch dâu sang phải, khuôn 2/4", "Cam đặt lại
 * bản đồ".
 */
export function useJellyCrewMoveLabel(): (move: JellyCrewMove, state: JellyCrewState) => string {
  const t = useTranslations("Games.jelly-crew");
  const format = useFormatter();
  const sign = useGroupSign();
  const seatName = useJellyCrewPlayerLabel();
  return (move, state) => {
    const { seat, action } = jellyCrewMoveParts(move);
    const name = seatName(seat);
    const last = state.last;
    const parts: string[] = [];
    if (action === "reset") parts.push(t("move.reset", { name }));
    else {
      const direction = t(`directionWords.${action}`);
      const pushed = last?.pushed ?? [];
      parts.push(
        pushed.length === 0
          ? t("move.step", { name, direction })
          : t("move.push", {
              name,
              direction,
              kinds: format.list(
                pushed.map((kind: JellyCrewKind) => t(`kinds.${kind}`)),
                { type: "conjunction" },
              ),
            }),
      );
    }
    if (last !== null && last.seat === seat && last.action === action) {
      const groups = (list: readonly JellyCrewGroup[]) => list.map(sign).join(" ");
      if (last.opened.length > 0) parts.push(t("move.opened", { groups: groups(last.opened) }));
      if (last.closed.length > 0) parts.push(t("move.closed", { groups: groups(last.closed) }));
      if (last.molds !== null) {
        parts.push(t("move.molds", { fitted: last.molds.fitted, total: last.molds.total }));
      }
    }
    return parts.join(", ");
  };
}

/**
 * Whether the move that led to `state` only walked: no jelly pushed, no door opened or closed, no
 * mold filled. Another player's such step is not read out (spec "Dùng được bằng trình đọc màn hình").
 */
export function isQuietMove(state: JellyCrewState): boolean {
  const last = state.last;
  return (
    last !== null &&
    last.action !== "reset" &&
    last.pushed.length === 0 &&
    last.opened.length === 0 &&
    last.closed.length === 0 &&
    last.molds === null
  );
}

/** The plate the seat's character stands on, if it does. */
function holdingOf(state: JellyCrewState, seat: PlayerIndex): JellyCrewGroup | undefined {
  const cell = state.board.chars[seat];
  return cell === undefined ? undefined : jellyCrewLayoutOf(state).plates.get(cell);
}

/** "Giữ nút ●" for a seat standing on a plate, in the players' panel. */
export function useJellyCrewSeatSummary(): (
  player: PlayerIndex,
  state: JellyCrewState,
) => SeatSummary | null {
  const t = useTranslations("Games.jelly-crew");
  const sign = useGroupSign();
  return (player, state) => {
    const plate = holdingOf(state, player);
    if (plate === undefined) return null;
    const line = t("holding", { group: sign(plate) });
    return { full: line, short: line };
  };
}

/**
 * The line under the result: the steps the team took and, when known, how long it took (from
 * `gameTime`); at the safety limit, the moves played.
 */
export function useJellyCrewResultDetail(): (
  result: GameResult,
  state: JellyCrewState,
  gameTime: GameTime | null,
) => string | null {
  const t = useTranslations("Games.jelly-crew.result");
  return (result, state, gameTime) => {
    if (result.reason === JELLY_CREW_REASON.Filled) {
      const ended = gameTime?.endedAt ?? null;
      if (gameTime === null || ended === null) return t("filled", { steps: state.steps });
      const total = Math.max(0, Math.round((ended - gameTime.startedAt) / 1000));
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      const time = minutes > 0 ? t("minutes", { minutes, seconds }) : t("seconds", { seconds });
      return t("filledTime", { steps: state.steps, time });
    }
    if (result.reason === JELLY_CREW_REASON.TooLong) return t("tooLong", { moves: state.moves });
    return null;
  };
}

/** Why a step cannot be taken, as a disabled direction says it ("Tường", "Cửa ▲ đóng", "Hồng chắn"). */
export function useBlockedReason(): (step: Extract<JellyCrewStep, { ok: false }>) => string {
  const t = useTranslations("Games.jelly-crew.blocked");
  const sign = useGroupSign();
  const seatName = useJellyCrewPlayerLabel();
  return (step) => {
    const group = step.group === undefined ? "" : sign(step.group);
    const name = step.seat === undefined ? "" : seatName(step.seat);
    switch (step.blocked) {
      case JELLY_CREW_BLOCKED.Door:
        return t("door", { group });
      case JELLY_CREW_BLOCKED.PushDoor:
        return t("push-door", { group });
      case JELLY_CREW_BLOCKED.Seat:
        return t("seat", { name });
      case JELLY_CREW_BLOCKED.PushSeat:
        return t("push-seat", { name });
      default:
        return t(step.blocked);
    }
  };
}

/** The words of a direction's button ("Lên") and of a direction in a sentence ("lên"). */
export function useDirectionWords(): {
  readonly button: (direction: JellyCrewDirection) => string;
  readonly word: (direction: JellyCrewDirection) => string;
} {
  const t = useTranslations("Games.jelly-crew");
  return {
    button: (direction) => t(`directions.${direction}`),
    word: (direction) => t(`directionWords.${direction}`),
  };
}
