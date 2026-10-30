import { describe, expect, it } from "vitest";

import { COUNTER_TARGET, counterGame, type CounterState } from "../test-fixtures/counter-game";
import {
  DICE_FACES,
  diceRaceGame,
  diceRaceRules,
  type DiceRaceState,
} from "../test-fixtures/dice-race-game";
import type { AnyGameDefinition } from "../types";
import {
  CONTRACT_CHECK,
  CONTRACT_CHECKS,
  type ContractCheckId,
  type ContractConfig,
} from "./contract-checks";

const COUNTER_CONFIG: ContractConfig = { seeds: [1, 2, 3], playerCounts: [2], maxPlies: 20 };
const DICE_CONFIG: ContractConfig = {
  seeds: [1, 2, 3],
  playerCounts: [2, 4],
  maxPlies: 200,
  options: { target: 12 },
};

function check(id: ContractCheckId) {
  const found = CONTRACT_CHECKS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Unknown check ${id}`);
  return found;
}

/** The ids of the checks that fail for `game`, in suite order. */
function failingChecks(game: AnyGameDefinition, config: ContractConfig): ContractCheckId[] {
  return CONTRACT_CHECKS.filter((candidate) => {
    try {
      candidate.run(game, config);
      return false;
    } catch {
      return true;
    }
  }).map((candidate) => candidate.id);
}

/** Calls that return a new value on every call, to make a rule non-deterministic. */
function counter() {
  let calls = 0;
  return () => (calls += 1);
}

const nextCall = counter();

/** The counter step, applied without touching anything it is given. */
function addStep(state: CounterState, add: number) {
  return { count: state.count + add, toMove: 1 - state.toMove };
}

describe("contract checks on valid games", () => {
  it("has one check per id", () => {
    expect(CONTRACT_CHECKS.map((candidate) => candidate.id).sort()).toEqual(
      Object.values(CONTRACT_CHECK).sort(),
    );
  });

  it("all pass for the fixtures", () => {
    expect(failingChecks(counterGame, COUNTER_CONFIG)).toEqual([]);
    expect(failingChecks(diceRaceGame, DICE_CONFIG)).toEqual([]);
  });
});

interface BrokenGame {
  readonly id: ContractCheckId;
  readonly what: string;
  readonly game: AnyGameDefinition;
  readonly config: ContractConfig;
  /** Other checks this violation necessarily breaks too (the reason is next to each). */
  readonly alsoFails?: readonly ContractCheckId[];
  /** Part of the violation message, when it matters which branch of the check fired. */
  readonly message?: string;
}

/**
 * Each broken game overrides rules of a fixture to violate one requirement. It must fail the check
 * for that requirement and pass every other one, so the suite points at the right requirement.
 */
const BROKEN_GAMES: readonly BrokenGame[] = [
  {
    id: CONTRACT_CHECK.Playable,
    what: "throws while applying a move",
    game: {
      ...counterGame,
      applyMove: (state: CounterState, move: { add: 1 | 2 }) => {
        if (state.count >= 4) throw new Error("rules exploded");
        return addStep(state, move.add);
      },
    },
    config: COUNTER_CONFIG,
    message: "rules exploded",
  },
  {
    id: CONTRACT_CHECK.Playable,
    what: "has no parseOptions, so it accepts only its defaults and not the options under test",
    game: diceRaceRules,
    config: DICE_CONFIG,
    message: "could not start a game: invalid-options",
  },
  {
    id: CONTRACT_CHECK.DefaultOptions,
    what: "declares defaultOptions its own parseOptions rejects",
    game: { ...diceRaceGame, defaultOptions: { target: 2 } },
    config: DICE_CONFIG,
  },
  {
    id: CONTRACT_CHECK.NoMutation,
    what: "modifies the previous state",
    game: {
      ...counterGame,
      applyMove: (state: CounterState, move: { add: 1 | 2 }) => {
        (state as { count: number }).count += move.add;
        return { count: state.count, toMove: 1 - state.toMove };
      },
    },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.NoMutation,
    what: "freezes its states only shallowly and modifies an array inside one",
    game: {
      ...counterGame,
      setup: () => Object.freeze({ count: 0, toMove: 0, log: [] as number[] }),
      applyMove: (state: CounterState & { log: number[] }, move: { add: 1 | 2 }) => {
        state.log.push(move.add);
        return Object.freeze({ ...addStep(state, move.add), log: [...state.log] });
      },
    },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.NoMutation,
    what: "modifies the move it is given",
    game: {
      ...counterGame,
      applyMove: (state: CounterState, move: { add: 1 | 2 }) => {
        (move as { seen?: boolean }).seen = true;
        return addStep(state, move.add);
      },
    },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.NoMutation,
    what: "caches its legal moves inside the state",
    game: {
      ...counterGame,
      legalMoves: (state: CounterState) => {
        const moves = counterGame.legalMoves(state);
        (state as { cache?: unknown }).cache = moves;
        return moves;
      },
    },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.DeterministicSetup,
    what: "has a setup that changes between calls",
    game: { ...counterGame, setup: () => ({ count: 0, toMove: 0, call: nextCall() }) },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.DeterministicApply,
    what: "has an applyMove that changes between calls",
    game: {
      ...counterGame,
      applyMove: (state: CounterState, move: { add: 1 | 2 }) => ({
        ...addStep(state, move.add),
        call: nextCall(),
      }),
    },
    config: COUNTER_CONFIG,
    // Replaying the record calls applyMove again, so the rebuilt states differ too.
    alsoFails: [CONTRACT_CHECK.RecordRoundTrip],
  },
  {
    id: CONTRACT_CHECK.DeterministicApply,
    what: "lists its outcomes in a different order on every call",
    game: {
      ...diceRaceGame,
      outcomes: () => (nextCall() % 2 === 0 ? DICE_FACES : [...DICE_FACES].reverse()),
    },
    config: DICE_CONFIG,
    message: "outcomes of",
  },
  {
    id: CONTRACT_CHECK.DeterministicQueries,
    what: "lists its legal moves in a different order on every other call",
    game: {
      ...counterGame,
      legalMoves: (state: CounterState) => {
        const moves = counterGame.legalMoves(state);
        return nextCall() % 2 === 0 ? moves : [...moves].reverse();
      },
    },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.DeterministicQueries,
    what: "names a different winner on every call",
    game: {
      ...counterGame,
      result: (state: CounterState) =>
        state.count === COUNTER_TARGET ? { kind: "win", winners: [nextCall() % 2] } : null,
    },
    config: COUNTER_CONFIG,
    message: "result gave different answers",
  },
  {
    id: CONTRACT_CHECK.DeterministicQueries,
    what: "names a different player to move on every call",
    game: { ...counterGame, currentPlayer: () => nextCall() % 2 },
    config: COUNTER_CONFIG,
    message: "currentPlayer gave different seats",
  },
  {
    id: CONTRACT_CHECK.Terminates,
    what: "never ends",
    game: { ...counterGame, legalMoves: () => [{ add: 1 }], result: () => null },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.ResultMatchesMoves,
    what: "has no result once moves run out",
    game: { ...counterGame, result: () => null },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.UniqueMoveKeys,
    what: "lists the same move twice",
    game: {
      ...counterGame,
      legalMoves: (state: CounterState) =>
        state.count >= COUNTER_TARGET ? [] : [{ add: 1 }, { add: 1 }],
    },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.PlayersInRange,
    what: "names a player that is not at the table",
    game: { ...counterGame, currentPlayer: () => 5 },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.PlayersInRange,
    what: "declares a winner that is not at the table",
    game: {
      ...counterGame,
      result: (state: CounterState) =>
        state.count === COUNTER_TARGET ? { kind: "win", winners: [7] } : null,
    },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.PlayersInRange,
    what: "declares the same winner twice",
    game: {
      ...counterGame,
      result: (state: CounterState) =>
        state.count === COUNTER_TARGET ? { kind: "win", winners: [0, 0] } : null,
    },
    config: COUNTER_CONFIG,
    message: "duplicate winners",
  },
  {
    id: CONTRACT_CHECK.PlayersInRange,
    what: "declares a win without any winner",
    game: {
      ...counterGame,
      result: (state: CounterState) =>
        state.count === COUNTER_TARGET ? { kind: "win", winners: [] } : null,
    },
    config: COUNTER_CONFIG,
    message: "without any winner",
  },
  {
    id: CONTRACT_CHECK.ValidOutcomes,
    what: "gives outcomes a fractional weight",
    game: { ...diceRaceGame, outcomes: () => DICE_FACES.map((face) => ({ ...face, weight: 1.5 })) },
    config: DICE_CONFIG,
    // The engine refuses to draw from such weights, so the game cannot be played either.
    alsoFails: [CONTRACT_CHECK.Playable],
    message: "outcome weight 1.5 is not a positive integer",
  },
  {
    id: CONTRACT_CHECK.ValidOutcomes,
    what: "lists the same outcome twice",
    game: { ...diceRaceGame, outcomes: () => [...DICE_FACES, { outcome: 6, weight: 1 }] },
    config: DICE_CONFIG,
  },
  {
    id: CONTRACT_CHECK.PlainData,
    what: "keeps a class instance in its state",
    game: { ...counterGame, setup: () => ({ count: 0, toMove: 0, startedAt: new Date(0) }) },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.PlainData,
    what: "keeps a typed array, which cannot even be frozen, in its state",
    game: { ...counterGame, setup: () => ({ count: 0, toMove: 0, bytes: new Uint8Array(2) }) },
    config: COUNTER_CONFIG,
  },
  {
    id: CONTRACT_CHECK.RecordRoundTrip,
    what: "has a parseOptions that changes options it already accepted",
    game: {
      ...diceRaceGame,
      parseOptions: (raw: unknown) => {
        const parsed = diceRaceGame.parseOptions(raw);
        if (parsed === null) return null;
        // Leaves the default (20) alone, so only the rebuilt game sees a different target.
        return { target: parsed.target < 20 ? parsed.target + 1 : parsed.target };
      },
    },
    config: DICE_CONFIG,
    message: "the rebuilt game differs from the original",
  },
  {
    id: CONTRACT_CHECK.RecordRoundTrip,
    what: "keys moves by object identity, which no copy read from JSON can match",
    game: (() => {
      const MOVES = [{ add: 1 }, { add: 2 }] as const;
      const ids = new WeakMap<object, number>();
      let nextId = 0;
      return {
        ...counterGame,
        legalMoves: (state: CounterState) =>
          MOVES.filter((move) => state.count + move.add <= COUNTER_TARGET),
        moveKey: (move: object) => {
          const id = ids.get(move) ?? (nextId += 1);
          ids.set(move, id);
          return String(id);
        },
      };
    })(),
    config: COUNTER_CONFIG,
    message: "fromRecord failed with corrupt-record",
  },
  {
    id: CONTRACT_CHECK.AiHasEvaluate,
    what: "claims AI support without evaluate",
    game: { ...counterGame, meta: { ...counterGame.meta, supportsAI: true } },
    config: COUNTER_CONFIG,
  },
];

describe("contract checks on broken games", () => {
  it("cover every check", () => {
    expect(new Set(BROKEN_GAMES.map((broken) => broken.id))).toEqual(
      new Set(Object.values(CONTRACT_CHECK)),
    );
  });

  it.each(BROKEN_GAMES)(
    "$id fails, and no unrelated check does, for a game that $what",
    ({ id, game, config, alsoFails = [], message = "" }) => {
      expect(() => {
        check(id).run(game, config);
      }).toThrow(`[${id}]`);
      expect(() => {
        check(id).run(game, config);
      }).toThrow(message);
      expect(failingChecks(game, config).sort()).toEqual([id, ...alsoFails].sort());
    },
  );

  it("names the game played when a violation happens during play", () => {
    const mutating = BROKEN_GAMES.find((broken) => broken.id === CONTRACT_CHECK.NoMutation);
    if (mutating === undefined) throw new Error("missing broken game");

    expect(() => {
      check(CONTRACT_CHECK.NoMutation).run(mutating.game, mutating.config);
    }).toThrow(/seed 1, 2 players/);
  });

  it("plays every player count the game allows when none are given", () => {
    const seen = new Set<number>();
    const recording = {
      ...diceRaceGame,
      setup: (context: { playerCount: number; options: { target: number } }): DiceRaceState => {
        seen.add(context.playerCount);
        return diceRaceGame.setup(context);
      },
    };

    check(CONTRACT_CHECK.Playable).run(recording, { seeds: [1], maxPlies: 200 });

    expect([...seen].sort()).toEqual([2, 3, 4]);
  });
});
