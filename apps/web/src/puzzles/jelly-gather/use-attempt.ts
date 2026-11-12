"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { loadAttempt } from "./progress-store";
import {
  type Attempt,
  canUndo,
  currentFrame,
  type Frame,
  isAttemptSolved,
  playMove,
  restart as restartAttempt,
  undo as undoAttempt,
} from "./rules/history";
import type { Direction, Level, LevelId, StepResult } from "./rules/types";
import { rememberAttempt, rememberSolve, useProgress } from "./use-progress";

export interface UseAttempt {
  /** The go on screen, or `null` until this browser's storage has been read. */
  readonly attempt: Attempt | null;
  readonly solved: boolean;
  readonly canUndo: boolean;
  /** The player's best on this level, if solved before. */
  readonly best: number | undefined;
  /** One move: what happened and the moves since the last restart, or `null` before the go is read. */
  readonly move: (
    direction: Direction,
  ) => { readonly result: StepResult; readonly steps: number } | null;
  /** The state after taking one back, or `null` when there was nothing to take back. */
  readonly undo: () => Frame | null;
  /** Whether the board went back to the start (not when it was there already). */
  readonly restart: () => boolean;
}

/**
 * A go at `level`, read from this browser and written back after every change (design §4). Once
 * the player acts, the go on screen is this tab's own: another tab's later write to the same
 * level does not replace it (the later write wins in storage, as one player plays one tab).
 */
export function useAttempt(level: Level): UseAttempt {
  const progress = useProgress();
  const [own, setOwn] = useState<{ readonly id: LevelId; readonly attempt: Attempt } | null>(null);
  // The latest go, for moves pressed faster than React renders (a held arrow key).
  const latest = useRef<{ readonly id: LevelId; readonly attempt: Attempt } | null>(null);
  const isOwn = own?.id === level.id;
  // Replayed only when the go is not this tab's yet: not again after each of its own writes.
  const stored = isOwn ? null : progress;
  const loaded = useMemo(
    () => (stored === null ? null : loadAttempt(level, stored)),
    [level, stored],
  );
  const attempt = isOwn ? own.attempt : loaded;

  const change = useCallback(
    (apply: (from: Attempt) => Attempt): { from: Attempt; to: Attempt } | null => {
      const from = latest.current?.id === level.id ? latest.current.attempt : attempt;
      if (from === null) return null;
      const to = apply(from);
      if (to !== from) {
        latest.current = { id: level.id, attempt: to };
        setOwn(latest.current);
        rememberAttempt(level, to.history);
      }
      return { from, to };
    },
    [attempt, level],
  );

  const move = useCallback(
    (direction: Direction) => {
      let result: StepResult | null = null;
      const changed = change((from) => {
        const next = playMove(from, direction);
        result = next.result;
        return next.attempt;
      });
      const played = result as StepResult | null;
      if (changed === null || played === null) return null;
      const steps = currentFrame(changed.to).steps;
      if (played.ok && played.outcome.solved) rememberSolve(level, steps);
      return { result: played, steps };
    },
    [change, level],
  );

  const undo = useCallback(() => {
    const changed = change(undoAttempt);
    return changed === null || changed.to === changed.from ? null : currentFrame(changed.to);
  }, [change]);

  const restart = useCallback(() => {
    const changed = change(restartAttempt);
    return changed !== null && changed.to !== changed.from;
  }, [change]);

  return {
    attempt,
    solved: attempt !== null && isAttemptSolved(attempt),
    canUndo: attempt !== null && canUndo(attempt),
    best: progress?.best.get(level.id),
    move,
    undo,
    restart,
  };
}
