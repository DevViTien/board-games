import {
  createRng,
  createSession,
  currentState,
  parseGameOptions,
  playMove,
} from "@board-games/engine";
import { deepFreeze, playRandomGame } from "@board-games/engine/testing";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { chessBoard, chessSquareAt } from "./board";
import { CHESS_COLOR, CHESS_PIECE } from "./constants";
import { chess, chessKingInCheck, chessPositionKey, type ChessState } from "./rules";
import { chessStateFromFen, legalUci, newGame, playUci, stateAfter, uci } from "./test-positions";

const rng = createRng(1);

/** Two knight trips that bring the position back: 1. Nf3 Nf6 2. Ng1 Ng8. */
const KNIGHT_TRIP = ["g1f3", "g8f6", "f3g1", "f6g8"];
function times(count: number, moves: readonly string[]): string[] {
  return Array.from({ length: count }, () => moves).flat();
}

function pieceOn(state: ChessState, square: string) {
  return chessBoard(state).find((_piece, index) => chessSquareAt(index) === square) ?? null;
}

function castlingOf(state: ChessState): string {
  return state.fen.split(" ")[2] ?? "";
}

function halfMovesOf(state: ChessState): number {
  return Number(state.fen.split(" ")[4]);
}

function movesFrom(state: ChessState, square: string): string[] {
  return legalUci(state).filter((move) => move.startsWith(square));
}

/** Plays a move given as untrusted data and returns the engine's answer. */
function tryMove(state: ChessState, move: unknown) {
  return playMove(chess, newGame(state), move, rng);
}

