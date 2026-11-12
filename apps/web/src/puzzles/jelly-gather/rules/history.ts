import { isSolved, step } from "./step";
import { type Board, type Direction, DIRECTIONS, type Level, type StepResult } from "./types";

// A go at a level is the level and a string of what the player did (design §4): `U D L R` a move,
// `*` "Chơi lại màn". The board after each of them is kept on a linked stack alongside, so a move
// and an undo cost the same however long the go has been.

export const RESTART = "*";

/** Beyond this many characters, the oldest restart and all before it may be forgotten. */
export const MAX_HISTORY = 20_000;

/** What is always kept: the spec's "at least 10 000" undos. */
export const KEPT_HISTORY = 10_000;

export interface Frame {
  readonly board: Board;
  /** Moves since the last restart. */
  readonly steps: number;
}

interface FrameNode {
  readonly frame: Frame;
  readonly previous: FrameNode | null;
}

export interface Attempt {
  readonly level: Level;
  readonly history: string;
  /** The state after the whole history; below it, the state before its last character, and on. */
  readonly top: FrameNode;
}

export function startAttempt(level: Level): Attempt {
  return { level, history: "", top: { frame: { board: level.start, steps: 0 }, previous: null } };
}

export const currentFrame = (attempt: Attempt): Frame => attempt.top.frame;

export const canUndo = (attempt: Attempt) => attempt.history.length > 0;

/** The stack's frames from the bottom, `count` of them from the top. */
function topFrames(top: FrameNode, count: number): Frame[] {
  const frames: Frame[] = [];
  for (
    let node: FrameNode | null = top;
    node !== null && frames.length < count;
    node = node.previous
  ) {
    frames.push(node.frame);
  }
  return frames.reverse();
}

function push(attempt: Attempt, character: string, frame: Frame): Attempt {
  const history = attempt.history + character;
  const top = { frame, previous: attempt.top };
  if (history.length <= MAX_HISTORY) return { ...attempt, history, top };
  const restart = history.indexOf(RESTART);
  // No restart to forget, or one so late that too little would be left: everything is kept (a go
  // is never cut short, so it always comes back whole after a reload).
  if (restart === -1 || history.length - restart - 1 < KEPT_HISTORY) {
    return { ...attempt, history, top };
  }
  // Forget up to the first restart: the state right after it, the level's start, is the new bottom.
  const kept = history.slice(restart + 1);
  let rebuilt: FrameNode | null = null;
  for (const keptFrame of topFrames(top, kept.length + 1)) {
    rebuilt = { frame: keptFrame, previous: rebuilt };
  }
  return { ...attempt, history: kept, top: rebuilt ?? top };
}

/** One move; a blocked one leaves the attempt as it was (the same object). */
export function playMove(
  attempt: Attempt,
  direction: Direction,
): { readonly attempt: Attempt; readonly result: StepResult } {
  const { board, steps } = currentFrame(attempt);
  const result = step(attempt.level, board, direction);
  if (!result.ok) return { attempt, result };
  return { attempt: push(attempt, direction, { board: result.board, steps: steps + 1 }), result };
}

/** Takes back the last move or restart; with nothing to take back, the same object. */
export function undo(attempt: Attempt): Attempt {
  if (!canUndo(attempt) || attempt.top.previous === null) return attempt;
  return { ...attempt, history: attempt.history.slice(0, -1), top: attempt.top.previous };
}

/** Back to the level's start, itself undoable; at the start already, the same object. */
export function restart(attempt: Attempt): Attempt {
  if (currentFrame(attempt).steps === 0) return attempt;
  return push(attempt, RESTART, { board: attempt.level.start, steps: 0 });
}

const DIRECTION_SET: ReadonlySet<string> = new Set(DIRECTIONS);

/**
 * The attempt a saved history makes, or `null` when it is not one a player could have made: an
 * unknown character, a blocked move, a move after the level was solved without a restart, or a
 * restart with nothing to restart. Any length a go can reach replays.
 */
export function replay(level: Level, history: string): Attempt | null {
  let attempt = startAttempt(level);
  for (const character of history) {
    if (character === RESTART) {
      const next = restart(attempt);
      if (next === attempt) return null;
      attempt = next;
      continue;
    }
    if (!DIRECTION_SET.has(character)) return null;
    const next = playMove(attempt, character as Direction);
    if (!next.result.ok) return null;
    attempt = next.attempt;
  }
  return attempt;
}

export const isAttemptSolved = (attempt: Attempt) => isSolved(currentFrame(attempt).board);
