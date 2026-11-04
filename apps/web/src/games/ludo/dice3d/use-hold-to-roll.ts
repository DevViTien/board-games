"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// The gesture of the roll button (design of redesign-ludo-play §4), without three.js: press and
// hold to shake the die, let go to throw it, Esc (and every other way a hold can end without a
// throw) to cancel. A throw is sent only when let go. From then on until the throw ends, every
// input of the button is ignored: the click a browser makes after a release, the click of a
// released Space, a repeated Enter, a tap on the overlay.

export const THROW_PHASE = {
  /** Nothing showing: the button may be pressed. */
  Idle: "idle",
  /** Held: the die shakes in the hand. */
  Hold: "hold",
  /** Let go and sent: the die lifts off and waits for the number. */
  Await: "await",
  /** The number is in: the die flies to it. */
  Fly: "fly",
  /** At rest: the number shows, then the overlay goes. */
  Rest: "rest",
} as const;

export type ThrowPhase = (typeof THROW_PHASE)[keyof typeof THROW_PHASE];

/** A hold reaches its full strength after this long. */
const FULL_POWER_MS = 1500;

/** The strength of a throw held for `ms`: 0 for a tap, 1 from `FULL_POWER_MS` on. */
export function powerOf(ms: number): number {
  return Math.max(0, Math.min(1, ms / FULL_POWER_MS));
}

interface HoldToRollOptions {
  /** The button may be pressed now: a person here is to roll, the board is not locked. */
  readonly canRoll: boolean;
  /** Moves played so far: a hold ends when the game moves on. */
  readonly ply: number;
  /** A 3D throw can be shown now; otherwise a press simply rolls (the 2D die). */
  readonly threeD: boolean;
  /** A hold began: the overlay opens, the die shakes. */
  readonly onHold: () => void;
  /**
   * Let go (or a quick throw): send the roll now. `power` is 0–1; `byKeyboard` whether it came
   * from the keyboard (or a screen reader), for where the focus goes after it.
   */
  readonly onThrow: (power: number, byKeyboard: boolean) => void;
  /** A hold ended without a throw: nothing was sent. */
  readonly onCancel: () => void;
  /** A press without the 3D die: roll at once. */
  readonly onRoll: (byKeyboard: boolean) => void;
}

export interface HoldToRoll {
  readonly phase: ThrowPhase;
  /** When the hold began (`performance.now()`), for the power ring; `null` when not holding. */
  readonly holdStartedAt: number | null;
  /** Moves the throw on (`fly`, `rest`), or ends it (`idle`). */
  readonly advance: (phase: ThrowPhase) => void;
  /** For the roll button. */
  readonly buttonProps: {
    readonly onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
    readonly onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
    readonly onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
    readonly onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => void;
    readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
    readonly onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => void;
    readonly onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    readonly onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
  };
}

