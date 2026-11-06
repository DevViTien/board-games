"use client";

import type { GameResult } from "@board-games/engine";
import {
  type Fence,
  type FenceRaceFenceIssue,
  fenceRaceFenceIssue,
  type FenceRaceMove,
  type FenceRaceState,
  sameFence,
} from "@board-games/games/fence-race";
import { type PointerEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react";

import {
  boardDirection,
  type BoardGeometry,
  type BoardPoint,
  boardWidth,
  type Direction,
  fenceInDirection,
  fenceInOrder,
  fromScreen,
  isNearFence,
  nearestExistingFence,
  nearestFence,
  shiftFence,
  turnedFence,
} from "./board-geometry";

export const INPUT_MODE = { Move: "move", Place: "place", Break: "break" } as const;

export type InputMode = (typeof INPUT_MODE)[keyof typeof INPUT_MODE];

/** The arrows, on screen. */
const ARROWS: Readonly<Record<string, Direction>> = {
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
};

/** A finger moved at most this far (in pixels) is a touch, not a drag. */
const DRAG_SLOP_PX = 6;

export function arrowDirection(key: string): Direction | undefined {
  return ARROWS[key];
}

/** Why a mode cannot be chosen now, as a key of the game's words; `null` if it can. */
export type ModeBlock = "over" | "locked" | "sending" | "noFences" | "broke" | "noFenceToBreak";

interface FenceInputConfig {
  readonly state: FenceRaceState;
  readonly geometry: BoardGeometry;
  readonly legalMoves: readonly FenceRaceMove[];
  readonly onMove: (move: FenceRaceMove) => void;
  readonly disabled: boolean;
  /** The game's result, with any ending outside its rules: `state.result` does not have those. */
  readonly result: GameResult | null;
  readonly frame: RefObject<HTMLElement | null>;
}

/** A finger on the board, from the press to the lift. */
interface Press {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly point: BoardPoint;
  /** Grabbed the fence being tried: it follows by how far the finger moved, without a jump. */
  readonly grabbed: boolean;
  readonly fenceAtPress: Fence | null;
  /** The fence chosen to break before this press, which may be a second finger's first. */
  readonly chosenAtPress: Fence | null;
  /** Its place came from this very press: a lift without moving does not turn it. */
  readonly fresh: boolean;
  moved: boolean;
}

/** Whether the mode, the fence tried and what was sent hold for this position. */
interface Attempt {
  readonly position: string;
  readonly mode: InputMode;
  readonly preview: Fence | null;
  readonly chosen: Fence | null;
  /** The mode refused last, whose reason shows until another is chosen. */
  readonly refused: InputMode | null;
  /** The fence or the break sent and not answered yet. */
  readonly sent: boolean;
}

/**
 * What makes a position another one, by content: online the state is rebuilt on every update of the
 * room. A game ended outside its rules changes neither the moves nor the board; a new game may start
 * from the same moves count as the one before only if that one is over, or has another size.
 */
function positionOf(state: FenceRaceState, over: boolean): string {
  const { moveCount, toMove, rows, columns, pawns } = state;
  return [moveCount, toMove, rows, columns, pawns.length, over].join(":");
}

function freshAttempt(position: string): Attempt {
  return {
    position,
    mode: INPUT_MODE.Move,
    preview: null,
    chosen: null,
    refused: null,
    sent: false,
  };
}

/**
 * The player's mode, the fence being tried and the finger on the board: this device's own, never in
 * the game's record, never sent. They belong to a position (`positionOf`): a lost connection keeps
 * them and any new position, or the end of the game, drops them.
 */
export function useFenceInput({
  state,
  geometry,
  legalMoves,
  onMove,
  disabled,
  result,
  frame,
}: FenceInputConfig) {
  const over = result !== null;
  const position = positionOf(state, over);
  const [attempt, setAttempt] = useState<Attempt>(() => freshAttempt(position));
  // Adjusted during render: nothing of another position is ever drawn.
  let current = attempt;
  if (attempt.position !== position) {
    current = freshAttempt(position);
    setAttempt(current);
  }
  // A move sent comes back as a new position or, refused, unlocks this one with the fence still there.
  const [wasLocked, setWasLocked] = useState(disabled);
  if (wasLocked !== disabled) {
    setWasLocked(disabled);
    if (!disabled && current.sent) {
      current = { ...current, sent: false };
      setAttempt(current);
    }
  }

  const { mode, preview, chosen, refused, sent } = current;
  const sending = sent;
  const canAct = !disabled && !over && !sending;

  const mover = state.toMove;
  const hasFences = (state.fencesLeft[mover] ?? 0) > 0;
  const hasBreak = (state.breaksLeft[mover] ?? 0) > 0;

  function modeBlock(wanted: InputMode): ModeBlock | null {
    if (over) return "over";
    if (sending) return "sending";
    if (disabled) return "locked";
    if (wanted === INPUT_MODE.Place && !hasFences) return "noFences";
    if (wanted === INPUT_MODE.Break && !hasBreak) return "broke";
    if (wanted === INPUT_MODE.Break && state.fences.length === 0) return "noFenceToBreak";
    return null;
  }

  const issue: FenceRaceFenceIssue | null =
    mode === INPUT_MODE.Place && preview !== null ? fenceRaceFenceIssue(state, preview) : null;

  /** The move the button would send now, one of the rules' own. */
  function moveToConfirm(): FenceRaceMove | null {
    const fence = mode === INPUT_MODE.Place ? preview : mode === INPUT_MODE.Break ? chosen : null;
    if (fence === null || !canAct || issue !== null) return null;
    const kind = mode === INPUT_MODE.Place ? "fence" : "break";
    return legalMoves.find((move) => move.kind === kind && sameFence(move, fence)) ?? null;
  }

  function change(next: Partial<Attempt>): void {
    // Something new is being tried: why another mode was refused is old news.
    const tried = "preview" in next || "chosen" in next;
    setAttempt({ ...current, ...(tried ? { refused: null } : {}), ...next });
  }

  function chooseMode(wanted: InputMode): boolean {
    // Back to moving is always possible: it drops what was being tried, and nothing is sent.
    const leaving = wanted === INPUT_MODE.Move && mode !== INPUT_MODE.Move && !sending;
    if (!leaving && modeBlock(wanted) !== null) {
      change({ refused: wanted });
      return false;
    }
    change({ mode: wanted, preview: null, chosen: null, refused: null });
    return true;
  }

  /** The button or Enter. Whether a move went out. */
  function confirm(): boolean {
    const move = moveToConfirm();
    if (move === null) return false;
    change({ sent: true });
    onMove(move);
    return true;
  }

  function cancel(): void {
    change({ preview: null, chosen: null });
  }

  function rotate(): void {
    if (!canAct) return;
    const fence = preview ?? (mode === INPUT_MODE.Place ? keyboardStart() : null);
    if (fence !== null) change({ preview: turnedFence(fence) });
  }

  /** Where the keyboard's first fence appears: by the pawn of the player to move. */
  function keyboardStart(): Fence {
    const pawn = state.pawns[mover] ?? { row: 0, col: 0 };
    return {
      row: Math.min(pawn.row, state.rows - 2),
      col: Math.min(pawn.col, state.columns - 2),
      dir: "h",
    };
  }

  function arrow(screen: Direction): void {
    const direction = boardDirection(geometry, screen);
    if (mode === INPUT_MODE.Place) {
      change({
        preview: preview === null ? keyboardStart() : shiftFence(state, preview, direction),
      });
    } else if (mode === INPUT_MODE.Break) {
      if (chosen === null) {
        const pawn = state.pawns[mover] ?? { row: 0, col: 0 };
        change({
          chosen: nearestExistingFence(state.fences, { a: pawn.col + 0.5, b: pawn.row + 0.5 }),
        });
      } else {
        change({ chosen: fenceInDirection(state.fences, chosen, direction) ?? chosen });
      }
    }
  }

  /** The next or the previous of all the fences: every one is reached, whatever their places. */
  function cycleFence(step: 1 | -1): void {
    if (mode === INPUT_MODE.Break) change({ chosen: fenceInOrder(state.fences, chosen, step) });
  }

  // ── A finger or a mouse on the layer over the board. ──
  const press = useRef<Press | null>(null);
  const [dragging, setDragging] = useState(false);

  const pointOf = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const box = frame.current?.getBoundingClientRect();
      const scale = box === undefined || box.width === 0 ? 1 : box.width / boardWidth(geometry);
      const x = (event.clientX - (box?.left ?? 0)) / scale;
      const y = (event.clientY - (box?.top ?? 0)) / scale;
      return { x, y, point: fromScreen(geometry, { x, y }) };
    },
    [frame, geometry],
  );

  function onPointerDown(event: PointerEvent<HTMLElement>): void {
    // A second finger is the browser's: pinch to zoom.
    if (!event.isPrimary || event.button !== 0 || !canAct) return;
    if (mode !== INPUT_MODE.Place && mode !== INPUT_MODE.Break) return;
    const { x, y, point } = pointOf(event);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer knows: the move and the lift still come, or nothing does.
    }
    if (mode === INPUT_MODE.Place) {
      const near = preview !== null && isNearFence(preview, point);
      press.current = {
        id: event.pointerId,
        x,
        y,
        point,
        grabbed: near,
        fenceAtPress: preview,
        chosenAtPress: null,
        fresh: !near,
        moved: false,
      };
      if (!near) change({ preview: nearestFence(state, point, preview?.dir ?? null) });
      return;
    }
    press.current = {
      id: event.pointerId,
      x,
      y,
      point,
      grabbed: false,
      fenceAtPress: null,
      chosenAtPress: chosen,
      fresh: true,
      moved: false,
    };
    change({ chosen: nearestExistingFence(state.fences, point) });
  }

  function onPointerMove(event: PointerEvent<HTMLElement>): void {
    const down = press.current;
    if (down?.id !== event.pointerId) return;
    // The button was let go somewhere the lift never reached this layer.
    if (event.buttons === 0) {
      press.current = null;
      setDragging(false);
      return;
    }
    // On its way to the server, or the connection lost: the fence stays where it is.
    if (!canAct) return;
    const { x, y, point } = pointOf(event);
    if (!down.moved && Math.hypot(x - down.x, y - down.y) < DRAG_SLOP_PX) return;
    if (!down.moved) {
      down.moved = true;
      setDragging(true);
    }
    if (mode === INPUT_MODE.Place && preview !== null) {
      const start = down.fenceAtPress;
      const target =
        down.grabbed && start !== null
          ? {
              a: start.col + 1 + (point.a - down.point.a),
              b: start.row + 1 + (point.b - down.point.b),
            }
          : point;
      const next = nearestFence(state, target, preview.dir, preview);
      if (!sameFence(next, preview)) change({ preview: next });
    } else if (mode === INPUT_MODE.Break) {
      const next = nearestExistingFence(state.fences, point);
      const same = next !== null && chosen !== null && sameFence(next, chosen);
      if (!same) change({ chosen: next });
    }
  }

  function onPointerUp(event: PointerEvent<HTMLElement>): void {
    const down = press.current;
    if (down?.id !== event.pointerId) return;
    press.current = null;
    setDragging(false);
    // The fence has gone, or may not change now: lifting does nothing to it.
    if (!canAct) return;
    const start = down.fenceAtPress;
    if (mode !== INPUT_MODE.Place || down.moved || down.fresh || start === null) return;
    // Lifted where it was pressed, on or near the fence being tried.
    const { point } = pointOf(event);
    const here = nearestFence(state, point, start.dir);
    change({
      preview: here.row === start.row && here.col === start.col ? turnedFence(start) : here,
    });
  }

  function onPointerCancel(event: PointerEvent<HTMLElement>): void {
    const down = press.current;
    if (down?.id !== event.pointerId) return;
    // The browser took over (two fingers): the fence goes back to where it was.
    press.current = null;
    setDragging(false);
    if (!canAct) return;
    if (mode === INPUT_MODE.Place) change({ preview: down.fenceAtPress });
    else if (mode === INPUT_MODE.Break) change({ chosen: down.chosenAtPress });
  }

  // A new position, the end of the game or leaving the mode take the fence away, and the layer the
  // finger is on: it no longer means anything.
  const pressedOn = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const down = press.current;
    if (down === null) return;
    press.current = null;
    setDragging(false);
    try {
      pressedOn.current?.releasePointerCapture(down.id);
    } catch {
      // Already gone with its layer, or with the pointer.
    }
  }, [position, mode]);

  return {
    mode,
    preview,
    chosen,
    refused,
    sending,
    canAct,
    issue,
    dragging,
    modeBlock,
    canConfirm: moveToConfirm() !== null,
    chooseMode,
    confirm,
    cancel,
    rotate,
    arrow,
    cycleFence,
    overlayEvents: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        pressedOn.current = event.currentTarget;
        onPointerDown(event);
      },
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      // Taken away without a lift or a cancel; after a lift, nothing is left to do.
      onLostPointerCapture: onPointerCancel,
    },
  };
}
