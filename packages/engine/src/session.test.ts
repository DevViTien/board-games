import { describe, expect, expectTypeOf, it } from "vitest";

import { fromRecord, toRecord } from "./record";
import { createRng } from "./rng";
import {
  activeEntries,
  applyEntry,
  canRedo,
  canUndo,
  createSession,
  currentState,
  lastEntry,
  playMove,
  redo,
  sessionResult,
  undo,
} from "./session";
import { counterGame, type CounterMove } from "./test-fixtures/counter-game";
import { DICE_FACES, diceRaceGame, diceRaceRules } from "./test-fixtures/dice-race-game";
import { unwrap } from "./test-fixtures/unwrap";
import { deepFreeze } from "./testing/deep-freeze";
import type { HistoryEntry } from "./types";

const rng = createRng(1);

function counterSession() {
  return unwrap(createSession(counterGame, { playerCount: 2 }));
}

/** A dice race long enough that a dozen rolls never finish it. */
function diceSession() {
  return unwrap(createSession(diceRaceGame, { playerCount: 2, options: { target: 100 } }));
}

/** Plays `moves` in order, failing the test on the first rejected move. */
function playAll(session: ReturnType<typeof counterSession>, moves: readonly unknown[]) {
  return moves.reduce<ReturnType<typeof counterSession>>(
    (current, move) => unwrap(playMove(counterGame, current, move, rng)),
    session,
  );
}

describe("game declaration", () => {
  // The menu reads the declaration on the server and hands it to the client, so it must be static
  // plain data rather than something computed by the rules.
  it("is plain data, readable and serializable while every rule would throw", () => {
    const explode = () => {
      throw new Error("no rule may run");
    };
    const game = {
      ...counterGame,
      setup: explode,
      currentPlayer: explode,
      legalMoves: explode,
      applyMove: explode,
      result: explode,
    };
    const { id, meta, defaultOptions } = game;

    expect(JSON.parse(JSON.stringify({ id, meta, defaultOptions }))).toEqual({
      id: "counter",
      meta: {
        players: { min: 2, max: 2 },
        category: "original",
        durationMinutes: 1,
        supportsAI: false,
      },
      defaultOptions: {},
    });
  });
});

describe("createSession", () => {
  it("creates a game with no moves and exactly one player to move", () => {
    const session = unwrap(createSession(diceRaceGame, { playerCount: 3 }));

    expect(session.entries).toEqual([]);
    expect(canUndo(session)).toBe(false);
    expect(diceRaceGame.currentPlayer(currentState(session))).toBe(0);
    expect(currentState(session).positions).toHaveLength(3);
  });

  it("rejects a player count outside the declared range", () => {
    expect(createSession(counterGame, { playerCount: 3 })).toEqual({
      ok: false,
      error: "invalid-player-count",
    });
    expect(createSession(diceRaceGame, { playerCount: 1.5 })).toEqual({
      ok: false,
      error: "invalid-player-count",
    });
  });

  it("uses the default options when none are given", () => {
    const session = unwrap(createSession(diceRaceGame, { playerCount: 2 }));

    expect(session.options).toEqual({ target: 20 });
    expect(currentState(session).target).toBe(20);
  });

  it("uses the default options of a game that has some but no parseOptions", () => {
    const session = unwrap(createSession(diceRaceRules, { playerCount: 2 }));

    expect(session.options).toEqual({ target: 20 });
    expect(
      unwrap(fromRecord(diceRaceRules, JSON.parse(JSON.stringify(toRecord(session))))),
    ).toEqual(session);
  });

  it("rejects options the game does not accept", () => {
    expect(createSession(diceRaceGame, { playerCount: 2, options: { target: 1 } })).toEqual({
      ok: false,
      error: "invalid-options",
    });
    expect(createSession(diceRaceRules, { playerCount: 2, options: { target: 12 } })).toEqual({
      ok: false,
      error: "invalid-options",
    });
  });

  it("types the history of a game without randomness as having no outcome", () => {
    const session = counterSession();

    expectTypeOf(lastEntry(session)).toEqualTypeOf<HistoryEntry<CounterMove, never> | null>();
  });

  it("always creates the same initial state for the same inputs", () => {
    const a = unwrap(createSession(diceRaceGame, { playerCount: 4, options: { target: 9 } }));
    const b = unwrap(createSession(diceRaceGame, { playerCount: 4, options: { target: 9 } }));

    expect(a).toEqual(b);
  });
});

