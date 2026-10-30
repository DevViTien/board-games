import { defaultMoveKey, stableStringify } from "../move-key";
import { parseGameOptions } from "../options";
import { fromRecord, toRecord } from "../record";
import { activeEntries, currentState, startSession } from "../session";
import type { AnyGameDefinition, GameResult } from "../types";
import { deepEqual, findNonPlainData } from "./plain-data";
import { playRandomGame, type RandomGame, type RandomGameConfig } from "./play-random-game";

export interface ContractConfig<Options = unknown> {
  /** Seeds for the random games; each seed is played once per player count. */
  readonly seeds: readonly number[];
  /** Defaults to every player count the game allows, `meta.players.min` to `max`. */
  readonly playerCounts?: readonly number[];
  /** A random game that has not ended after this many moves fails the suite. */
  readonly maxPlies: number;
  /** Options for the random games; defaults to the game's `defaultOptions`. */
  readonly options?: Options;
  /** Time limit of each check in ms, for games whose random games are long (Vitest's default: 5 s). */
  readonly timeout?: number;
}

export const CONTRACT_CHECK = {
  Playable: "playable",
  DefaultOptions: "default-options",
  Terminates: "terminates",
  DeterministicSetup: "deterministic-setup",
  NoMutation: "no-mutation",
  DeterministicApply: "deterministic-apply",
  DeterministicQueries: "deterministic-queries",
  ResultMatchesMoves: "result-matches-moves",
  UniqueMoveKeys: "unique-move-keys",
  PlayersInRange: "players-in-range",
  ValidOutcomes: "valid-outcomes",
  PlainData: "plain-data",
  RecordRoundTrip: "record-round-trip",
  AiHasEvaluate: "ai-has-evaluate",
} as const;

export type ContractCheckId = (typeof CONTRACT_CHECK)[keyof typeof CONTRACT_CHECK];

export interface ContractCheck {
  readonly id: ContractCheckId;
  readonly title: string;
  /** Throws an error starting with `[id]` on the first violation. */
  run(this: void, game: AnyGameDefinition, config: ContractConfig): void;
}

