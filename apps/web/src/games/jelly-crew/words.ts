"use client";

import type { GameResult, PlayerIndex } from "@board-games/engine";
import {
  JELLY_CREW_BLOCKED,
  JELLY_CREW_REASON,
  type JellyCrewDirection,
  type JellyCrewGroup,
  type JellyCrewKind,
  jellyCrewLayoutOf,
  jellyCrewMolds,
  type JellyCrewMove,
  jellyCrewRound,
  type JellyCrewState,
  type JellyCrewStep,
} from "@board-games/games/jelly-crew";
import { useFormatter, useTranslations } from "next-intl";

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
 * How a move is read out, from what the state after it says it did (`state.last`): "đi sang phải,
 * cửa ● mở", "đẩy thạch dâu sang phải, khuôn 2/4", "xong lượt", "lùi một bước", "đặt lại bản đồ".
 */
export function useJellyCrewMoveLabel(): (move: JellyCrewMove, state: JellyCrewState) => string {
  const t = useTranslations("Games.jelly-crew");
  const format = useFormatter();
  const sign = useGroupSign();
  return (move, state) => {
    const last = state.last;
    const parts: string[] = [];
    if (move === "end") {
      const plate = last === null ? undefined : holdingOf(state, last.seat);
      parts.push(
        plate === undefined ? t("move.end") : t("move.endHolding", { group: sign(plate) }),
      );
    } else if (move === "back") parts.push(t("move.back"));
    else if (move === "reset") parts.push(t("move.reset"));
    else {
      const direction = t(`directionWords.${move}`);
      const pushed = last?.pushed ?? [];
      parts.push(
        pushed.length === 0
          ? t("move.step", { direction })
          : t("move.push", {
              direction,
              kinds: format.list(
                pushed.map((kind: JellyCrewKind) => t(`kinds.${kind}`)),
                { type: "conjunction" },
              ),
            }),
      );
    }
    if (last !== null && last.move === move) {
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

/** The plate the seat's character stands on, if it does. */
export function holdingOf(state: JellyCrewState, seat: PlayerIndex): JellyCrewGroup | undefined {
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

/** The line under the result: the steps and rounds it took, or the mold cells left empty. */
export function useJellyCrewResultDetail(): (
  result: GameResult,
  state: JellyCrewState,
) => string | null {
  const t = useTranslations("Games.jelly-crew.result");
  return (result, state) => {
    if (result.reason === JELLY_CREW_REASON.Filled) {
      return t("filled", { steps: state.steps, rounds: jellyCrewRound(state) });
    }
    if (result.reason === JELLY_CREW_REASON.OutOfRounds) {
      const { fitted, total } = jellyCrewMolds(jellyCrewLayoutOf(state), state.board);
      return t("outOfRounds", { rounds: jellyCrewLayoutOf(state).rounds, left: total - fitted });
    }
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
