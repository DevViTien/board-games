import { describe, expect, it } from "vitest";

import { ENDING_REASON } from "./constants";
import { fromRecord, toRecord } from "./record";
import { createRng } from "./rng";
import {
  applyEntry,
  canRedo,
  canUndo,
  concede,
  createSession,
  playMove,
  redo,
  sessionResult,
  undo,
} from "./session";
import { counterGame } from "./test-fixtures/counter-game";
import { diceRaceGame } from "./test-fixtures/dice-race-game";
import { unwrap } from "./test-fixtures/unwrap";

const rng = createRng(3);

function counterAfter(...adds: (1 | 2)[]) {
  return adds.reduce(
    (session, add) => unwrap(playMove(counterGame, session, { add }, rng)),
    unwrap(createSession(counterGame, { playerCount: 2 })),
  );
}

function diceRace(playerCount: number, rolls: number) {
  let session = unwrap(createSession(diceRaceGame, { playerCount, options: { target: 100 } }));
  for (let roll = 0; roll < rolls; roll += 1) {
    session = unwrap(playMove(diceRaceGame, session, { type: "roll" }, rng));
  }
  return session;
}

function viaJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

const RESIGNED = { reason: ENDING_REASON.Resigned, player: 0 } as const;

describe("concede", () => {
  it("lets every other seat of a two-player game win with the reason", () => {
    const ended = unwrap(concede(counterGame, counterAfter(1, 2), RESIGNED));

    expect(sessionResult(counterGame, ended)).toEqual({
      kind: "win",
      winners: [1],
      reason: "resigned",
    });
    expect(ended.entries).toHaveLength(2);
  });

  it("lets every other seat of a four-player game win when one abandons it", () => {
    const ended = unwrap(
      concede(diceRaceGame, diceRace(4, 3), { reason: ENDING_REASON.Abandoned, player: 1 }),
    );

    expect(sessionResult(diceRaceGame, ended)).toEqual({
      kind: "win",
      winners: [0, 2, 3],
      reason: "abandoned",
    });
  });

  it("refuses every move afterwards, played or received", () => {
    const before = counterAfter(1);
    const ended = unwrap(concede(counterGame, before, RESIGNED));

    expect(playMove(counterGame, ended, { add: 1 }, rng)).toEqual({
      ok: false,
      error: "game-over",
    });
    expect(applyEntry(counterGame, ended, { move: { add: 1 } })).toEqual({
      ok: false,
      error: "game-over",
    });
  });

  it("refuses a game that has a result already, by its rules or by an ending", () => {
    const won = counterAfter(2, 2, 2, 2, 2);
    expect(sessionResult(counterGame, won)).not.toBeNull();

    expect(concede(counterGame, won, RESIGNED)).toEqual({ ok: false, error: "game-over" });
    const ended = unwrap(concede(counterGame, counterAfter(1), RESIGNED));
    expect(concede(counterGame, ended, { ...RESIGNED, player: 1 })).toEqual({
      ok: false,
      error: "game-over",
    });
  });

  it("refuses a seat that is not in the game", () => {
    const session = counterAfter(1);

    for (const player of [2, -1, 0.5, Number.NaN]) {
      expect(concede(counterGame, session, { ...RESIGNED, player })).toEqual({
        ok: false,
        error: "illegal-move",
      });
    }
    expect(
      concede(counterGame, session, { reason: "timeout" as typeof RESIGNED.reason, player: 0 }),
    ).toEqual({ ok: false, error: "illegal-move" });
  });

  it("drops the undone moves first, as a new move would", () => {
    const undone = unwrap(undo(counterAfter(1, 2)));
    const ended = unwrap(concede(counterGame, undone, RESIGNED));

    expect(ended.entries).toEqual([{ move: { add: 1 } }]);
    expect(ended.states).toHaveLength(2);
    expect(sessionResult(counterGame, ended)?.reason).toBe("resigned");
  });

  it("cannot be undone or redone", () => {
    const ended = unwrap(concede(counterGame, counterAfter(1, 2), RESIGNED));

    expect(canUndo(ended)).toBe(false);
    expect(canRedo(ended)).toBe(false);
    expect(undo(ended)).toEqual({ ok: false, error: "game-over" });
    expect(redo(ended)).toEqual({ ok: false, error: "game-over" });
    expect(sessionResult(counterGame, ended)?.reason).toBe("resigned");
  });

  it("only ends a session cut before its last entry once every entry is shown", () => {
    const ended = unwrap(concede(counterGame, counterAfter(1, 2), RESIGNED));

    expect(sessionResult(counterGame, { ...ended, cursor: 1 })).toBeNull();
    expect(sessionResult(counterGame, { ...ended, cursor: 2 })?.kind).toBe("win");
  });
});

describe("concede in a cooperative game", () => {
  const cooperativeRace = {
    ...diceRaceGame,
    meta: { ...diceRaceGame.meta, cooperative: true },
  };

  it("Bỏ cuộc trong game cùng phe: stops a game of three, nobody winning, with the reason", () => {
    let session = unwrap(
      createSession(cooperativeRace, { playerCount: 3, options: { target: 100 } }),
    );
    session = unwrap(playMove(cooperativeRace, session, { type: "roll" }, rng));
    const ended = unwrap(concede(cooperativeRace, session, { reason: "resigned", player: 1 }));

    expect(sessionResult(cooperativeRace, ended)).toEqual({ kind: "draw", reason: "resigned" });
  });

  it("keeps the ending through a record", () => {
    const ended = unwrap(
      concede(cooperativeRace, diceRace(2, 2), { reason: ENDING_REASON.Abandoned, player: 0 }),
    );
    const rebuilt = unwrap(fromRecord(cooperativeRace, viaJson(toRecord(ended))));

    expect(rebuilt.ending).toEqual({ reason: "abandoned", player: 0 });
    expect(sessionResult(cooperativeRace, rebuilt)).toEqual({ kind: "draw", reason: "abandoned" });
  });
});

describe("a record with an ending", () => {
  it("keeps the moves and the result through JSON", () => {
    const ended = unwrap(concede(diceRaceGame, diceRace(2, 4), RESIGNED));
    const rebuilt = unwrap(fromRecord(diceRaceGame, viaJson(toRecord(ended))));

    expect(rebuilt.entries).toEqual(ended.entries);
    expect(rebuilt.ending).toEqual(RESIGNED);
    expect(sessionResult(diceRaceGame, rebuilt)).toEqual({
      kind: "win",
      winners: [1],
      reason: "resigned",
    });
  });

  it("is not added to a record of a game that did not end that way", () => {
    expect(toRecord(counterAfter(1))).not.toHaveProperty("ending");
  });

  it.each([
    ["a fifth player", { reason: "resigned", player: 4 }],
    ["an unknown reason", { reason: "bored", player: 0 }],
    ["a seat that is not a whole number", { reason: "resigned", player: "0" }],
    ["something that is not an object", "resigned"],
  ])("is refused as corrupt when it names %s", (_, ending) => {
    const record = { ...toRecord(counterAfter(1)), ending };

    expect(fromRecord(counterGame, record)).toEqual({ ok: false, error: "corrupt-record" });
  });

  it("is refused as corrupt after a position the rules have already ended", () => {
    const record = { ...toRecord(counterAfter(2, 2, 2, 2, 2)), ending: RESIGNED };

    expect(fromRecord(counterGame, record)).toEqual({ ok: false, error: "corrupt-record" });
  });
});
