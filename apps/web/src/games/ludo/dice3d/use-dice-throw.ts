"use client";

import type { LudoMove, LudoState } from "@board-games/games/ludo";
import { useCallback, useEffect, useRef, useState } from "react";

import { usePresentationHold } from "@/features/play/presentation-hold";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import { useDice3d } from "./load-dice3d";
import type { DiceStage, DieColours, StagePoint } from "./stage-types";
import { type HoldToRoll, THROW_PHASE, type ThrowPhase, useHoldToRoll } from "./use-hold-to-roll";

// A throw of the 3D die by the person at this device, from the press to the overlay going (design
// of redesign-ludo-play §1, §4): the roll is sent when let go, the number comes from the engine or
// the server as for any roll, and the die plays a throw ending on it. Until the throw ends, the board
// shows the game as before the roll and the play screen holds what it shows, so nothing tells the
// number first. Without the 3D die (no WebGL, reduced motion, not loaded, failed) a press simply
// rolls, as before.

/** The overlay is gone at the latest this long after the number is known. */
export const THROW_DEADLINE_MS = 1900;
/** No number this long after letting go (online): the overlay goes, the 2D die shows it later. */
export const THROW_LATE_MS = 3000;
/** The number shows at rest at most this long, at least the shorter one. */
const THROW_READ_MS = 600;
export const THROW_READ_MIN_MS = 300;
/** The overlay fades out this long. */
export const THROW_FADE_MS = 150;

/** What the number means, shown with it at rest. */
export interface ThrowResult {
  readonly face: number;
  /** A 6 no horse can move with: roll again. */
  readonly again: boolean;
  readonly lost: boolean;
}

interface DiceThrowOptions {
  /** The game as the transport has it now. */
  readonly state: LudoState;
  readonly legalMoves: readonly LudoMove[];
  /** The roll button may be pressed now by a person at this device. */
  readonly canRoll: boolean;
  /** The die's colours for the player about to roll, read from the page's tokens. */
  readonly readColours: () => DieColours;
  /** Sends the roll. */
  readonly roll: () => void;
  /** The throw is over and the board shows the game again (`byKeyboard`: where the focus goes). */
  readonly onEnd: (byKeyboard: boolean) => void;
}

export interface DiceThrow {
  readonly phase: ThrowPhase;
  /** A press now throws the 3D die (else the 2D die rolls). */
  readonly threeD: boolean;
  readonly holdStartedAt: number | null;
  readonly buttonProps: HoldToRoll["buttonProps"];
  /** The stage while a throw shows, for the overlay. */
  readonly stage: DiceStage | null;
  /** What the board shows while the throw plays: the game as it was before the roll. */
  readonly frozen: { readonly state: LudoState; readonly legalMoves: readonly LudoMove[] } | null;
  /** The move the 3D die showed: the 2D die does not tumble for it. */
  readonly settledPly: number | null;
  /** The number at rest, and what it means. */
  readonly result: ThrowResult | null;
  /** The face on top of the 3D die at rest, as drawn. */
  readonly topFace: number | null;
  /** Where the 3D die rests on its canvas. */
  readonly restAt: StagePoint | null;
  /** The overlay is fading out. */
  readonly fading: boolean;
}

