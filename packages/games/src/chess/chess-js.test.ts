import { playRandomGame } from "@board-games/engine/testing";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { type ChessPosition, legalPieceMoves, positionOf } from "./chess-js";
import { chess, type ChessState } from "./rules";
import { PERFT_POSITIONS } from "./test-positions";

function adapterUci(fen: string): string[] {
  return legalPieceMoves(positionOf(fen)).map(
    ({ from, to, promotion }) => `${from}${to}${promotion ?? ""}`,
  );
}

/** The same moves through the public API of `chess.js`. */
function publicUci(fen: string): string[] {
  return new Chess(fen)
    .moves({ verbose: true })
    .map(({ from, to, promotion }) => `${from}${to}${promotion ?? ""}`);
}

function sorted(moves: readonly string[]): string[] {
  return [...moves].sort();
}

/** The perft positions and every position one move after them. */
function perftFens(): string[] {
  return PERFT_POSITIONS.flatMap(({ fen }) => [
    fen,
    ...new Chess(fen).moves({ verbose: true }).map((move) => move.after),
  ]);
}

/** Every position of one random game. */
function randomGameFens(): string[] {
  const fens: string[] = [];
  playRandomGame(chess, {
    seed: 1,
    playerCount: 2,
    maxPlies: 10_000,
    onState: (state: ChessState) => fens.push(state.fen),
  });
  return fens;
}

describe("chess.js adapter", () => {
  it("lists the same moves as the public API in the perft positions and one move after them", () => {
    for (const fen of perftFens()) {
      const moves = adapterUci(fen);
      expect(new Set(moves).size, fen).toBe(moves.length);
      expect(sorted(moves), fen).toEqual(sorted(publicUci(fen)));
    }
  });

  it("lists the same moves as the public API in every position of a random game", () => {
    const fens = randomGameFens();
    expect(fens.length).toBeGreaterThan(300);
    for (const fen of fens) expect(sorted(adapterUci(fen)), fen).toEqual(sorted(publicUci(fen)));
    // About 400 positions through the slow public API: ~0.6 s alone.
  }, 10_000);

  it("lists the four promotions of a pawn in the order q, r, b, n", () => {
    // Black king a8 away from e8; e7 promotes by moving or by taking the rook on d8.
    const moves = adapterUci("k2r4/4P3/8/8/8/8/8/4K3 w - - 0 1").filter((uci) =>
      uci.startsWith("e7"),
    );

    expect(moves).toEqual(["e7e8q", "e7e8r", "e7e8b", "e7e8n", "e7d8q", "e7d8r", "e7d8b", "e7d8n"]);
  });

  it("gives a move without promotion no promotion key", () => {
    const moves = legalPieceMoves(
      positionOf("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
    );

    expect(moves).toHaveLength(20);
    for (const move of moves) expect(Object.keys(move)).toEqual(["from", "to"]);
  });

  it.each([
    ["has no _moves method", {}, /no _moves method/],
    ["returns something else than an array", { _moves: () => "e2e4" }, /did not return an array/],
    ["returns a move that is not an object", { _moves: () => [null] }, /not an object/],
    [
      "returns a square off the board",
      { _moves: () => [{ from: 8, to: 0 }] },
      /"from" is not a 0x88 square: 8/,
    ],
    [
      "returns a square that is not a number",
      { _moves: () => [{ from: 100, to: "e4" }] },
      /"to" is not a 0x88 square/,
    ],
    [
      "returns an unknown promotion piece",
      { _moves: () => [{ from: 20, to: 4, promotion: "k" }] },
      /unknown promotion piece/,
    ],
  ])("fails with a clear message when the library %s", (_what, internals, message) => {
    const position = internals as unknown as ChessPosition;

    expect(() => legalPieceMoves(position)).toThrow(message);
    expect(() => legalPieceMoves(position)).toThrow(/chess\.js 1\.4\.0/);
  });
});