/** The roll button's gesture and the phases of a throw. */
export function useHoldToRoll(options: HoldToRollOptions): HoldToRoll {
  const [phase, setPhaseState] = useState<ThrowPhase>(THROW_PHASE.Idle);
  const [holdStartedAt, setHoldStartedAt] = useState<number | null>(null);
  // Read by the handlers at once, before React renders again.
  const phaseRef = useRef<ThrowPhase>(THROW_PHASE.Idle);
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  /** The hold: its pointer (`null`: Space), when it began, and the button held. */
  const hold = useRef<{
    pointerId: number | null;
    startedAt: number;
    button: HTMLElement | null;
  } | null>(null);
  /**
   * The click a browser sends after a pointer press the gesture handled (also one that was
   * cancelled: Esc, then letting go). Only a click from a pointer (`detail > 0`) is swallowed: a
   * press of the keyboard or a screen reader is never lost to a hold that ended without its click
   * (a pointer cancelled by the browser, an Android long press). The next press resets it.
   */
  const swallowClick = useRef(false);

  const setPhase = useCallback((next: ThrowPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
    if (next !== THROW_PHASE.Hold) setHoldStartedAt(null);
  }, []);

  const startHold = useCallback(
    (pointerId: number | null, button: HTMLElement | null) => {
      const startedAt = performance.now();
      hold.current = { pointerId, startedAt, button };
      setPhase(THROW_PHASE.Hold);
      setHoldStartedAt(startedAt);
      latest.current.onHold();
    },
    [setPhase],
  );

  const cancel = useCallback(() => {
    if (phaseRef.current !== THROW_PHASE.Hold) return;
    hold.current = null;
    setPhase(THROW_PHASE.Idle);
    latest.current.onCancel();
  }, [setPhase]);

  const release = useCallback(
    (byKeyboard: boolean) => {
      const held = hold.current;
      if (phaseRef.current !== THROW_PHASE.Hold || held === null) return;
      hold.current = null;
      // Checked again: the turn may have gone while the button was held.
      if (!latest.current.canRoll) {
        setPhase(THROW_PHASE.Idle);
        latest.current.onCancel();
        return;
      }
      setPhase(THROW_PHASE.Await);
      latest.current.onThrow(powerOf(performance.now() - held.startedAt), byKeyboard);
    },
    [setPhase],
  );

  // A hold ends without a throw once the player may no longer roll (the connection lost, a resign,
  // the game over), or the game moved on.
  const { canRoll, ply } = options;
  useEffect(() => {
    cancel();
  }, [canRoll, ply, cancel]);

  // Esc, the page hidden, the window left: no throw. Esc on the document: Safari does not focus a
  // button pressed with the pointer.
  const holding = phase === THROW_PHASE.Hold;
  useEffect(() => {
    if (!holding) return undefined;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") cancel();
    };
    // The end of the hold wherever it happens: a pointer let go off the button (its capture
    // lost or refused), Space let go once the focus is elsewhere.
    const onPointerUp = (event: globalThis.PointerEvent) => {
      if (hold.current?.pointerId === event.pointerId) release(false);
    };
    const onPointerCancel = (event: globalThis.PointerEvent) => {
      if (hold.current?.pointerId === event.pointerId) cancel();
    };
    const onKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.key !== " " || hold.current?.pointerId !== null) return;
      event.preventDefault();
      release(true);
    };
    // A hold of Space whose button loses the focus (Tab, a script) ends without a throw.
    const button = hold.current?.button ?? null;
    const onFocusOut = () => {
      if (hold.current?.pointerId === null) cancel();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("visibilitychange", onVisibility);
    button?.addEventListener("focusout", onFocusOut);
    window.addEventListener("blur", cancel);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      document.removeEventListener("visibilitychange", onVisibility);
      button?.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("blur", cancel);
    };
  }, [holding, cancel, release]);

  /** A throw without a hold (Enter, a click from a screen reader): the weakest. */
  const quickThrow = useCallback(
    (byKeyboard: boolean, button: HTMLElement) => {
      startHold(null, button);
      release(byKeyboard);
    },
    [startHold, release],
  );

  const buttonProps: HoldToRoll["buttonProps"] = {
    onPointerDown: (event) => {
      swallowClick.current = false;
      if (!event.isPrimary || event.button !== 0) return;
      if (phaseRef.current !== THROW_PHASE.Idle) return;
      const { canRoll: may, threeD } = latest.current;
      // Without the 3D die, the click that follows rolls.
      if (!may || !threeD) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // A pointer already gone: the hold still ends with its pointerup or pointercancel.
      }
      swallowClick.current = true;
      startHold(event.pointerId, event.currentTarget);
    },
    onPointerUp: (event) => {
      if (hold.current?.pointerId !== event.pointerId) return;
      release(false);
    },
    onPointerCancel: (event) => {
      if (hold.current?.pointerId === event.pointerId) cancel();
    },
    onLostPointerCapture: (event) => {
      // After a pointerup the throw is on its way: nothing to cancel then.
      if (hold.current?.pointerId === event.pointerId) cancel();
    },
    onKeyDown: (event) => {
      if (event.key === "Enter" && event.repeat) {
        // A held Enter clicks again and again: only the first counts.
        event.preventDefault();
        return;
      }
      if (event.key !== " ") return;
      const { canRoll: may, threeD } = latest.current;
      if (phaseRef.current !== THROW_PHASE.Idle) {
        // Held already, or throwing: no click when Space comes up.
        event.preventDefault();
        return;
      }
      if (!may || !threeD) return;
      event.preventDefault();
      startHold(null, event.currentTarget);
    },
    onKeyUp: (event) => {
      if (event.key !== " ") return;
      if (phaseRef.current === THROW_PHASE.Idle) return;
      // No click from the released Space: it was the throw.
      event.preventDefault();
      if (hold.current?.pointerId === null) release(true);
    },
    onClick: (event) => {
      if (swallowClick.current) {
        swallowClick.current = false;
        if (event.detail > 0) return;
      }
      if (phaseRef.current !== THROW_PHASE.Idle) return;
      const { canRoll: may, threeD } = latest.current;
      if (!may) return;
      // A click with no pointer behind it: the keyboard or a screen reader.
      const byKeyboard = event.detail === 0;
      if (threeD) quickThrow(byKeyboard, event.currentTarget);
      else latest.current.onRoll(byKeyboard);
    },
    onContextMenu: (event) => {
      // A long press on a phone would open a menu (or iOS's callout) instead of throwing.
      event.preventDefault();
    },
  };

  return { phase, holdStartedAt, advance: setPhase, buttonProps };
}
