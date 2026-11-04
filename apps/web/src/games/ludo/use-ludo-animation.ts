"use client";

import type { PlayerIndex } from "@board-games/engine";
import { IN_STABLE, type LudoEvent } from "@board-games/games/ludo";
import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

// The board's animations (design §8): the die tumbling, a horse walking square by square, a kicked
// horse fading into its stable. Each fits within the AI's pacing delays (`transport/ai-timing.ts`,
// checked by the tests), so the AI never moves before an animation ends; a newer update ends the
// running one at once. They never lock the board: whether a move may be made is the transport's.

/** The die tumbles this long (CSS `--animate-dice-roll`), changing face every frame. */
export const LUDO_DICE_MS = 450;
const DICE_FRAMES = 6;

/** A walking horse takes this long per square shown. */
export const LUDO_WALK_STEP_MS = 50;
/** At most this many squares are shown: a longer walk (a jump of 14) skips some. */
const LUDO_WALK_MAX_STEPS = 8;
/** The longest walk. */
export const LUDO_WALK_MAX_MS = LUDO_WALK_STEP_MS * LUDO_WALK_MAX_STEPS;
/** A kicked horse fades into its stable this long (CSS `--animate-piece-kicked`), during the walk. */
export const LUDO_KICK_MS = 300;

/** The progress values a walk from `from` to `to` shows, ending on `to`, at most 8. */
export function walkPath(from: number, to: number): readonly number[] {
  if (from === IN_STABLE) return [to];
  const all = Array.from({ length: Math.max(to - from, 1) }, (_unused, index) => from + 1 + index);
  if (all.length <= LUDO_WALK_MAX_STEPS) return all;
  return Array.from(
    { length: LUDO_WALK_MAX_STEPS },
    (_unused, index) => all[Math.round(((index + 1) * all.length) / LUDO_WALK_MAX_STEPS) - 1] ?? to,
  );
}

export interface LudoAnimation {
  /** The face the tumbling die shows, or `null` once it rests (show the real one). */
  readonly rollingFace: number | null;
  /** The walking horse and the progress it is drawn at, or `null`. */
  readonly walking: {
    readonly player: PlayerIndex;
    readonly horse: number;
    readonly progress: number;
  } | null;
  /** The horse just kicked, fading into its stable, or `null`. */
  readonly kicked: { readonly player: PlayerIndex; readonly horse: number } | null;
}

const STILL: LudoAnimation = { rollingFace: null, walking: null, kicked: null };

interface Running {
  readonly key: string;
  readonly event: LudoEvent;
  readonly frame: number;
}

/** Frames of an event's animation and how long each lasts. */
function framesOf(event: LudoEvent): { readonly count: number; readonly ms: number } {
  if (event.kind === "roll") return { count: DICE_FRAMES, ms: LUDO_DICE_MS / DICE_FRAMES };
  const walk = walkPath(event.from, event.to).length;
  const kick = event.kicked === null ? 0 : Math.ceil(LUDO_KICK_MS / LUDO_WALK_STEP_MS);
  return { count: Math.max(walk, kick), ms: LUDO_WALK_STEP_MS };
}

function frameOf({ event, frame }: Running): LudoAnimation {
  if (event.kind === "roll") {
    // Cycles through the faces, one per frame, ending on the one rolled.
    return { rollingFace: ((event.face + frame) % 6) + 1, walking: null, kicked: null };
  }
  const path = walkPath(event.from, event.to);
  const progress = path[frame];
  return {
    rollingFace: null,
    walking: progress === undefined ? null : { player: event.player, horse: event.horse, progress },
    kicked:
      event.kicked === null ? null : { player: event.kicked.player, horse: event.kicked.horse },
  };
}

/**
 * The animation of the move just played (`state.last`, the `ply`-th move of the game), frame by
 * frame. Only a newer move is animated: the move a board opens on (a reload) is not, nor a return to
 * an older one (undo), which ends any animation at once; with reduced motion, nothing is. Nor is
 * the move `still`: a roll the 3D die has just shown.
 */
export function useLudoAnimation(
  last: LudoEvent | null,
  ply: number,
  still: number | null = null,
): LudoAnimation {
  const reduced = usePrefersReducedMotion();
  // By the number of moves, not the state object: online, the state is rebuilt on every update of
  // the room, and two alike moves in a row still count as two.
  const key = String(ply);
  const [seen, setSeen] = useState(ply);
  const [running, setRunning] = useState<Running | null>(null);

  // Adjusted during render, so the first frame of a new move is drawn with the move itself.
  if (ply !== seen) {
    setSeen(ply);
    setRunning(
      ply < seen || last === null || reduced || ply === still
        ? null
        : { key, event: last, frame: 0 },
    );
  }
  if (reduced && running !== null) setRunning(null);

  // Every frame is scheduled when the animation starts, from that moment, so a slow render never
  // stretches it past the AI's delays.
  const runningKey = running?.key ?? null;
  const runningEvent = running?.event ?? null;
  useEffect(() => {
    if (runningKey === null || runningEvent === null) return undefined;
    const { count, ms } = framesOf(runningEvent);
    const timers = Array.from({ length: count }, (_unused, index) =>
      setTimeout(
        () => {
          const frame = index + 1;
          setRunning((current) =>
            current?.key !== runningKey ? current : frame >= count ? null : { ...current, frame },
          );
        },
        ms * (index + 1),
      ),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [runningKey, runningEvent]);

  return running?.key === key ? frameOf(running) : STILL;
}
