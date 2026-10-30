import { describe, expect, it } from "vitest";

import { fromRecord, toRecord } from "./record";
import { createRng } from "./rng";
import { createSession, currentState, playMove, undo } from "./session";
import { counterGame, type CounterMove, type CounterState } from "./test-fixtures/counter-game";
import { DICE_FACES, diceRaceGame } from "./test-fixtures/dice-race-game";
import { unwrap } from "./test-fixtures/unwrap";
import type { GameDefinition } from "./types";

function rolledDiceSession(rolls: number, seed = 8) {
  const rng = createRng(seed);
  let session = unwrap(createSession(diceRaceGame, { playerCount: 3, options: { target: 100 } }));
  for (let turn = 0; turn < rolls; turn += 1) {
    session = unwrap(playMove(diceRaceGame, session, { type: "roll" }, rng));
  }
  return session;
}

function viaJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

const CORRUPT = { ok: false, error: "corrupt-record" };

describe("toRecord and fromRecord", () => {
  it("rebuild the same state, history and player to move after a JSON round trip", () => {
    const session = rolledDiceSession(5);
    const rebuilt = unwrap(fromRecord(diceRaceGame, viaJson(toRecord(session))));

    expect(currentState(rebuilt)).toEqual(currentState(session));
    expect(rebuilt.entries).toEqual(session.entries);
    expect(diceRaceGame.currentPlayer(currentState(rebuilt))).toBe(
      diceRaceGame.currentPlayer(currentState(session)),
    );
  });

  it("leave undone moves out of the record", () => {
    let session = unwrap(createSession(counterGame, { playerCount: 2 }));
    for (const move of [{ add: 1 }, { add: 2 }, { add: 1 }]) {
      session = unwrap(playMove(counterGame, session, move, createRng(0)));
    }
    const record = toRecord(unwrap(undo(session)));

    expect(record.entries).toEqual([{ move: { add: 1 } }, { move: { add: 2 } }]);
  });

  it("replay stored outcomes without rolling again", () => {
    const session = rolledDiceSession(1);
    const firstRoll = session.entries[0]?.outcome;
    const rebuilt = unwrap(fromRecord(diceRaceGame, viaJson(toRecord(session))));

    expect(rebuilt.entries[0]?.outcome).toBe(firstRoll);
  });

  it("keep no seed or generator state in the record", () => {
    const record = toRecord(rolledDiceSession(4));

    expect(Object.keys(record).sort()).toEqual([
      "entries",
      "gameId",
      "options",
      "playerCount",
      "version",
    ]);
    for (const entry of record.entries)
      expect(Object.keys(entry).sort()).toEqual(["move", "outcome"]);
  });

  it("reject a record of another game", () => {
    const record = toRecord(rolledDiceSession(1));

    expect(fromRecord(counterGame, viaJson(record))).toEqual({ ok: false, error: "game-mismatch" });
  });

  it("reject a record format version they do not support", () => {
    const record = { ...toRecord(rolledDiceSession(1)), version: 2 };

    expect(fromRecord(diceRaceGame, record)).toEqual({
      ok: false,
      error: "unsupported-record-version",
    });
  });
});

