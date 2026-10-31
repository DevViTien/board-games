import { createRng, createSession, playMove, toRecord } from "@board-games/engine";
import { tictactoe } from "@board-games/games";
import { describe, expect, it } from "vitest";

import { createMapKeyValue } from "@/test/map-key-value";

import { createIndexedDbStore } from "./indexeddb-store";
import { migrateLegacySaves } from "./migrate-legacy-saves";
import { type KeyValueStore, toSavedGame } from "./saved-game";

function record(...cells: number[]) {
  const created = createSession(tictactoe, { playerCount: 2 });
  if (!created.ok) throw new Error(created.error);
  let session = created.value;
  for (const cell of cells) {
    const played = playMove(tictactoe, session, { cell }, createRng(1));
    if (!played.ok) throw new Error(played.error);
    session = played.value;
  }
  return toRecord(session);
}

/** A same-device game as M1 saved it, under the bare game id. */
function legacySave(savedAt: string, saved = record(4)) {
  return { version: 1, savedAt, mode: { kind: "local" }, record: saved };
}

function currentSave(savedAt: string, saved = record(0)) {
  return toSavedGame({ settings: { kind: "local" }, record: saved, inProgress: true }, savedAt);
}

const EARLIER = "2026-10-29T10:00:00.000Z";
const LATER = "2026-10-30T10:00:00.000Z";

describe("migrateLegacySaves", () => {
  it("moves a legacy game to its same-device slot and drops the legacy key", async () => {
    const kv = createMapKeyValue({ tictactoe: legacySave(EARLIER) });

    await migrateLegacySaves(kv);

    expect(Object.fromEntries(kv.entries)).toEqual({
      "tictactoe:local": {
        version: 2,
        savedAt: EARLIER,
        inProgress: true,
        mode: { kind: "local" },
        record: record(4),
      },
    });
  });

  it("replaces the slot's game when the legacy one was saved later", async () => {
    const kv = createMapKeyValue({
      tictactoe: legacySave(LATER),
      "tictactoe:local": currentSave(EARLIER),
    });

    await migrateLegacySaves(kv);

    expect(Object.fromEntries(kv.entries)).toEqual({
      "tictactoe:local": currentSave(LATER, record(4)),
    });
  });

  it("only drops the legacy key when the slot's game was saved later", async () => {
    const kv = createMapKeyValue({
      tictactoe: legacySave(EARLIER),
      "tictactoe:local": currentSave(LATER),
    });

    await migrateLegacySaves(kv);

    expect(Object.fromEntries(kv.entries)).toEqual({ "tictactoe:local": currentSave(LATER) });
  });

  it("touches neither when the slot holds data of a newer version", async () => {
    const initial = {
      tictactoe: legacySave(LATER),
      "tictactoe:local": { version: 3, savedAt: EARLIER, future: "format" },
    };
    const kv = createMapKeyValue(initial);

    await migrateLegacySaves(kv);

    expect(Object.fromEntries(kv.entries)).toEqual(initial);
  });

  it("drops an unreadable legacy save", async () => {
    const kv = createMapKeyValue({ tictactoe: { version: 1, junk: true } });

    await migrateLegacySaves(kv);

    expect(kv.entries.size).toBe(0);
  });

  it("keeps a legacy key written by a newer version", async () => {
    const initial = {
      tictactoe: { version: 2, savedAt: LATER, future: "format" },
      gomoku: { ...legacySave(LATER), record: { ...record(4), version: 2 } },
    };
    const kv = createMapKeyValue(initial);

    await migrateLegacySaves(kv);

    expect(Object.fromEntries(kv.entries)).toEqual(initial);
  });
});

describe("createIndexedDbStore with legacy saves", () => {
  it("lists a legacy game right away", async () => {
    const store = createIndexedDbStore(createMapKeyValue({ tictactoe: legacySave(EARLIER) }));

    expect(await store.listInProgress()).toEqual([
      { gameId: "tictactoe", mode: "local", settings: { kind: "local" }, savedAt: EARLIER },
    ]);
  });

  it("restores a legacy game from the same-device slot", async () => {
    const store = createIndexedDbStore(createMapKeyValue({ tictactoe: legacySave(EARLIER) }));

    expect(await store.load({ gameId: "tictactoe", mode: "local" })).toEqual({
      settings: { kind: "local" },
      record: record(4),
    });
  });

  it("keeps working when moving legacy saves fails", async () => {
    const map = createMapKeyValue({ tictactoe: legacySave(EARLIER) });
    let failing = true;
    const kv: KeyValueStore = {
      ...map,
      keys: () => (failing ? Promise.reject(new Error("blocked")) : map.keys()),
    };
    const store = createIndexedDbStore(kv);

    expect(await store.load({ gameId: "tictactoe", mode: "local" })).toBeUndefined();
    failing = false;
    await store.save(
      { gameId: "tictactoe", mode: "ai" },
      {
        settings: {
          kind: "ai",
          first: "human",
          seats: [{ kind: "human" }, { kind: "ai", level: "easy" }],
        },
        record: record(4),
        inProgress: true,
      },
    );
    expect(await store.listInProgress()).toEqual([
      expect.objectContaining({ gameId: "tictactoe", mode: "ai" }),
    ]);
    // Left for the next visit.
    expect(map.entries.get("tictactoe")).toEqual(legacySave(EARLIER));
  });

  it("never brings back a legacy game once the same-device slot was cleared", async () => {
    const kv = createMapKeyValue({ tictactoe: legacySave(EARLIER) });
    const store = createIndexedDbStore(kv);
    await store.listInProgress();
    // An M1 tab still open saves its game again under the legacy key.
    kv.entries.set("tictactoe", legacySave(LATER));

    await store.clear({ gameId: "tictactoe", mode: "local" });

    expect(kv.entries.size).toBe(0);
    expect(await createIndexedDbStore(kv).listInProgress()).toEqual([]);
  });

  it("keeps a legacy game that could not be moved when the same-device slot is cleared", async () => {
    const map = createMapKeyValue({ tictactoe: legacySave(EARLIER, record(4, 0)) });
    // Writing fails, so the legacy game cannot be moved, and was never listed nor asked about.
    const kv: KeyValueStore = { ...map, set: () => Promise.reject(new Error("blocked")) };
    const store = createIndexedDbStore(kv);
    expect(await store.listInProgress()).toEqual([]);

    // A new same-device game starts; its empty board clears the slot.
    await store.clear({ gameId: "tictactoe", mode: "local" });

    // Left for the next visit, which moves it.
    expect(map.entries.get("tictactoe")).toEqual(legacySave(EARLIER, record(4, 0)));
  });

  it("keeps a legacy key of a newer version when clearing the same-device slot", async () => {
    const newer = { version: 2, savedAt: LATER, future: "format" };
    const kv = createMapKeyValue({ tictactoe: newer });

    await createIndexedDbStore(kv).clear({ gameId: "tictactoe", mode: "local" });

    expect(kv.entries.get("tictactoe")).toEqual(newer);
  });
});
