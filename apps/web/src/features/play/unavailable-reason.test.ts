import { describe, expect, it } from "vitest";

import { unavailableReasons } from "./unavailable-reason";

/** A game against the AI (seat 1), the player (seat 0) to move, nothing to undo nor redo. */
const BASE = {
  canUndo: false,
  canRedo: false,
  moveCount: 0,
  lastEntry: null,
  result: null,
  seats: [{ kind: "human" }, { kind: "ai", level: "medium" }],
  currentPlayer: 0,
  inProgress: false,
} as const;

describe("unavailableReasons", () => {
  it("says nothing of a button that can be pressed", () => {
    expect(unavailableReasons({ ...BASE, canUndo: true, canRedo: true, moveCount: 2 })).toEqual({
      undo: null,
      redo: null,
    });
  });

  it("gives no move at all first, and nothing to redo", () => {
    expect(unavailableReasons(BASE)).toEqual({ undo: "noMoves", redo: "noRedo" });
  });

  it("gives the AI thinking, for both buttons, while the AI is to move", () => {
    expect(
      unavailableReasons({ ...BASE, currentPlayer: 1, moveCount: 1, lastEntry: { move: 4 } }),
    ).toEqual({ undo: "thinking", redo: "thinking" });
  });

  it("gives the roll when the move in effect is a random outcome", () => {
    expect(
      unavailableReasons({ ...BASE, moveCount: 1, lastEntry: { move: "roll", outcome: 4 } }),
    ).toEqual({ undo: "roll", redo: "noRedo" });
  });

  it("gives the roll once the AI rolled and moved after the player (Cờ cá ngựa with the AI)", () => {
    // The AI's horse move is the move in effect; undo stops at its roll, before the player's move.
    expect(
      unavailableReasons({
        ...BASE,
        moveCount: 4,
        lastEntry: { move: { type: "move", horse: 0 } },
        inProgress: true,
      }),
    ).toEqual({ undo: "roll", redo: "noRedo" });
  });

  it("gives no move of yours once only the AI has moved", () => {
    expect(unavailableReasons({ ...BASE, moveCount: 1, lastEntry: { move: 0 } })).toEqual({
      undo: "noOwnMoves",
      redo: "noRedo",
    });
  });

  it("is not thinking once the game is over", () => {
    expect(
      unavailableReasons({
        ...BASE,
        currentPlayer: 1,
        moveCount: 5,
        lastEntry: { move: 2 },
        result: { kind: "win", winners: [0] },
        canUndo: true,
      }),
    ).toEqual({ undo: null, redo: "noRedo" });
  });
});
