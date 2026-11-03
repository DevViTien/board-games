// Test helpers for Cờ vua: positions given as FEN and games given as moves in UCI (`e2e4`,
// `e7e8q`). Only the tests import this file.
import {
  createRng,
  createSession,
  currentState,
  playMove,
  type Session,
} from "@board-games/engine";

import { normalFen } from "./chess-js";
import { CHESS_CLAIM_DRAW } from "./constants";
import { chess, type ChessMove, chessPositionKey, type ChessState } from "./rules";

export type ChessSession = Session<ChessState, ChessMove, never, Record<string, never>>;

/**
 * A state for the position of `fen`, normalised the way `applyMove` writes positions (en passant
 * square only when the capture is legal), so its repetition key matches the ones moves produce. Its
 * only position so far is that one.
 */
export function chessStateFromFen(fen: string): ChessState {
  const normal = normalFen(fen);
  return { fen: normal, positions: [chessPositionKey(normal)], san: [], drawClaim: null };
}

/** A session of a new game, or of one starting at `state`. */
export function newGame(state?: ChessState): ChessSession {
  const created = createSession(chess, { playerCount: 2 });
  if (!created.ok) throw new Error(created.error);
  return state === undefined ? created.value : { ...created.value, states: [state] };
}

/** `e2e4` → `{ from: "e2", to: "e4" }`, `e7e8q` → with `promotion`, `claim` → a draw claim. */
export function uci(text: string): ChessMove {
  if (text === "claim") return { type: CHESS_CLAIM_DRAW };
  const move = { from: text.slice(0, 2), to: text.slice(2, 4) } as ChessMove;
  return text.length > 4 ? ({ ...move, promotion: text.slice(4) } as ChessMove) : move;
}

/** Plays `moves` (UCI, or `claim`) in order through the session, failing on the first refused one. */
export function playUci(moves: readonly string[], from: ChessSession = newGame()): ChessSession {
  const rng = createRng(1);
  return moves.reduce((session, text, index) => {
    const played = playMove(chess, session, uci(text), rng);
    if (!played.ok) throw new Error(`move ${index + 1} (${text}): ${played.error}`);
    return played.value;
  }, from);
}

/** The state after `moves` (UCI) from `fen`, or from the start. */
export function stateAfter(moves: readonly string[], fen?: string): ChessState {
  return currentState(
    playUci(moves, fen === undefined ? newGame() : newGame(chessStateFromFen(fen))),
  );
}

/** Legal moves of `state` by their keys: UCI, or `claim-draw`. */
export function legalUci(state: ChessState): string[] {
  return chess.legalMoves(state).map(chess.moveKey);
}

export interface PerftPosition {
  readonly name: string;
  readonly fen: string;
  /** Published counts for depth 1, 2, …; the tests check the first `checkedDepth` of them. */
  readonly counts: readonly number[];
  readonly checkedDepth: number;
}

/** The standard perft positions (chessprogramming.org "Perft Results"), with published counts. */
export const PERFT_POSITIONS: readonly PerftPosition[] = [
  {
    name: "start",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    counts: [20, 400, 8902, 197_281],
    checkedDepth: 4,
  },
  {
    name: "Kiwipete",
    fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    counts: [48, 2039, 97_862],
    checkedDepth: 3,
  },
  {
    name: "position 3",
    fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    counts: [14, 191, 2812, 43_238],
    checkedDepth: 4,
  },
  {
    name: "position 4",
    fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1",
    counts: [6, 264, 9467],
    checkedDepth: 3,
  },
  {
    name: "position 4 mirrored",
    fen: "r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1",
    counts: [6, 264, 9467],
    checkedDepth: 3,
  },
  {
    name: "position 5",
    fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
    counts: [44, 1486, 62_379],
    checkedDepth: 3,
  },
  {
    name: "position 6",
    fen: "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
    counts: [46, 2079, 89_890],
    checkedDepth: 3,
  },
];