describe("chess: board and players", () => {
  it("starts with 16 pieces a side in the standard position, White to move with 20 moves", () => {
    const state = currentState(newGame());
    const pieces = chessBoard(state).filter((piece) => piece !== null);

    expect(pieces.filter((piece) => piece.color === CHESS_COLOR.White)).toHaveLength(16);
    expect(pieces.filter((piece) => piece.color === CHESS_COLOR.Black)).toHaveLength(16);
    expect(state.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(chess.currentPlayer(state)).toBe(0);
    expect(chess.legalMoves(state)).toHaveLength(20);
    expect(chess.result(state)).toBeNull();
    expect(state.san).toEqual([]);
    expect(state.drawClaim).toBeNull();
  });

  it("declares two players, the classic category, about 20 minutes and no AI", () => {
    expect(chess.id).toBe("chess");
    expect(chess.meta).toEqual({
      players: { min: 2, max: 2 },
      category: "classic",
      durationMinutes: 20,
      supportsAI: false,
    });
    expect(chess.defaultOptions).toEqual({});
  });

  it("refuses rule options with invalid-options", () => {
    expect(parseGameOptions(chess, { variant: "chess960" })).toEqual({
      ok: false,
      error: "invalid-options",
    });
    expect(
      createSession(chess, {
        playerCount: 2,
        options: { variant: "chess960" },
      }),
    ).toEqual({ ok: false, error: "invalid-options" });
  });

  it("gives seat 0 the white pieces and seat 1 the black ones, in turn", () => {
    expect(chess.currentPlayer(stateAfter(["e2e4"]))).toBe(1);
    expect(chess.currentPlayer(stateAfter(["e2e4", "e7e5"]))).toBe(0);
  });
});

describe("chess: legal moves", () => {
  it("gives a pinned knight no move", () => {
    const state = chessStateFromFen("4r2k/8/8/8/8/8/4N3/4K3 w - - 0 1");

    expect(movesFrom(state, "e2")).toEqual([]);
    expect(legalUci(state).length).toBeGreaterThan(0);
  });

  it("refuses a move a piece cannot make with illegal-move, and the game does not change", () => {
    const session = newGame();

    expect(playMove(chess, session, { from: "e2", to: "e5" }, rng)).toEqual({
      ok: false,
      error: "illegal-move",
    });
    expect(chess.currentPlayer(currentState(session))).toBe(0);
  });

  it.each([
    ["squares split the wrong way", { from: "e2e", to: "4" }],
    ["the promotion glued to the square", { from: "e7e8", to: "q" }],
    ["a draw claim with a square", { type: "claim-draw", from: "e2" }],
    ["an unknown move type", { type: "resign" }],
    ["no square to move to", { from: "e2" }],
    ["no square at all", {}],
    ["a square off the board", { from: "e2", to: "e9" }],
    ["upper-case squares", { from: "E2", to: "E4" }],
    ["a string", "e2e4"],
    ["null", null],
    ["a number", 42],
  ])("refuses %s with illegal-move", (_what, move) => {
    // A position where e7e8q is legal and a draw can be claimed: each malformed move must not pass
    // for one of those.
    const claimable = currentState(
      playUci(
        times(2, ["g1f3", "a8a7", "f3g1", "a7a8"]),
        newGame(chessStateFromFen("k7/4P3/8/8/8/8/8/4K1N1 w - - 0 1")),
      ),
    );
    expect(legalUci(claimable)).toContain("e7e8q");
    expect(legalUci(claimable)).toContain("claim-draw");

    expect(tryMove(claimable, move)).toEqual({ ok: false, error: "illegal-move" });
    expect(tryMove(currentState(newGame()), move)).toEqual({ ok: false, error: "illegal-move" });
  });

  it("keeps its own move object, so unknown fields stay out of the history", () => {
    const played = playMove(chess, newGame(), { from: "e2", to: "e4", note: "hi" }, rng);

    expect(played.ok && played.value.entries).toEqual([{ move: { from: "e2", to: "e4" } }]);
  });

  it("leaves the state it is given untouched", () => {
    const before = deepFreeze(stateAfter(["e2e4", "e7e5"]));
    const copy = structuredClone(before);

    const after = chess.applyMove(before, uci("g1f3"));
    chess.legalMoves(before);
    chess.result(before);

    expect(before).toEqual(copy);
    expect(after).not.toEqual(before);
  });
});

describe("chess: castling", () => {
  const BOTH_SIDES = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";

  it("castles king side: king to g1, rook to f1, and White loses both castling rights", () => {
    const state = stateAfter(["e1g1"], BOTH_SIDES);

    expect(pieceOn(state, "g1")).toEqual({ color: "w", type: "k" });
    expect(pieceOn(state, "f1")).toEqual({ color: "w", type: "r" });
    expect(pieceOn(state, "h1")).toBeNull();
    expect(castlingOf(state)).toBe("kq");
  });

  it("castles queen side: king to c1, rook to d1", () => {
    const state = stateAfter(["e1c1"], BOTH_SIDES);

    expect(pieceOn(state, "c1")).toEqual({ color: "w", type: "k" });
    expect(pieceOn(state, "d1")).toEqual({ color: "w", type: "r" });
    expect(pieceOn(state, "a1")).toBeNull();
  });

  it.each([
    ["through a square the bishop on c4 controls (f1)", "4k3/8/8/8/2b5/8/8/4K2R w K - 0 1", "e1g1"],
    ["onto a square the bishop on c5 controls (g1)", "4k3/8/8/2b5/8/8/8/4K2R w K - 0 1", "e1g1"],
    ["out of check from the rook on e8", "4r1k1/8/8/8/8/8/8/4K2R w K - 0 1", "e1g1"],
    ["with the knight still on b1", "4k3/8/8/8/8/8/8/RN2K3 w Q - 0 1", "e1c1"],
  ])("does not castle %s", (_what, fen, castling) => {
    const state = chessStateFromFen(fen);

    expect(legalUci(state)).not.toContain(castling);
    expect(movesFrom(state, "e1").length).toBeGreaterThan(0);
  });

  it("castles queen side when only b1 is controlled", () => {
    expect(legalUci(chessStateFromFen("1r2k3/8/8/8/8/8/8/R3K3 w Q - 0 1"))).toContain("e1c1");
  });

  it("loses the right on the side of a rook that moved and came back, not on the other", () => {
    const state = stateAfter(["h1h2", "a8b8", "h2h1", "b8a8"], BOTH_SIDES);

    expect(legalUci(state)).not.toContain("e1g1");
    expect(legalUci(state)).toContain("e1c1");
    expect(castlingOf(state)).toBe("Qk");
  });

  it("loses the right on the side of a rook that was taken", () => {
    const state = stateAfter(["b7h1"], "4k3/1b6/8/8/8/8/8/R3K2R b KQ - 0 1");

    expect(castlingOf(state)).toBe("Q");
    expect(legalUci(state)).not.toContain("e1g1");
    expect(legalUci(state)).toContain("e1c1");
  });

  it("loses both rights when the king moves", () => {
    expect(castlingOf(stateAfter(["e1f1"], BOTH_SIDES))).toBe("kq");
  });
});

describe("chess: en passant", () => {
  const DOUBLE_STEP = ["e2e4", "a7a6", "e4e5", "d7d5"];

  it("takes a pawn that just moved two squares, which leaves the board", () => {
    const before = stateAfter(DOUBLE_STEP);
    expect(legalUci(before)).toContain("e5d6");

    const after = chess.applyMove(before, uci("e5d6"));

    expect(pieceOn(after, "d5")).toBeNull();
    expect(pieceOn(after, "d6")).toEqual({ color: "w", type: "p" });
  });

  it("loses the right when the capture is not made at once", () => {
    expect(legalUci(stateAfter([...DOUBLE_STEP, "g1f3", "a6a5"]))).not.toContain("e5d6");
  });

  it("does not take en passant when that exposes the king", () => {
    const state = stateAfter(["d7d5"], "4k3/3p4/8/K3P2r/8/8/8/8 b - - 0 1");

    expect(legalUci(state)).not.toContain("e5d6");
    expect(state.fen.split(" ")[3]).toBe("-");
  });
});

describe("chess: promotion", () => {
  const PAWN_ON_E7 = "k7/4P3/8/8/8/8/8/4K3 w - - 0 1";

  it("offers exactly four promotions, queen, rook, bishop and knight", () => {
    expect(movesFrom(chessStateFromFen(PAWN_ON_E7), "e7")).toEqual([
      "e7e8q",
      "e7e8r",
      "e7e8b",
      "e7e8n",
    ]);
  });

  it("promotes to the piece chosen", () => {
    const state = stateAfter(["e7e8n"], PAWN_ON_E7);

    expect(pieceOn(state, "e8")).toEqual({ color: "w", type: "n" });
    expect(pieceOn(state, "e7")).toBeNull();
  });

  it.each([
    ["no promotion piece", { from: "e7", to: "e8" }],
    ["a king", { from: "e7", to: "e8", promotion: "k" }],
    ["a pawn", { from: "e7", to: "e8", promotion: "p" }],
    ["an upper-case queen", { from: "e7", to: "e8", promotion: "Q" }],
  ])("refuses a promotion with %s with illegal-move", (_what, move) => {
    expect(tryMove(chessStateFromFen(PAWN_ON_E7), move)).toEqual({
      ok: false,
      error: "illegal-move",
    });
  });

  it("refuses a promotion piece on a move that does not promote", () => {
    expect(tryMove(currentState(newGame()), { from: "e2", to: "e4", promotion: "q" })).toEqual({
      ok: false,
      error: "illegal-move",
    });
  });

  it("offers the four promotions when the pawn takes on the last rank", () => {
    const state = chessStateFromFen("k2r4/4P3/8/8/8/8/8/4K3 w - - 0 1");

    expect(movesFrom(state, "e7").filter((move) => move.startsWith("e7d8"))).toEqual([
      "e7d8q",
      "e7d8r",
      "e7d8b",
      "e7d8n",
    ]);
    expect(pieceOn(chess.applyMove(state, uci("e7d8r")), "d8")).toEqual({
      color: "w",
      type: "r",
    });
  });

  it("promotes a black pawn on the first rank", () => {
    const state = chessStateFromFen("4k3/8/8/8/8/8/3p4/K7 b - - 0 1");

    expect(movesFrom(state, "d2")).toEqual(["d2d1q", "d2d1r", "d2d1b", "d2d1n"]);
    expect(pieceOn(chess.applyMove(state, uci("d2d1q")), "d1")).toEqual({
      color: "b",
      type: "q",
    });
  });
});

describe("chess: checkmate", () => {
  it("ends the fool's mate with Black winning by checkmate", () => {
    const state = stateAfter(["f2f3", "e7e5", "g2g4", "d8h4"]);

    expect(chess.result(state)).toEqual({ kind: "win", winners: [1], reason: "checkmate" });
    expect(chess.legalMoves(state)).toEqual([]);
  });

  it("lets a king in check play on, every legal move getting it out of check", () => {
    const state = chessStateFromFen("4k3/8/8/8/1b6/8/8/1N2K3 w - - 0 1");
    const moves = legalUci(state);

    expect(chess.result(state)).toBeNull();
    expect(moves).toEqual(expect.arrayContaining(["b1c3", "b1d2"]));
    for (const move of moves) {
      const after = chess.applyMove(state, uci(move));
      const king = chessBoard(after).findIndex(
        (piece) => piece?.type === CHESS_PIECE.King && piece.color === CHESS_COLOR.White,
      );
      expect(new Chess(after.fen).isAttacked(chessSquareAt(king), "b"), move).toBe(false);
    }
  });

  it("names the king in check, or null", () => {
    expect(chessKingInCheck(chessStateFromFen("4k3/8/8/8/1b6/8/8/1N2K3 w - - 0 1"))).toBe("e1");
    expect(chessKingInCheck(stateAfter(["f2f3", "e7e5", "g2g4", "d8h4"]))).toBe("e1");
    expect(chessKingInCheck(stateAfter(["e2e4", "f7f6", "d1h5"]))).toBe("e8");
    expect(chessKingInCheck(currentState(newGame()))).toBeNull();
  });
});

describe("chess: stalemate", () => {
  it("draws when the side to move has no move and is not in check", () => {
    const state = chessStateFromFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");

    expect(chess.result(state)).toEqual({ kind: "draw", reason: "stalemate" });
    expect(chess.legalMoves(state)).toEqual([]);
  });
});

describe("chess: insufficient material", () => {
  it("draws when the king takes the last black piece and only the kings remain", () => {
    const before = chessStateFromFen("8/8/8/8/8/3k4/8/Kr6 w - - 0 1");
    expect(chess.result(before)).toBeNull();

    const after = chess.applyMove(before, uci("a1b1"));

    expect(chess.result(after)).toEqual({ kind: "draw", reason: "insufficient-material" });
    expect(chess.legalMoves(after)).toEqual([]);
  });

  it.each([
    ["two bishops on light squares, one a side", "4k3/8/8/8/2b5/8/4B3/4K3 w - - 0 1"],
    ["a lone knight", "4k3/8/8/8/8/8/8/1N2K3 w - - 0 1"],
    ["a lone bishop", "4k3/8/8/8/8/8/8/2B1K3 b - - 0 1"],
  ])("draws with %s", (_what, fen) => {
    const state = chessStateFromFen(fen);

    expect(chess.result(state)).toEqual({ kind: "draw", reason: "insufficient-material" });
    expect(chess.legalMoves(state)).toEqual([]);
  });

  it.each([
    ["two white knights", "4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1"],
    ["bishops on squares of both colours", "4k3/8/8/8/2b5/8/8/2B1K3 w - - 0 1"],
    ["a pawn", "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"],
    ["a rook", "4k3/8/8/8/8/8/8/R3K3 w - - 0 1"],
  ])("plays on with %s", (_what, fen) => {
    expect(chess.result(chessStateFromFen(fen))).toBeNull();
  });
});

describe("chess: claiming a draw", () => {
  const THREEFOLD = times(2, KNIGHT_TRIP);

  it("does not end the game by itself on a threefold repetition", () => {
    const state = stateAfter(THREEFOLD);

    expect(chess.result(state)).toBeNull();
    expect(legalUci(state)).toHaveLength(21);
    expect(legalUci(state).at(-1)).toBe("claim-draw");
  });

  it("draws by threefold-claim when White claims", () => {
    const session = playUci([...THREEFOLD, "claim"]);
    const state = currentState(session);

    expect(chess.result(state)).toEqual({ kind: "draw", reason: "threefold-claim" });
    expect(chess.legalMoves(state)).toEqual([]);
    expect(chess.currentPlayer(state)).toBe(0);
  });

  it("refuses a claim before the third repetition with illegal-move", () => {
    const state = stateAfter(KNIGHT_TRIP);

    expect(legalUci(state)).not.toContain("claim-draw");
    expect(tryMove(state, { type: "claim-draw" })).toEqual({ ok: false, error: "illegal-move" });
  });

  it("does not count positions with other castling rights as the same", () => {
    const state = stateAfter(["e2e4", "e7e5", ...times(2, ["e1e2", "e8e7", "e2e1", "e7e8"])]);

    expect(legalUci(state)).not.toContain("claim-draw");
    expect(state.positions.filter((key) => key === state.positions.at(-1))).toHaveLength(2);
  });

  it("does not count positions with other en passant rights as the same", () => {
    const trip = ["g1f3", "b8c6", "f3g1", "c6b8"];
    // After 2...d5 White may take en passant; the same pieces later, without that right, are
    // another position.
    const opening = ["e2e4", "g8f6", "e4e5", "d7d5"];

    expect(legalUci(stateAfter([...opening, ...times(2, trip)]))).not.toContain("claim-draw");
    expect(legalUci(stateAfter([...opening, ...times(3, trip)]))).toContain("claim-draw");
  });

  it("lets Black claim by the fifty-move rule after 100 half-moves without pawn move or capture", () => {
    const before = chessStateFromFen("4k3/8/8/8/8/8/8/R3K3 w - - 99 80");
    expect(legalUci(before)).not.toContain("claim-draw");

    const state = chess.applyMove(before, uci("a1a2"));

    expect(chess.result(state)).toBeNull();
    expect(legalUci(state)).toContain("claim-draw");
    const claimed = chess.applyMove(state, uci("claim"));
    expect(chess.result(claimed)).toEqual({ kind: "draw", reason: "fifty-move-claim" });
    expect(chess.currentPlayer(claimed)).toBe(1);
  });

  it("plays on when the player who may claim moves instead, and the right is gone", () => {
    const state = stateAfter([...THREEFOLD, "e2e4"]);

    expect(chess.result(state)).toBeNull();
    expect(chess.currentPlayer(state)).toBe(1);
    expect(legalUci(state)).not.toContain("claim-draw");
  });

  it("keeps the position, the score sheet and the turn when a draw is claimed", () => {
    const before = stateAfter(THREEFOLD);
    const after = chess.applyMove(before, uci("claim"));

    expect(after).toEqual({ ...before, drawClaim: "threefold-claim" });
  });
});

describe("chess: automatic draws", () => {
  it("draws by fivefold-repetition when nobody claims", () => {
    const moves = times(4, KNIGHT_TRIP);
    const before = stateAfter(moves.slice(0, -1));
    expect(chess.result(before)).toBeNull();

    const state = stateAfter(moves);

    expect(chess.result(state)).toEqual({ kind: "draw", reason: "fivefold-repetition" });
    expect(chess.legalMoves(state)).toEqual([]);
  });

  it("draws by seventy-five-move after 150 half-moves without pawn move or capture", () => {
    const before = chessStateFromFen("4k3/8/8/8/8/8/8/R3K3 w - - 149 100");
    expect(chess.result(before)).toBeNull();

    const state = chess.applyMove(before, uci("a1a2"));

    expect(chess.result(state)).toEqual({ kind: "draw", reason: "seventy-five-move" });
    expect(chess.legalMoves(state)).toEqual([]);
  });

  it("starts the count again on a capture", () => {
    const before = chessStateFromFen("4k3/7p/8/n7/8/8/8/R3K3 w - - 149 100");

    const state = chess.applyMove(before, uci("a1a5"));

    expect(chess.result(state)).toBeNull();
    expect(halfMovesOf(state)).toBe(0);
    expect(state.positions).toHaveLength(1);
    expect(legalUci(state)).not.toContain("claim-draw");
  });

  it("lets a checkmate on the 150th half-move win", () => {
    const state = chess.applyMove(
      chessStateFromFen("k7/8/1K6/8/8/8/8/7R w - - 149 100"),
      uci("h1h8"),
    );

    expect(halfMovesOf(state)).toBe(150);
    expect(chess.result(state)).toEqual({ kind: "win", winners: [0], reason: "checkmate" });
  });

  it("lets a checkmate that makes a fifth repetition win", () => {
    // A mate cannot have happened before, so the earlier occurrences are written into the state.
    const start = chessStateFromFen("k7/8/1K6/8/8/8/8/7R w - - 10 100");
    const mateKey = chessPositionKey("k6R/8/1K6/8/8/8/8/8 b - - 11 100");
    const before: ChessState = {
      ...start,
      positions: [...times(4, [mateKey]), ...start.positions],
    };

    const state = chess.applyMove(before, uci("h1h8"));

    expect(state.positions.filter((key) => key === state.positions.at(-1))).toHaveLength(5);
    expect(chess.result(state)).toEqual({ kind: "win", winners: [0], reason: "checkmate" });
  });

  it("keeps one position per half-move since the last pawn move or capture", () => {
    playRandomGame(chess, {
      seed: 7,
      playerCount: 2,
      maxPlies: 10_000,
      onState: (state: ChessState) => {
        expect(state.positions).toHaveLength(halfMovesOf(state) + 1);
        expect(state.positions.at(-1)).toBe(chessPositionKey(state.fen));
      },
    });
  });
});

describe("chess: move notation", () => {
  it("writes the fool's mate as f3 e5 g4 Qh4#", () => {
    expect(stateAfter(["f2f3", "e7e5", "g2g4", "d8h4"]).san).toEqual(["f3", "e5", "g4", "Qh4#"]);
  });

  it("writes a promotion that checks as e8=Q+", () => {
    expect(stateAfter(["e7e8q"], "k7/4P3/8/8/8/8/8/4K3 w - - 0 1").san).toEqual(["e8=Q+"]);
  });

  it("names the square a knight comes from when two can reach d2", () => {
    expect(stateAfter(["b1d2"], "4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1").san).toEqual(["Nbd2"]);
  });

  it("writes castling as O-O and O-O-O", () => {
    expect(stateAfter(["e1g1", "e8c8"], "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1").san).toEqual([
      "O-O",
      "O-O-O",
    ]);
  });

  it("writes en passant as a pawn capture, exd6", () => {
    expect(stateAfter(["e2e4", "a7a6", "e4e5", "d7d5", "e5d6"]).san.at(-1)).toBe("exd6");
  });

  it("adds nothing to the score sheet for a draw claim", () => {
    const state = stateAfter([...times(2, KNIGHT_TRIP), "claim"]);

    expect(state.san).toEqual(["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]);
  });
});

describe("chess: test positions", () => {
  it("drops an unusable en passant square, so the key matches the position without it", () => {
    const withSquare = chessStateFromFen(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    );
    const without = chessStateFromFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");

    expect(withSquare.positions).toEqual(without.positions);
    expect(withSquare.fen).toBe(without.fen);
    expect(withSquare.positions).toEqual([stateAfter(["e2e4"]).positions.at(-1)]);
  });
});

describe("chess: board helpers", () => {
  it("lists the 64 squares from a1 to h8 with the pieces of the starting position", () => {
    const board = chessBoard(currentState(newGame()));

    expect(board).toHaveLength(64);
    expect(board.filter((piece) => piece !== null)).toHaveLength(32);
    expect(board[0]).toEqual({ color: "w", type: "r" });
    expect(board[4]).toEqual({ color: "w", type: "k" });
    expect(board[3]).toEqual({ color: "w", type: "q" });
    expect(board[60]).toEqual({ color: "b", type: "k" });
    expect(board[59]).toEqual({ color: "b", type: "q" });
    expect(board.slice(8, 16).every((piece) => piece?.type === "p" && piece.color === "w")).toBe(
      true,
    );
    expect(board.slice(48, 56).every((piece) => piece?.type === "p" && piece.color === "b")).toBe(
      true,
    );
    expect(board.slice(16, 48).every((piece) => piece === null)).toBe(true);
  });
});

describe("chess: applyMove keeps the rules honest", () => {
  it("throws on a promotion piece for a move that does not promote, even with a pawn about to", () => {
    const state = chessStateFromFen("4k3/1P6/8/8/8/8/8/4K3 w - - 0 1");

    expect(() => chess.applyMove(state, { from: "e1", to: "e2", promotion: "q" })).toThrow();
    expect(() => chess.applyMove(state, { from: "b7", to: "b8" })).toThrow();
    expect(pieceOn(chess.applyMove(state, uci("b7b8q")), "b8")).toEqual({ color: "w", type: "q" });
  });

  it.each([
    ["a draw was claimed", () => stateAfter([...times(2, KNIGHT_TRIP), "claim"]), "g1f3"],
    [
      "a draw was claimed (claiming again)",
      () => stateAfter([...times(2, KNIGHT_TRIP), "claim"]),
      "claim",
    ],
    ["checkmate", () => stateAfter(["f2f3", "e7e5", "g2g4", "d8h4"]), "e1f2"],
    [
      "checkmate on the 100th half-move (no claim either)",
      () => chess.applyMove(chessStateFromFen("k7/8/1K6/8/8/8/8/7R w - - 99 100"), uci("h1h8")),
      "claim",
    ],
    ["only the kings are left", () => chessStateFromFen("8/8/8/8/8/3k4/8/K7 w - - 0 1"), "a1a2"],
    ["the fifth repetition", () => stateAfter(times(4, KNIGHT_TRIP)), "g1f3"],
    ["the 150th half-move", () => chessStateFromFen("4k3/8/8/8/8/8/R7/4K3 b - - 150 100"), "e8e7"],
  ])("throws on a move after the game ended: %s", (_what, ended, move) => {
    const state = ended();
    expect(chess.result(state)).not.toBeNull();

    expect(() => chess.applyMove(state, uci(move))).toThrow();
  });
});
