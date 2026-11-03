import { currentState, fromRecord, toRecord } from "@board-games/engine";
import { playRandomGame } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { chess, type ChessMove, type ChessState } from "./rules";
import { type ChessSession, playUci } from "./test-positions";

/** Both colours castle king side; en passant (3. exd6), an under-promotion (5. cxb8=N), a claim. */
const GAME = [
  ..."e2e4 g8f6 e4e5 d7d5 e5d6 e7e6 d6c7 d8d7 c7b8n a8b8 g1f3 f8c5 f1c4 e8g8 e1g1".split(" "),
  // The position after 8. O-O comes back twice: Black may claim the threefold repetition.
  ..."g8h8 g1h1 h8g8 h1g1 g8h8 g1h1 h8g8 h1g1".split(" "),
  "claim",
];

function rebuilt(session: ChessSession): ChessSession {
  const record: unknown = JSON.parse(JSON.stringify(toRecord(session)));
  const replayed = fromRecord<ChessState, ChessMove>(chess, record);
  if (!replayed.ok) throw new Error(replayed.error);
  return replayed.value;
}

describe("chess game records", () => {
  it("rebuild a game with castling, en passant, a promotion and a draw claim exactly", () => {
    const session = playUci(GAME);
    const state = currentState(session);
    expect(state.san.join(" ")).toBe(
      "e4 Nf6 e5 d5 exd6 e6 dxc7 Qd7 cxb8=N Rxb8 Nf3 Bc5 Bc4 O-O O-O Kh8 Kh1 Kg8 Kg1 Kh8 Kh1 Kg8 Kg1",
    );
    expect(chess.result(state)).toEqual({ kind: "draw", reason: "threefold-claim" });

    const again = rebuilt(session);
    const replayedState = currentState(again);

    expect(again).toEqual(session);
    expect(replayedState).toEqual(state);
    expect(replayedState.san).toEqual(state.san);
    expect(chess.currentPlayer(replayedState)).toBe(1);
    expect(chess.result(replayedState)).toEqual(chess.result(state));
  });

  it("rebuild a random game of more than 500 half-moves", () => {
    // Seed 39: the longest of seeds 1–40, 616 half-moves (record 20.4 KB, `fromRecord` ~90 ms).
    const game = playRandomGame(chess, { seed: 39, playerCount: 2, maxPlies: 3000 });
    expect(game.session.entries.length).toBeGreaterThan(500);

    const again = rebuilt(game.session);

    expect(currentState(again)).toEqual(currentState(game.session));
    expect(again.entries).toEqual(game.session.entries);
  }, 10_000);
});