describe("fromRecord with untrusted data", () => {
  const valid = toRecord(rolledDiceSession(2));

  it.each([
    ["not an object", "hello"],
    ["null", null],
    ["an array", [valid]],
    ["no version", { ...valid, version: undefined }],
    ["entries not an array", { ...valid, entries: {} }],
    ["no game id", { ...valid, gameId: 7 }],
    ["an entry that is not an object", { ...valid, entries: [42] }],
    ["an entry without a move", { ...valid, entries: [{ outcome: 3 }] }],
  ])("rejects a record with %s", (_label, raw) => {
    expect(fromRecord(diceRaceGame, raw)).toEqual(CORRUPT);
  });

  it("rejects a player count outside the game's range", () => {
    expect(fromRecord(diceRaceGame, { ...valid, playerCount: 9 })).toEqual(CORRUPT);
  });

  it("rejects options the game refuses", () => {
    expect(fromRecord(diceRaceGame, { ...valid, options: { target: -1 } })).toEqual(CORRUPT);
  });

  it("rejects a move that was not legal at its point in the game", () => {
    expect(
      fromRecord(counterGame, {
        version: 1,
        gameId: "counter",
        playerCount: 2,
        options: {},
        entries: [{ move: { add: 3 } }],
      }),
    ).toEqual(CORRUPT);
  });

  it("rejects a move after the game has ended", () => {
    const entries = Array.from({ length: 6 }, () => ({ move: { add: 2 } }));

    expect(
      fromRecord(counterGame, {
        version: 1,
        gameId: "counter",
        playerCount: 2,
        options: {},
        entries,
      }),
    ).toEqual(CORRUPT);
  });

  it("rejects a roll with no outcome", () => {
    expect(fromRecord(diceRaceGame, { ...valid, entries: [{ move: { type: "roll" } }] })).toEqual(
      CORRUPT,
    );
  });

  it("rejects an outcome that cannot happen, like 7 on a six-sided die", () => {
    expect(
      fromRecord(diceRaceGame, { ...valid, entries: [{ move: { type: "roll" }, outcome: 7 }] }),
    ).toEqual(CORRUPT);
  });

  it("rejects an outcome on a move that has no randomness", () => {
    expect(
      fromRecord(counterGame, {
        version: 1,
        gameId: "counter",
        playerCount: 2,
        options: {},
        entries: [{ move: { add: 1 }, outcome: 4 }],
      }),
    ).toEqual(CORRUPT);
  });

  it("returns corrupt-record instead of throwing when the rules throw during replay", () => {
    const throwingGame = {
      ...diceRaceGame,
      applyMove: () => {
        throw new Error("rules exploded");
      },
    };

    expect(fromRecord(throwingGame, viaJson(valid))).toEqual(CORRUPT);
  });

  it("rejects a stored outcome whose weight is 0, which play can never produce", () => {
    const loaded = {
      ...diceRaceGame,
      outcomes: () => [...DICE_FACES, { outcome: 7, weight: 0 }],
    };

    expect(
      fromRecord(loaded, { ...valid, entries: [{ move: { type: "roll" }, outcome: 7 }] }),
    ).toEqual(CORRUPT);
  });

  const { proxy: revoked, revoke } = Proxy.revocable({}, {});
  revoke();

  it.each([
    [
      "a getter that throws",
      {
        get version(): number {
          throw new Error("getter");
        },
      },
    ],
    [
      "a Proxy whose getPrototypeOf trap throws",
      new Proxy(
        {},
        {
          getPrototypeOf: () => {
            throw new Error("trap");
          },
        },
      ),
    ],
    ["a revoked Proxy", revoked],
  ])("returns corrupt-record instead of throwing for data with %s", (_label, raw) => {
    expect(fromRecord(diceRaceGame, raw)).toEqual(CORRUPT);
  });

  it("rebuilds a long record in linear time", () => {
    // Never ends, so every one of the entries is legal.
    const endless = {
      ...counterGame,
      id: "endless",
      legalMoves: () => [{ add: 1 }],
      result: () => null,
    } as const satisfies GameDefinition<CounterState, CounterMove>;
    const entries = Array.from({ length: 50_000 }, () => ({ move: { add: 1 } }));

    const started = performance.now();
    const rebuilt = unwrap(
      fromRecord(endless, { version: 1, gameId: "endless", playerCount: 2, options: {}, entries }),
    );

    // Copying the history per entry took about 15 s here; linear replay takes well under 0.5 s.
    expect(performance.now() - started).toBeLessThan(2000);
    expect(rebuilt.cursor).toBe(50_000);
    expect(currentState(rebuilt).count).toBe(50_000);
  });
});
