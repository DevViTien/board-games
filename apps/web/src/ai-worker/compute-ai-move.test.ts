import { AI_LEVEL } from "@board-games/engine";
import { tictactoe } from "@board-games/games";
import { describe, expect, it } from "vitest";

import { computeAiMove } from "./compute-ai-move";

const now = () => performance.now();

describe("computeAiMove", () => {
  it.each(Object.values(AI_LEVEL))("chooses a legal Tic-tac-toe move at level %s", (level) => {
    // X in the centre, O in a corner: X to move.
    const state = tictactoe.applyMove(tictactoe.applyMove(tictactoe.setup(), { cell: 4 }), {
      cell: 0,
    });

    const move = computeAiMove(
      { gameId: "tictactoe", state, level, timeLimitMs: 100, seed: 7 },
      now,
    );

    expect(tictactoe.legalMoves(state)).toContainEqual(move);
  });

  it("throws for a game that does not exist", () => {
    expect(() =>
      computeAiMove(
        { gameId: "khong-co-game-nay", state: {}, level: "easy", timeLimitMs: 100, seed: 1 },
        now,
      ),
    ).toThrow('Unknown game "khong-co-game-nay"');
  });

  it("throws when the game is already over", () => {
    let state = tictactoe.setup();
    for (const cell of [0, 3, 1, 4, 2]) state = tictactoe.applyMove(state, { cell });

    expect(() =>
      computeAiMove({ gameId: "tictactoe", state, level: "hard", timeLimitMs: 100, seed: 1 }, now),
    ).toThrow("game-over");
  });
});