describe("playMove", () => {
  it("applies a legal move and appends it to the history", () => {
    const session = unwrap(playMove(counterGame, counterSession(), { add: 2 }, rng));

    expect(currentState(session)).toEqual({ count: 2, toMove: 1 });
    expect(session.entries).toEqual([{ move: { add: 2 } }]);
  });

  it("rejects an illegal move and leaves the session unchanged", () => {
    const session = playAll(counterSession(), [{ add: 2 }, { add: 2 }, { add: 2 }, { add: 2 }]);
    const before = structuredClone(session);

    expect(playMove(counterGame, session, { add: 3 }, rng)).toEqual({
      ok: false,
      error: "illegal-move",
    });
    expect(playMove(counterGame, session, "nonsense", rng)).toEqual({
      ok: false,
      error: "illegal-move",
    });
    expect(session).toEqual(before);
  });

  it("stores the rules' own move, not extra fields from the input", () => {
    const session = unwrap(
      playMove(counterGame, counterSession(), { add: 1, injected: "<script>" }, rng),
    );

    expect(session.entries[0]?.move).toEqual({ add: 1 });
  });

  it("treats a moveKey that throws on garbage input as an illegal move", () => {
    expect(playMove(counterGame, counterSession(), null, rng)).toEqual({
      ok: false,
      error: "illegal-move",
    });
  });

  it("reports the winner and rejects every move after the end", () => {
    const finished = playAll(counterSession(), [
      { add: 2 },
      { add: 2 },
      { add: 2 },
      { add: 2 },
      { add: 2 },
    ]);

    expect(sessionResult(counterGame, finished)).toEqual({ kind: "win", winners: [0] });
    expect(playMove(counterGame, finished, { add: 1 }, rng)).toEqual({
      ok: false,
      error: "game-over",
    });
  });

  it("rejects a session of another game instead of judging the move by the wrong rules", () => {
    const otherGame = { ...counterGame, id: "other-counter" };

    expect(playMove(otherGame, counterSession(), { add: 1 }, rng)).toEqual({
      ok: false,
      error: "game-mismatch",
    });
  });
});

describe("applyEntry", () => {
  it("applies an entry played elsewhere with its locked outcome (it takes no generator)", () => {
    const rolled = unwrap(playMove(diceRaceGame, diceSession(), { type: "roll" }, createRng(6)));
    const entry: unknown = JSON.parse(JSON.stringify(rolled.entries[0]));

    expect(unwrap(applyEntry(diceRaceGame, diceSession(), entry))).toEqual(rolled);
  });

  it("applies a move without randomness", () => {
    const applied = unwrap(applyEntry(counterGame, counterSession(), { move: { add: 2 } }));

    expect(currentState(applied)).toEqual({ count: 2, toMove: 1 });
  });

  it.each([
    ["not an object", 42],
    ["no move", { outcome: 3 }],
    ["an illegal move", { move: { type: "jump" }, outcome: 3 }],
    ["no outcome on a random move", { move: { type: "roll" } }],
    ["an outcome the move cannot have", { move: { type: "roll" }, outcome: 7 }],
  ])("rejects an entry with %s as an illegal move", (_label, entry) => {
    expect(applyEntry(diceRaceGame, diceSession(), entry)).toEqual({
      ok: false,
      error: "illegal-move",
    });
  });

  it("rejects an outcome on a move without randomness", () => {
    expect(applyEntry(counterGame, counterSession(), { move: { add: 1 }, outcome: 1 })).toEqual({
      ok: false,
      error: "illegal-move",
    });
  });

  it("rejects entries after the end and entries for another game", () => {
    const finished = playAll(
      counterSession(),
      Array.from({ length: 5 }, () => ({ add: 2 })),
    );

    expect(applyEntry(counterGame, finished, { move: { add: 1 } })).toEqual({
      ok: false,
      error: "game-over",
    });
    expect(
      applyEntry({ ...counterGame, id: "other-counter" }, counterSession(), { move: { add: 1 } }),
    ).toEqual({ ok: false, error: "game-mismatch" });
  });

  it("returns illegal-move instead of throwing when the rules or the data throw", () => {
    const throwingGame = {
      ...counterGame,
      applyMove: () => {
        throw new Error("rules exploded");
      },
    };
    const hostile = new Proxy(
      {},
      {
        getPrototypeOf: () => {
          throw new Error("trap");
        },
      },
    );

    expect(applyEntry(throwingGame, counterSession(), { move: { add: 1 } })).toEqual({
      ok: false,
      error: "illegal-move",
    });
    expect(applyEntry(counterGame, counterSession(), hostile)).toEqual({
      ok: false,
      error: "illegal-move",
    });
  });
});

describe("activeEntries and lastEntry", () => {
  it("leave out undone moves", () => {
    const undone = unwrap(undo(playAll(counterSession(), [{ add: 1 }, { add: 2 }])));

    expect(undone.entries).toHaveLength(2);
    expect(activeEntries(undone)).toEqual([{ move: { add: 1 } }]);
    expect(lastEntry(undone)).toEqual({ move: { add: 1 } });
  });

  it("give nothing before the first move", () => {
    expect(activeEntries(counterSession())).toEqual([]);
    expect(lastEntry(counterSession())).toBeNull();
  });
});

