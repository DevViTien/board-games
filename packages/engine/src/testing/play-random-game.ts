import { createRng } from "../rng";
import { currentState, playMove, type Session, startSession } from "../session";
import type { GameDefinition, HistoryEntry } from "../types";
import { deepFreeze } from "./deep-freeze";

export interface RandomGameConfig<State = unknown, Move = unknown, Outcome = unknown> {
  readonly seed: number;
  readonly playerCount: number;
  readonly maxPlies: number;
  /** Defaults to the game's `defaultOptions`. */
  readonly options?: unknown;
  /**
   * Deep-freezes every value the rules return (states, legal moves, outcome lists) and the setup
   * context before any rule sees them, so a rule that modifies one, even only to cache something,
   * throws.
   */
  readonly freeze?: boolean;
  /** Called with every state reached, including the first and the last. */
  readonly onState?: (state: State) => void;
  /** Called after every move with the state before it, the entry played and the state after it. */
  readonly onMove?: (before: State, entry: HistoryEntry<Move, Outcome>, after: State) => void;
}

export interface RandomGame<State = unknown, Move = unknown, Outcome = unknown, Options = unknown> {
  readonly session: Session<State, Move, Outcome, Options>;
  /** The game reached a result. */
  readonly finished: boolean;
  /** The game has no result but no legal move either. */
  readonly stuck: boolean;
}

/** Plays one game choosing every move and random outcome with a seeded generator. */
export function playRandomGame<
  State,
  Move,
  Outcome = never,
  Options extends object = Record<string, never>,
>(
  game: GameDefinition<State, Move, Outcome, Options>,
  config: RandomGameConfig<State, Move, Outcome>,
): RandomGame<State, Move, Outcome, Options> {
  const rules = config.freeze === true ? frozenRules(game) : game;
  const rng = createRng(config.seed);
  const started = startSession(rules, config.playerCount, config.options ?? game.defaultOptions);
  if (!started.ok) throw new Error(`could not start a game: ${started.error}`);

  let session = started.value;
  for (let ply = 0; ; ply += 1) {
    const state = currentState(session);
    config.onState?.(state);
    if (rules.result(state) !== null) return { session, finished: true, stuck: false };

    const moves = rules.legalMoves(state);
    if (moves.length === 0) return { session, finished: false, stuck: true };
    if (ply >= config.maxPlies) return { session, finished: false, stuck: false };

    // The app asks whose turn it is at every state, so this rule runs (frozen, if asked) as well.
    rules.currentPlayer(state);
    const move = moves[rng.nextInt(0, moves.length - 1)];
    const played = playMove(rules, session, move, rng);
    if (!played.ok) throw new Error(`playMove rejected a legal move: ${played.error}`);

    session = played.value;
    const entry = session.entries[session.cursor - 1];
    if (entry !== undefined) config.onMove?.(state, entry, currentState(session));
  }
}

/** The same rules, with everything they produce deep-frozen as it is produced. */
function frozenRules<State, Move, Outcome, Options extends object>(
  game: GameDefinition<State, Move, Outcome, Options>,
): GameDefinition<State, Move, Outcome, Options> {
  const { outcomes } = game;
  return {
    ...game,
    setup: (context) => deepFreeze(game.setup(deepFreeze(context))),
    legalMoves: (state) => deepFreeze(game.legalMoves(state)),
    applyMove: (state, move, outcome) => deepFreeze(game.applyMove(state, move, outcome)),
    ...(outcomes === undefined
      ? {}
      : { outcomes: (state: State, move: Move) => deepFreeze(outcomes(state, move)) }),
  };
}