function violation(id: ContractCheckId, message: string): never {
  throw new Error(`[${id}] ${message}`);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** What a check found, as opposed to an exception the rules threw while the check looked. */
class Finding extends Error {}

function fail(message: string): never {
  throw new Finding(message);
}

type Hooks = Pick<RandomGameConfig, "onState" | "onMove">;

/**
 * How one random game went. A failure the rules cause on their own is classified rather than
 * reported, so that only the check owning it fails and the others skip the game: a game that fails
 * with frozen data but plays through unfrozen `mutates` (`no-mutation`); one that fails either way
 * is `broken` (`playable`).
 */
type GameRun =
  | { readonly kind: "played"; readonly game: RandomGame }
  | { readonly kind: "mutates" | "broken"; readonly message: string };

/** Plays one game with frozen rule data and the check's hooks; throws what the hooks find. */
function runGame(game: AnyGameDefinition, config: RandomGameConfig, hooks: Hooks): GameRun {
  try {
    return { kind: "played", game: playRandomGame(game, { ...config, ...hooks, freeze: true }) };
  } catch (error) {
    // Data is frozen, so no mutation can have corrupted what the hook looked at: a finding stands.
    if (error instanceof Finding) throw error;
    // A rule threw, maybe inside a hook (hooks call rules on frozen data too). Before blaming the
    // check, see whether the rules play this game at all without it.
    const alone = playAlone(game, config);
    if (alone !== undefined) return alone;
    throw error;
  }
}

/** How the rules play a game with no check attached, or `undefined` if they play it through. */
function playAlone(
  game: AnyGameDefinition,
  config: RandomGameConfig,
): Exclude<GameRun, { kind: "played" }> | undefined {
  try {
    playRandomGame(game, { ...config, freeze: true });
    return undefined;
  } catch (frozenError) {
    try {
      playRandomGame(game, config);
      return { kind: "mutates", message: messageOf(frozenError) };
    } catch (error) {
      return { kind: "broken", message: messageOf(error) };
    }
  }
}

function playerCountsOf(game: AnyGameDefinition, config: ContractConfig): readonly number[] {
  if (config.playerCounts !== undefined) return config.playerCounts;
  const { min, max } = game.meta.players;
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

/** Plays every seed × player count, labelling a violation with the check and the game played. */
function forEachRun(
  id: ContractCheckId,
  game: AnyGameDefinition,
  config: ContractConfig,
  hooksFor: (playerCount: number) => Hooks,
  visit: (run: GameRun) => void,
): void {
  for (const playerCount of playerCountsOf(game, config)) {
    for (const seed of config.seeds) {
      const runConfig = {
        seed,
        playerCount,
        maxPlies: config.maxPlies,
        ...(config.options === undefined ? {} : { options: config.options }),
      };
      try {
        visit(runGame(game, runConfig, hooksFor(playerCount)));
      } catch (error) {
        violation(id, `${messageOf(error)} (seed ${seed}, ${playerCount} players)`);
      }
    }
  }
}

/** Like `forEachRun` for a check that only looks at games that could be played. */
function forEachPlayedGame(
  id: ContractCheckId,
  game: AnyGameDefinition,
  config: ContractConfig,
  hooks: Hooks,
  afterGame?: (played: RandomGame) => void,
): void {
  forEachRun(
    id,
    game,
    config,
    () => hooks,
    (run) => {
      if (run.kind === "played") afterGame?.(run.game);
    },
  );
}

/**
 * Equality of two values that should be the same plain data. A value that is not plain data cannot
 * be compared faithfully and is `plain-data`'s violation, so it counts as equal here.
 */
function sameOrNotPlain(a: unknown, b: unknown): boolean {
  if (findNonPlainData(a) !== null || findNonPlainData(b) !== null) return true;
  return deepEqual(a, b);
}

function keyOf(game: AnyGameDefinition, move: unknown): string {
  return game.moveKey === undefined ? defaultMoveKey(move) : game.moveKey(move);
}

function isValidSeat(seat: unknown, playerCount: number): boolean {
  return Number.isInteger(seat) && typeof seat === "number" && seat >= 0 && seat < playerCount;
}

function checkWinners(result: GameResult, playerCount: number): void {
  if (result.kind !== "win") return;
  if (result.winners.length === 0) fail("a win without any winner");
  if (!result.winners.every((winner) => isValidSeat(winner, playerCount))) {
    fail(`winners ${JSON.stringify(result.winners)} outside 0..${playerCount - 1}`);
  }
  if (new Set(result.winners).size !== result.winners.length) {
    fail(`duplicate winners ${JSON.stringify(result.winners)}`);
  }
}

export const CONTRACT_CHECKS: readonly ContractCheck[] = [
  {
    id: CONTRACT_CHECK.Playable,
    title: "every random game can be started and played without the rules throwing",
    run: (game, config) => {
      forEachRun(
        CONTRACT_CHECK.Playable,
        game,
        config,
        () => ({}),
        (run) => {
          if (run.kind === "broken") fail(run.message);
        },
      );
    },
  },
  {
    id: CONTRACT_CHECK.DefaultOptions,
    title: "defaultOptions are plain data that the game accepts unchanged",
    run: (game) => {
      const id = CONTRACT_CHECK.DefaultOptions;
      const path = findNonPlainData(game.defaultOptions);
      if (path !== null) violation(id, `defaultOptions are not plain data at ${path}`);
      // As they arrive from outside: a room created with the defaults, a record that stores them.
      const parsed = parseGameOptions(game, JSON.parse(JSON.stringify(game.defaultOptions)));
      if (!parsed.ok) violation(id, `the game rejects its own defaultOptions (${parsed.error})`);
      if (!deepEqual(parsed.value, game.defaultOptions)) {
        violation(id, "parsing defaultOptions changes them");
      }
    },
  },
  {
    id: CONTRACT_CHECK.Terminates,
    title: "every random game ends within maxPlies",
    run: (game, config) => {
      // A stuck game (no result, no move) is `result-matches-moves`'s violation, not this one's.
      forEachPlayedGame(CONTRACT_CHECK.Terminates, game, config, {}, (played) => {
        if (!played.finished && !played.stuck) {
          fail(`the game did not end within ${config.maxPlies} moves`);
        }
      });
    },
  },
  {
    id: CONTRACT_CHECK.DeterministicSetup,
    title: "setup is deterministic",
    run: (game, config) => {
      for (const playerCount of playerCountsOf(game, config)) {
        const options = config.options ?? game.defaultOptions;
        const first = startSession(game, playerCount, options);
        const second = startSession(game, playerCount, options);
        // A game that cannot start fails `playable`.
        if (!first.ok || !second.ok) continue;
        if (!sameOrNotPlain(currentState(first.value), currentState(second.value))) {
          violation(
            CONTRACT_CHECK.DeterministicSetup,
            `two setups with ${playerCount} players gave different states`,
          );
        }
      }
    },
  },
  {
    id: CONTRACT_CHECK.NoMutation,
    title: "the rules never modify a state, move or outcome they are given",
    run: (game, config) => {
      forEachRun(
        CONTRACT_CHECK.NoMutation,
        game,
        config,
        () => ({}),
        (run) => {
          if (run.kind === "mutates") {
            fail(`a rule modified a value it was given: ${run.message}`);
          }
        },
      );
    },
  },
  {
    id: CONTRACT_CHECK.DeterministicApply,
    title: "applyMove and outcomes are deterministic",
    run: (game, config) => {
      forEachPlayedGame(CONTRACT_CHECK.DeterministicApply, game, config, {
        onMove: (before, entry, after) => {
          const again = game.applyMove(before, entry.move, entry.outcome);
          if (!sameOrNotPlain(again, after)) {
            fail(`applying ${stableStringify(entry.move)} twice gave different states`);
          }
          const outcomes = game.outcomes?.(before, entry.move) ?? [];
          if (!sameOrNotPlain(outcomes, game.outcomes?.(before, entry.move) ?? [])) {
            fail(`outcomes of ${stableStringify(entry.move)} differ between calls`);
          }
        },
      });
    },
  },
  {
    id: CONTRACT_CHECK.DeterministicQueries,
    title: "legalMoves, result and currentPlayer answer the same every time",
    run: (game, config) => {
      forEachPlayedGame(CONTRACT_CHECK.DeterministicQueries, game, config, {
        onState: (state) => {
          // The order matters too: random play, AI and the board all pick moves by position.
          if (!sameOrNotPlain(game.legalMoves(state), game.legalMoves(state))) {
            fail("legalMoves gave different lists for the same state");
          }
          const result = game.result(state);
          if (!deepEqual(result, game.result(state))) {
            fail("result gave different answers for the same state");
          }
          if (result === null && game.currentPlayer(state) !== game.currentPlayer(state)) {
            fail("currentPlayer gave different seats for the same state");
          }
        },
      });
    },
  },
  {
    id: CONTRACT_CHECK.ResultMatchesMoves,
    title: "a game without a result always has a legal move, and an ended game has none",
    run: (game, config) => {
      forEachPlayedGame(CONTRACT_CHECK.ResultMatchesMoves, game, config, {
        onState: (state) => {
          const ended = game.result(state) !== null;
          const hasMoves = game.legalMoves(state).length > 0;
          if (ended === hasMoves) {
            fail(
              ended
                ? "an ended game still has legal moves"
                : "an unfinished game has no legal move",
            );
          }
        },
      });
    },
  },
  {
    id: CONTRACT_CHECK.UniqueMoveKeys,
    title: "legal moves have distinct keys",
    run: (game, config) => {
      forEachPlayedGame(CONTRACT_CHECK.UniqueMoveKeys, game, config, {
        onState: (state) => {
          const keys = game.legalMoves(state).map((move) => keyOf(game, move));
          if (new Set(keys).size !== keys.length) {
            fail(`legal moves share a key: ${JSON.stringify(keys)}`);
          }
        },
      });
    },
  },
  {
    id: CONTRACT_CHECK.PlayersInRange,
    title: "the player to move and the winners are seats of the game",
    run: (game, config) => {
      forEachRun(
        CONTRACT_CHECK.PlayersInRange,
        game,
        config,
        (playerCount) => ({
          onState: (state) => {
            const result = game.result(state);
            if (result !== null) {
              checkWinners(result, playerCount);
              return;
            }
            const seat = game.currentPlayer(state);
            if (!isValidSeat(seat, playerCount)) {
              fail(`player to move ${seat} outside 0..${playerCount - 1}`);
            }
          },
        }),
        () => undefined,
      );
    },
  },
  {
    id: CONTRACT_CHECK.ValidOutcomes,
    title: "random outcomes have positive integer weights and distinct values",
    run: (game, config) => {
      forEachPlayedGame(CONTRACT_CHECK.ValidOutcomes, game, config, {
        // Every legal move, before one is played: the engine refuses to draw from invalid weights.
        onState: (state) => {
          if (game.result(state) !== null) return;
          for (const move of game.legalMoves(state)) {
            const choices = game.outcomes?.(state, move) ?? [];
            for (const { weight } of choices) {
              if (!Number.isInteger(weight) || weight <= 0) {
                fail(`outcome weight ${weight} is not a positive integer`);
              }
            }
            const keys = choices.map((choice) => stableStringify(choice.outcome));
            if (new Set(keys).size !== keys.length) {
              fail(`outcomes share a value: ${JSON.stringify(keys)}`);
            }
          }
        },
      });
    },
  },
  {
    id: CONTRACT_CHECK.PlainData,
    title: "states, moves and outcomes are plain JSON data",
    run: (game, config) => {
      const ensurePlain = (what: string, value: unknown): void => {
        const path = findNonPlainData(value);
        if (path !== null) fail(`${what} is not plain data at ${path}`);
      };
      forEachPlayedGame(CONTRACT_CHECK.PlainData, game, config, {
        onState: (state) => {
          ensurePlain("state", state);
        },
        onMove: (_before, entry) => {
          ensurePlain("move", entry.move);
          ensurePlain("outcome", entry.outcome ?? null);
        },
      });
    },
  },
  {
    id: CONTRACT_CHECK.RecordRoundTrip,
    title: "the record survives JSON and rebuilds the same game",
    run: (game, config) => {
      forEachPlayedGame(CONTRACT_CHECK.RecordRoundTrip, game, config, {}, ({ session }) => {
        const raw: unknown = JSON.parse(JSON.stringify(toRecord(session)));
        const rebuilt = fromRecord(game, raw);
        if (!rebuilt.ok) fail(`fromRecord failed with ${rebuilt.error}`);
        const original = currentState(session);
        const copy = currentState(rebuilt.value);
        if (
          !sameOrNotPlain(copy, original) ||
          !sameOrNotPlain(rebuilt.value.entries, activeEntries(session)) ||
          (game.result(original) === null &&
            game.currentPlayer(copy) !== game.currentPlayer(original))
        ) {
          fail("the rebuilt game differs from the original");
        }
      });
    },
  },
  {
    id: CONTRACT_CHECK.AiHasEvaluate,
    title: "a game that supports AI declares evaluate",
    run: (game) => {
      if (game.meta.supportsAI && game.evaluate === undefined) {
        violation(CONTRACT_CHECK.AiHasEvaluate, "meta.supportsAI is true but evaluate is missing");
      }
    },
  },
];
