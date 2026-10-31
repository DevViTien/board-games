import { chooseMove, createRng } from "@board-games/engine";
import { findGame } from "@board-games/games";

import type { AiRequest } from "@/transport/types";

/** What the AI player posts to its Worker. */
export interface AiWorkerRequest {
  readonly id: number;
  readonly request: AiRequest;
}

/** The Worker's answer to the request with the same `id`. */
export type AiWorkerResponse =
  | { readonly id: number; readonly ok: true; readonly move: unknown }
  | { readonly id: number; readonly ok: false };

/**
 * The AI's move for a request, in a Worker or on the main thread. `now` reads milliseconds; pass
 * `() => performance.now()`, never the bare method, which throws once detached from `performance`.
 * Throws when the game is unknown or the AI cannot choose a move.
 */
export function computeAiMove(request: AiRequest, now: () => number): unknown {
  const game = findGame(request.gameId);
  if (game === undefined) throw new Error(`Unknown game "${request.gameId}"`);
  const chosen = chooseMove(game, request.state, {
    level: request.level,
    rng: createRng(request.seed),
    now,
    timeLimitMs: request.timeLimitMs,
  });
  if (!chosen.ok) throw new Error(`The AI found no move: ${chosen.error}`);
  return chosen.value;
}
