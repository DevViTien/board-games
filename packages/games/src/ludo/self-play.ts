// Test-only: random games of Cờ cá ngựa played on states alone (design §5). The engine's
// `playRandomGame` builds a session and copies its history at every move, which is quadratic in a
// game this long; a thousand games need the plain loop.
import { createRng, type GameDefinition, type PlayerIndex } from "@board-games/engine";

import type { LudoOutcome } from "./constants";
import type { LudoOptions } from "./options";
import type { LudoMove, LudoState } from "./rules";

export interface SelfPlayConfig {
  readonly seed: number;
  readonly players: 2 | 3 | 4;
  readonly maxPlies: number;
  readonly options: LudoOptions;
  /** Called with every state awaiting a roll. */
  readonly onRollAwaited?: (state: LudoState) => void;
}

export interface SelfPlayGame {
  readonly winner: PlayerIndex | null;
  /** Moves played: rolls and horse moves. */
  readonly plies: number;
  /** The game has no result but no legal move either. */
  readonly stuck: boolean;
  /** The entries of the game, as a record stores them. */
  readonly entries: readonly { readonly move: LudoMove; readonly outcome?: LudoOutcome }[];
}

/** Plays one game, every move and roll drawn from a generator seeded with `seed`. */
export function selfPlay(
  rules: GameDefinition<LudoState, LudoMove, LudoOutcome, LudoOptions>,
  { seed, players, maxPlies, options, onRollAwaited }: SelfPlayConfig,
): SelfPlayGame {
  const rng = createRng(seed);
  const entries: { move: LudoMove; outcome?: LudoOutcome }[] = [];
  let state = rules.setup({ playerCount: players, options });
  for (let ply = 0; ply < maxPlies; ply += 1) {
    if (rules.result(state) !== null) break;
    const moves = rules.legalMoves(state);
    const move = moves[rng.nextInt(0, moves.length - 1)];
    if (move === undefined) return { winner: null, plies: ply, stuck: true, entries };
    if (move.type === "roll") onRollAwaited?.(state);
    const choices = rules.outcomes?.(state, move) ?? [];
    const drawn = choices.length === 0 ? undefined : choices[rng.nextInt(0, choices.length - 1)];
    state = rules.applyMove(state, move, drawn?.outcome);
    entries.push(drawn === undefined ? { move } : { move, outcome: drawn.outcome });
  }
  const result = rules.result(state);
  return {
    winner: result?.kind === "win" ? (result.winners[0] ?? null) : null,
    plies: entries.length,
    stuck: false,
    entries,
  };
}
