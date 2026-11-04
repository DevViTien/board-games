"use client";

import { ABANDON_AFTER_MS } from "@board-games/protocol";
import { useEffect, useState } from "react";

/** From this long, the player waiting sees how long the turn has lasted. */
const ABANDON_HINT_AFTER_MS = 60_000;
/** From this long, the player to move is told the others may soon claim the turn. */
const ABANDON_WARN_AFTER_MS = 4 * 60_000;

/** How often the clock is read: often enough that a threshold shows within a second. */
const CHECK_EVERY_MS = 1000;

/** How far a turn has run: under a minute, from 1, from 4, from 5 minutes. */
export const TURN_LEVEL = {
  None: "none",
  Hint: "hint",
  Warn: "warn",
  Claimable: "claimable",
} as const;

export type TurnLevel = (typeof TURN_LEVEL)[keyof typeof TURN_LEVEL];

function turnLevelAt(elapsedMs: number): TurnLevel {
  if (elapsedMs >= ABANDON_AFTER_MS) return TURN_LEVEL.Claimable;
  if (elapsedMs >= ABANDON_WARN_AFTER_MS) return TURN_LEVEL.Warn;
  if (elapsedMs >= ABANDON_HINT_AFTER_MS) return TURN_LEVEL.Hint;
  return TURN_LEVEL.None;
}

/**
 * How far the turn that began at `startedAt` (this device's `Date.now()`) has run, or `none`
 * without one. Worked out at once when `startedAt` changes (never `none` for a render in between,
 * which would make the turn line and the claim button flicker), then changes only when a threshold
 * is crossed, so the play screen renders, and its turn line speaks, once per threshold, never every
 * second. The clock is read every second rather than timed to the next threshold, so a clock that
 * jumps (a phone waking up, a test setting the time) is caught up at once; once the turn can be
 * claimed, no threshold is left and the reading stops.
 */
export function useTurnThresholds(startedAt: number | null): TurnLevel {
  const [seen, setSeen] = useState<{
    readonly startedAt: number | null;
    readonly level: TurnLevel;
  }>(() => ({ startedAt, level: levelOf(startedAt) }));
  // Adjusted during render: a new start is measured before anything shows it.
  let current = seen;
  if (seen.startedAt !== startedAt) {
    current = { startedAt, level: levelOf(startedAt) };
    setSeen(current);
  }
  const { level } = current;

  useEffect(() => {
    if (startedAt === null || level === TURN_LEVEL.Claimable) return;
    const timer = setInterval(() => {
      const next = turnLevelAt(Date.now() - startedAt);
      setSeen((previous) =>
        previous.startedAt === startedAt && previous.level !== next
          ? { startedAt, level: next }
          : previous,
      );
    }, CHECK_EVERY_MS);
    return () => {
      clearInterval(timer);
    };
  }, [startedAt, level]);

  return level;
}

function levelOf(startedAt: number | null): TurnLevel {
  return startedAt === null ? TURN_LEVEL.None : turnLevelAt(Date.now() - startedAt);
}
