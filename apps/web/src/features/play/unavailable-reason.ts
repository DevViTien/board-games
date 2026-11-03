import type { ReadySnapshot } from "@/transport/types";

/** Why "Undo" or "Redo" cannot be pressed now: a key of `Play.unavailable`. */
const UNAVAILABLE_REASON = {
  Thinking: "thinking",
  NoMoves: "noMoves",
  Roll: "roll",
  NoOwnMoves: "noOwnMoves",
  NoRedo: "noRedo",
} as const;

export type UnavailableReason = (typeof UNAVAILABLE_REASON)[keyof typeof UNAVAILABLE_REASON];

type ReasonSource = Pick<
  ReadySnapshot<unknown, unknown, unknown>,
  | "canUndo"
  | "canRedo"
  | "moveCount"
  | "lastEntry"
  | "result"
  | "seats"
  | "currentPlayer"
  | "inProgress"
>;

/** The AI is choosing its move: no result yet, and the seat to move is an AI's. */
export function isAiThinking({
  result,
  seats,
  currentPlayer,
}: Pick<ReasonSource, "result" | "seats" | "currentPlayer">): boolean {
  return result === null && seats[currentPlayer]?.kind === "ai";
}

/**
 * Why each of "Undo" and "Redo" cannot be pressed, or `null` when it can, read from the transport's
 * snapshot only. Undo: the AI is thinking; no move at all; a random outcome (a roll) stands in the
 * way, where undo stops: the move in effect is one, or a player here has a move in effect (or the
 * game is over) and still nothing can be undone, which only a roll in between explains (the AI
 * rolled and moved after the player); else no move of a player here is left to take back (the AI
 * moved first). Redo: the AI is thinking, or nothing was undone.
 */
export function unavailableReasons(snapshot: ReasonSource): {
  readonly undo: UnavailableReason | null;
  readonly redo: UnavailableReason | null;
} {
  const thinking = isAiThinking(snapshot);
  let undo: UnavailableReason | null = null;
  if (!snapshot.canUndo) {
    if (thinking) undo = UNAVAILABLE_REASON.Thinking;
    else if (snapshot.moveCount === 0) undo = UNAVAILABLE_REASON.NoMoves;
    else if (
      snapshot.lastEntry?.outcome !== undefined ||
      snapshot.inProgress ||
      snapshot.result !== null
    ) {
      undo = UNAVAILABLE_REASON.Roll;
    } else undo = UNAVAILABLE_REASON.NoOwnMoves;
  }
  let redo: UnavailableReason | null = null;
  if (!snapshot.canRedo) redo = thinking ? UNAVAILABLE_REASON.Thinking : UNAVAILABLE_REASON.NoRedo;
  return { undo, redo };
}
