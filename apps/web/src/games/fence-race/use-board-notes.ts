"use client";

import type { PlayerIndex } from "@board-games/engine";
import {
  type Fence,
  fenceRaceDistance,
  type FenceRaceFenceIssue,
  fenceRaceGoalSide,
  type FenceRaceMove,
  type FenceRaceState,
} from "@board-games/games/fence-race";
import { useTranslations } from "next-intl";

import { screenSide } from "./board-layout";
import { INPUT_MODE, type InputMode, type ModeBlock } from "./use-fence-input";
import { lastMover, useFenceMoveWords, useFenceWords, type WayChange } from "./words";

export interface BoardNote {
  readonly main: string;
  /** Second line, `""` for none. */
  readonly sub: string;
  /** The words say what cannot be done: shown as such, with a mark. */
  readonly bad: boolean;
}

export interface BoardNotesView {
  readonly state: FenceRaceState;
  readonly viewer: PlayerIndex | null;
  readonly turned: boolean;
  /** No move may be chosen now. */
  readonly disabled: boolean;
  readonly over: boolean;
  readonly sending: boolean;
  readonly mode: InputMode;
  readonly preview: Fence | null;
  readonly chosen: Fence | null;
  readonly issue: FenceRaceFenceIssue | null;
  /** Whose way the fence tried, or chosen, changes. */
  readonly changes: readonly WayChange[];
  /** The mode refused last, whose reason shows until something else is tried. */
  readonly refused: InputMode | null;
  readonly modeBlock: (mode: InputMode) => ModeBlock | null;
  /** Why no move may be chosen, already translated, from the play screen. */
  readonly lockedReason: string | null;
  readonly lastMove: FenceRaceMove | null;
}

/**
 * What the board says in words around its controls, from what is on it: the line under the board,
 * what only a screen reader hears, the name of the layer and each mode's second line. Apart from the
 * board because each has many cases, all tested here.
 */
export function useBoardNotes(view: BoardNotesView) {
  const t = useTranslations("Games.fence-race");
  const tPlay = useTranslations("Play");
  const { state, viewer, turned, disabled, over, sending, mode, preview, chosen, issue } = view;
  const { changes, refused, modeBlock, lockedReason, lastMove } = view;
  const { rows, toMove, moveCount } = state;
  const seats = state.pawns.length;
  const words = useFenceWords(viewer);
  const moveWords = useFenceMoveWords();
  const placing = mode === INPUT_MODE.Place;
  const breaking = mode === INPUT_MODE.Break;
  // Either it is somebody else's turn, or something else stands in the way of this player's.
  const myTurn = viewer === null || toMove === viewer;

  const goal = (player: PlayerIndex) =>
    words.goal(player, screenSide(fenceRaceGoalSide(seats, player), turned));

  /** "Đỏ vừa đi tới E2.": `null` when there is no move to tell. */
  const moveLine = (): string | null =>
    lastMove === null
      ? null
      : t("lastMove", {
          player: words.nameOf(lastMover(state)),
          move: moveWords(lastMove, rows),
        });

  function note(): BoardNote | null {
    if (over) return null;
    if (sending) {
      const fence = placing ? preview : chosen;
      return {
        main: t("sending"),
        sub: fence === null ? "" : words.fenceLine(fence, rows),
        bad: false,
      };
    }
    if (refused !== null) {
      const block = modeBlock(refused);
      if (block !== null && block !== "over") {
        return {
          main: block === "locked" ? (lockedReason ?? t("modeSub.waiting")) : t(`blocked.${block}`),
          sub: t("hints.triedSub"),
          bad: true,
        };
      }
    }
    if (placing && preview !== null) {
      const sub = words.fenceLine(preview, rows);
      if (issue !== null) return { main: words.issue(issue, rows), sub, bad: true };
      return {
        main: changes.length === 0 ? t("noLonger") : words.changes(changes),
        sub,
        bad: false,
      };
    }
    if (breaking && chosen !== null) {
      return {
        main: changes.length === 0 ? t("noShorter") : words.changes(changes),
        sub: words.fenceLine(chosen, rows),
        bad: false,
      };
    }
    if (disabled) {
      const reason = lockedReason ?? "";
      // A new game: what this player is here for, while the first ones move.
      if (moveCount < seats && viewer !== null) {
        return { main: goal(viewer), sub: reason, bad: false };
      }
      return { main: reason, sub: myTurn ? "" : t("hints.lockedSub"), bad: false };
    }
    if (placing) return { main: t("hints.place"), sub: t("hints.placeSub"), bad: false };
    if (breaking) return { main: t("hints.break"), sub: t("hints.breakSub"), bad: false };
    // On a shared device nothing else tells the move just played; with one player here, the turn
    // line does.
    const said = viewer === null ? moveLine() : null;
    if (moveCount < seats) {
      return { main: goal(toMove), sub: said ?? t("hints.move"), bad: false };
    }
    return said === null
      ? { main: t("hints.move"), sub: "", bad: false }
      : { main: said, sub: t("hints.move"), bad: false };
  }

  /** What only a screen reader hears: the fence tried; on a shared device, the move just played. */
  function live(): string {
    if (over || sending) return "";
    const fence = placing ? preview : breaking ? chosen : null;
    if (fence !== null) {
      const name = words.fenceLine(fence, rows);
      if (placing && issue !== null) return `${name} ${words.issue(issue, rows)}`;
      return changes.length === 0 ? name : `${name} ${words.changes(changes)}`;
    }
    return viewer === null ? (moveLine() ?? "") : "";
  }

  /** The name of the layer over the board, where the keyboard's cursor is. */
  function layerLabel(): string {
    if (placing) {
      if (preview === null) return t("hints.place");
      const name = words.fenceLine(preview, rows);
      return issue === null ? name : `${name} ${words.issue(issue, rows)}`;
    }
    const name = chosen === null ? t("hints.break") : words.fenceLine(chosen, rows);
    return `${name} ${t("hints.breakKeys")}`;
  }

  /** The second line of a mode's button. */
  function modeSub(wanted: InputMode): string {
    const block = modeBlock(wanted);
    if (block === "sending" || (block === "locked" && lockedReason === tPlay("locked.sending"))) {
      return t("modeSub.sending");
    }
    if (block === "locked") return t(myTurn ? "modeSub.paused" : "modeSub.waiting");
    if (block !== null && block !== "over") return t(`blocked.${block}`);
    if (wanted === INPUT_MODE.Move) {
      return t("modeSub.steps", { count: Math.max(0, fenceRaceDistance(state, toMove)) });
    }
    if (wanted === INPUT_MODE.Place) {
      return t("modeSub.fences", { count: state.fencesLeft[toMove] ?? 0 });
    }
    return t("modeSub.breaks");
  }

  return { note: note(), live: live(), layerLabel: layerLabel(), modeSub };
}
