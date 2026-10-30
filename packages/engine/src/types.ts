import type { GameCategory } from "./constants";

/** Kebab-case game identifier. `packages/games` narrows it to the ids it registers. */
export type GameId = string;

/** A seat at the table, `0..playerCount - 1`. The app decides how to name it (X/O, a colour…). */
export type PlayerIndex = number;

export interface GameMeta {
  readonly players: { readonly min: number; readonly max: number };
  readonly category: GameCategory;
  readonly durationMinutes: number;
  readonly supportsAI: boolean;
}

/** `reason` is a code chosen by the game (e.g. "checkmate"); the app translates it. */
export type GameResult =
  | { readonly kind: "win"; readonly winners: readonly PlayerIndex[]; readonly reason?: string }
  | { readonly kind: "draw"; readonly reason?: string };

/** One possible random outcome of a move; `weight` is a positive integer. */
export interface WeightedOutcome<Outcome> {
  readonly outcome: Outcome;
  readonly weight: number;
}

/** A move as played, with the random outcome it was locked to (if the move had one). */
export interface HistoryEntry<Move, Outcome> {
  readonly move: Move;
  readonly outcome?: Outcome;
}

export interface Rng {
  /** Integer in `[min, max]`, both inclusive. */
  nextInt(this: void, min: number, max: number): number;
  /** Number in `[0, 1)`. */
  nextFloat(this: void): number;
}

export interface SetupContext<Options> {
  readonly playerCount: number;
  readonly options: Options;
}

/**
 * The rules of one game, as pure functions over plain-data state.
 *
 * Methods use method syntax so every game is assignable to `AnyGameDefinition`, and declare
 * `this: void` so they can be passed around unbound (`legalMoves.map(game.moveKey)`).
 */
export interface GameDefinition<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
> {
  readonly id: GameId;
  readonly meta: GameMeta;
  readonly defaultOptions: Options;
  /** Validates options received from outside; `null` rejects them. Without it, only `{}` is accepted. */
  parseOptions?(this: void, raw: unknown): Options | null;
  /** Must be deterministic: any randomness at setup is decided by the caller and passed in `options`. */
  setup(this: void, context: SetupContext<Options>): State;
  currentPlayer(this: void, state: State): PlayerIndex;
  legalMoves(this: void, state: State): readonly Move[];
  /** Possible random outcomes of a legal move; empty (or absent) when the move is not random. */
  outcomes?(this: void, state: State, move: Move): readonly WeightedOutcome<Outcome>[];
  /** Must be deterministic and must not modify `state`. */
  applyMove(this: void, state: State, move: Move, outcome?: Outcome): State;
  result(this: void, state: State): GameResult | null;
  evaluate?(this: void, state: State, player: PlayerIndex): number;
  /** Identity of a move; defaults to JSON with sorted keys. */
  moveKey?(this: void, move: Move): string;
}

export type AnyGameDefinition = GameDefinition<unknown, unknown, unknown, object>;