export function useDiceThrow({
  state,
  legalMoves,
  canRoll,
  readColours,
  roll,
  onEnd,
}: DiceThrowOptions): DiceThrow {
  const reduced = usePrefersReducedMotion();
  // The latest of what the board gives, for the stage and the timers between renders.
  const latestColours = useRef(readColours);
  useEffect(() => {
    latestColours.current = readColours;
  });
  const diceStage = useDice3d(canRoll, () => latestColours.current());
  const presentation = usePresentationHold();
  const [frozen, setFrozen] = useState<DiceThrow["frozen"]>(null);
  const [settledPly, setSettledPly] = useState<number | null>(null);
  const [result, setResult] = useState<ThrowResult | null>(null);
  const [topFace, setTopFace] = useState<number | null>(null);
  const [restAt, setRestAt] = useState<StagePoint | null>(null);
  const [fading, setFading] = useState(false);

  // The throw running: read by timers and the stage's callbacks, between renders.
  const run = useRef<{
    readonly ply: number;
    readonly player: number;
    readonly byKeyboard: boolean;
    numberAt: number | null;
    timers: ReturnType<typeof setTimeout>[];
  } | null>(null);
  const stageRef = useRef<DiceStage | null>(null);
  const latest = useRef({ readColours, roll, onEnd, presentation });
  // Set below, once the gesture's `advance` exists.
  const closeRef = useRef<(settle: boolean) => void>(() => undefined);
  useEffect(() => {
    stageRef.current = diceStage;
    latest.current = { readColours, roll, onEnd, presentation };
  });

  const threeD = diceStage !== null && !reduced;

  const gesture = useHoldToRoll({
    canRoll,
    ply: state.ply,
    threeD,
    onHold: () => {
      diceStage?.hold(latest.current.readColours());
    },
    onCancel: () => {
      diceStage?.stop();
    },
    onRoll: (byKeyboard) => {
      latest.current.roll();
      latest.current.onEnd(byKeyboard);
    },
    onThrow: (power, byKeyboard) => {
      run.current = {
        ply: state.ply,
        player: state.toMove,
        byKeyboard,
        numberAt: null,
        timers: [],
      };
      setFrozen({ state, legalMoves });
      setResult(null);
      setTopFace(null);
      setRestAt(null);
      setFading(false);
      diceStage?.release(power);
      // Before the roll is sent: what the play screen shows is kept as it is now.
      latest.current.presentation.hold();
      latest.current.roll();
      const current = run.current;
      current.timers.push(
        setTimeout(() => {
          if (run.current === current && current.numberAt === null) closeRef.current(false);
        }, THROW_LATE_MS),
      );
    },
  });
  const { advance } = gesture;

  /** Ends the throw: the overlay goes and the board shows the game. */
  const close = useCallback(
    (settle: boolean) => {
      const current = run.current;
      if (current === null) return;
      run.current = null;
      for (const timer of current.timers) clearTimeout(timer);
      stageRef.current?.stop();
      setFrozen(null);
      setResult(null);
      setFading(false);
      // The number shown by the 3D die: the 2D die shows it still.
      if (settle && current.numberAt !== null) setSettledPly(current.ply + 1);
      advance(THROW_PHASE.Idle);
      latest.current.presentation.release();
      latest.current.onEnd(current.byKeyboard);
    },
    [advance],
  );
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  const { phase } = gesture;
  // The move the 3D die showed is consumed once the game moves on from it (another move, a new
  // game, undo): that ply, played again, animates as any other. Adjusted during render.
  if (settledPly !== null && state.ply !== settledPly) setSettledPly(null);
  const { ply, last } = state;
  // The number came, the game moved on another way, or the roll was refused.
  useEffect(() => {
    const current = run.current;
    if (current === null) return;
    if (phase === THROW_PHASE.Await) {
      if (
        ply === current.ply + 1 &&
        last?.kind === "roll" &&
        last.player === current.player &&
        current.numberAt === null
      ) {
        const numberAt = performance.now();
        current.numberAt = numberAt;
        const outcome: ThrowResult = { face: last.face, again: last.again, lost: last.lost };
        const stage = stageRef.current;
        const atRest = () => {
          if (run.current !== current) return;
          advance(THROW_PHASE.Rest);
          setResult(outcome);
          setTopFace(stage?.topFace() ?? null);
          setRestAt(stage?.diePoint() ?? null);
          const left = THROW_DEADLINE_MS - THROW_FADE_MS - (performance.now() - numberAt);
          const read = Math.max(0, Math.min(THROW_READ_MS, left));
          current.timers.push(
            setTimeout(() => {
              if (run.current !== current) return;
              setFading(true);
              current.timers.push(
                setTimeout(() => {
                  close(true);
                }, THROW_FADE_MS),
              );
            }, read),
          );
        };
        const flying =
          stage?.land(
            outcome.face,
            THROW_DEADLINE_MS - THROW_READ_MIN_MS - THROW_FADE_MS,
            atRest,
          ) ?? false;
        if (!flying) {
          // No throw to play: the 2D die shows this number.
          current.numberAt = null;
          close(false);
          return;
        }
        advance(THROW_PHASE.Fly);
        // Gone in time, wherever the die is.
        current.timers.push(
          setTimeout(() => {
            close(true);
          }, THROW_DEADLINE_MS),
        );
        return;
      }
      // Refused (online), or not sent: the player may roll again at once.
      if (ply === current.ply && canRoll) close(false);
      else if (ply !== current.ply) close(false);
      return;
    }
    // The game on screen was replaced (a new game, the room after reconnecting).
    if ((phase === THROW_PHASE.Fly || phase === THROW_PHASE.Rest) && ply !== current.ply + 1) {
      close(false);
    }
  }, [phase, ply, last, canRoll, advance, close]);

  // The stage failed mid-throw: the overlay goes, and the number shows at once.
  useEffect(() => {
    if (diceStage === null && run.current !== null) close(true);
  }, [diceStage, close]);

  // A turned phone or a window resized a lot mid-throw: the throw ends, the number shows.
  const throwing = phase !== THROW_PHASE.Idle && phase !== THROW_PHASE.Hold;
  useEffect(() => {
    if (!throwing) return undefined;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const onResize = () => {
      const turned = width > height !== window.innerWidth > window.innerHeight;
      if (
        turned ||
        Math.abs(window.innerWidth - width) > 120 ||
        Math.abs(window.innerHeight - height) > 120
      ) {
        close(true);
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [throwing, close]);

  // Leaving the board mid-throw: nothing is held any more.
  useEffect(
    () => () => {
      const current = run.current;
      if (current === null) return;
      run.current = null;
      for (const timer of current.timers) clearTimeout(timer);
      latest.current.presentation.release();
    },
    [],
  );

  return {
    phase,
    threeD,
    holdStartedAt: gesture.holdStartedAt,
    buttonProps: gesture.buttonProps,
    stage: diceStage,
    frozen,
    settledPly,
    result,
    topFace,
    restAt,
    fading,
  };
}