describe("undo and redo", () => {
  it("undoes to the state after the first move and redoes to the state after the second", () => {
    const afterOne = playAll(counterSession(), [{ add: 1 }]);
    const afterTwo = playAll(afterOne, [{ add: 2 }]);

    const undone = unwrap(undo(afterTwo));
    expect(currentState(undone)).toEqual(currentState(afterOne));
    expect(canRedo(undone)).toBe(true);

    const redone = unwrap(redo(undone));
    expect(currentState(redone)).toEqual(currentState(afterTwo));
    expect(canRedo(redone)).toBe(false);
  });

  it("drops the undone moves when a new move is played", () => {
    const undone = unwrap(undo(playAll(counterSession(), [{ add: 1 }])));
    const branched = playAll(undone, [{ add: 2 }]);

    expect(canRedo(branched)).toBe(false);
    expect(branched.entries).toEqual([{ move: { add: 2 } }]);
    expect(branched.states).toHaveLength(2);
  });

  it("returns nothing-to-undo at the start and leaves the session unchanged", () => {
    const session = counterSession();

    expect(undo(session)).toEqual({ ok: false, error: "nothing-to-undo" });
    expect(canUndo(session)).toBe(false);
  });

  it("returns nothing-to-redo when nothing was undone", () => {
    const session = playAll(counterSession(), [{ add: 1 }]);

    expect(redo(session)).toEqual({ ok: false, error: "nothing-to-redo" });
  });

  it("can undo the winning move, which reopens the game", () => {
    const finished = playAll(
      counterSession(),
      Array.from({ length: 5 }, () => ({ add: 2 })),
    );
    const reopened = unwrap(undo(finished));

    expect(sessionResult(counterGame, reopened)).toBeNull();
    expect(counterGame.currentPlayer(currentState(reopened))).toBe(0);
  });
});

describe("randomness", () => {
  function rollTimes(times: number, seed: number) {
    const roller = createRng(seed);
    let session = diceSession();
    for (let turn = 0; turn < times; turn += 1) {
      session = unwrap(playMove(diceRaceGame, session, { type: "roll" }, roller));
    }
    return session;
  }

  it("gives the same outcomes for the same generator values and moves", () => {
    expect(rollTimes(8, 123).entries).toEqual(rollTimes(8, 123).entries);
  });

  it("locks the outcome into the move and picks only declared outcomes", () => {
    const session = rollTimes(12, 5);

    for (const entry of session.entries) {
      expect([1, 2, 3, 4, 5, 6]).toContain(entry.outcome);
    }
  });

  it("does not roll again on redo", () => {
    const rolled = rollTimes(1, 77);
    const outcome = rolled.entries[0]?.outcome;
    const redone = unwrap(redo(unwrap(undo(rolled))));

    expect(redone.entries[0]?.outcome).toBe(outcome);
    expect(currentState(redone)).toEqual(currentState(rolled));
  });

  it("keeps no generator state in the session", () => {
    expect(Object.keys(rollTimes(3, 9)).sort()).toEqual([
      "cursor",
      "entries",
      "gameId",
      "options",
      "playerCount",
      "states",
    ]);
  });

  it.each([
    ["0", 0],
    ["fractional", 1.5],
  ])("refuses to draw when the rules give an outcome a %s weight", (_label, weight) => {
    const skewed = { ...diceRaceGame, outcomes: () => [...DICE_FACES, { outcome: 7, weight }] };

    expect(() => playMove(skewed, diceSession(), { type: "roll" }, createRng(1))).toThrow(
      /weight .* is not a positive integer/,
    );
  });

  it("names the generator, not the weights, when the generator returns a value out of range", () => {
    const faulty = { nextInt: () => 6, nextFloat: () => 0 };

    expect(() => playMove(diceRaceGame, diceSession(), { type: "roll" }, faulty)).toThrow(
      "Rng.nextInt(0, 5) returned 6",
    );
  });
});

describe("immutability and plain data", () => {
  it("never modifies an earlier state", () => {
    const start = deepFreeze(diceSession());
    const snapshot = structuredClone(currentState(start));

    const next = unwrap(playMove(diceRaceGame, start, { type: "roll" }, createRng(3)));

    expect(currentState(start)).toEqual(snapshot);
    expect(currentState(next)).not.toEqual(snapshot);
  });

  it("survives a JSON round trip and keeps playing, undoing and redoing the same way", () => {
    const original = unwrap(playMove(diceRaceGame, diceSession(), { type: "roll" }, createRng(11)));
    const copy = JSON.parse(JSON.stringify(original)) as typeof original;

    const nextOriginal = unwrap(playMove(diceRaceGame, original, { type: "roll" }, createRng(4)));
    const nextCopy = unwrap(playMove(diceRaceGame, copy, { type: "roll" }, createRng(4)));
    expect(nextCopy).toEqual(nextOriginal);
    expect(unwrap(undo(nextCopy))).toEqual(unwrap(undo(nextOriginal)));
    expect(unwrap(redo(unwrap(undo(nextCopy))))).toEqual(nextOriginal);
  });
});
