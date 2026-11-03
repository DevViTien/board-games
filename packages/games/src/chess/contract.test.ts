import { createRng, currentState } from "@board-games/engine";
import { describeGameContract, playRandomGame } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { isChessDrawClaim } from "./board";
import { CHESS_RESULT_REASON } from "./constants";
import { chess, type ChessPieceMove, type ChessState } from "./rules";

// Random games last about 360 half-moves (40 games: 61–616) and end by a claim the random player
// happened to pick, insufficient material, checkmate or stalemate; nothing near 3 000 half-moves
// (design of add-chess-rules §4, §6).
const MAX_PLIES = 3000;

/** Without claims a game runs to the fivefold repetition or the 75-move rule: ~8 800 at most. */
const MAX_PLIES_WITHOUT_CLAIMS = 9000;

describeGameContract(chess, { seeds: [1, 2, 3], maxPlies: MAX_PLIES, timeout: 10_000 });

/** The same rules for a player who never claims a draw. */
const neverClaims = {
  ...chess,
  legalMoves: (state: ChessState) =>
    chess.legalMoves(state).filter((move) => !isChessDrawClaim(move)),
};

/**
 * A game without claims in which each player, `repeatChance` of the time, takes back its own last
 * move when it can (as players shuffling pieces do), and otherwise moves at random.
 */
function playShuffling(seed: number, repeatChance: number): ChessState {
  const rng = createRng(seed);
  const lastMoves: (ChessPieceMove | null)[] = [null, null];
  let state = chess.setup();
  for (let ply = 0; ply < MAX_PLIES_WITHOUT_CLAIMS && chess.result(state) === null; ply += 1) {
    const moves = neverClaims.legalMoves(state) as readonly ChessPieceMove[];
    const player = chess.currentPlayer(state);
    const last = lastMoves[player] ?? null;
    const back =
      last === null || rng.nextFloat() >= repeatChance
        ? undefined
        : moves.find((move) => move.from === last.to && move.to === last.from);
    const move = back ?? moves[rng.nextInt(0, moves.length - 1)];
    if (move === undefined) throw new Error("No legal move in an unfinished game");
    lastMoves[player] = move;
    state = chess.applyMove(state, move);
  }
  return state;
}

describe("chess random games", () => {
  const reasons: readonly string[] = Object.values(CHESS_RESULT_REASON);

  it("end, every one of them, with one of the seven reasons", () => {
    // Seeds the contract suite above does not already play.
    for (let seed = 4; seed <= 13; seed += 1) {
      const game = playRandomGame(chess, { seed, playerCount: 2, maxPlies: MAX_PLIES });
      const result = chess.result(currentState(game.session));

      expect(game.finished, `seed ${seed}`).toBe(true);
      expect(reasons, `seed ${seed}`).toContain(result?.reason);
    }
  }, 10_000);

  it("end without claims, by the fivefold repetition or the 75-move rule among others", () => {
    const ended = [1, 7].map((seed) => {
      const game = playRandomGame(neverClaims, {
        seed,
        playerCount: 2,
        maxPlies: MAX_PLIES_WITHOUT_CLAIMS,
      });
      expect(game.finished, `seed ${seed}`).toBe(true);
      return currentState(game.session);
    });
    // Seed 7 ends by the 75-move rule, the two shuffling games by the fivefold repetition.
    ended.push(playShuffling(3, 0.7), playShuffling(4, 0.9));
    const found = ended.map((state) => chess.result(state)?.reason);

    for (const reason of found) {
      expect(reasons).toContain(reason);
      expect(reason).not.toMatch(/claim/);
    }
    expect(found).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(fivefold-repetition|seventy-five-move)$/)]),
    );
  }, 10_000);
});
