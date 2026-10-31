import { createRng, createSession, playMove, toRecord } from "@board-games/engine";
import { tictactoe } from "@board-games/games";
import { describe, expect, it } from "vitest";

import { createMapKeyValue } from "@/test/map-key-value";

import { createIndexedDbStore } from "./indexeddb-store";
import { toSavedGame } from "./saved-game";
import type { ModeSettings, SaveSlot } from "./types";

function sampleRecord() {
  const created = createSession(tictactoe, { playerCount: 2 });
  if (!created.ok) throw new Error(created.error);
  const played = playMove(tictactoe, created.value, { cell: 4 }, createRng(1));
  if (!played.ok) throw new Error(played.error);
  return toRecord(played.value);
}

const LOCAL: SaveSlot = { gameId: "tictactoe", mode: "local" };
const VS_AI: SaveSlot = { gameId: "tictactoe", mode: "ai" };
const AI_SETTINGS: ModeSettings = {
  kind: "ai",
  first: "human",
  seats: [{ kind: "human" }, { kind: "ai", level: "hard" }],
};

function envelope(settings: ModeSettings, savedAt: string, inProgress = true) {
  return toSavedGame({ settings, record: sampleRecord(), inProgress }, savedAt);
}

/** A clock that ticks one minute per save, so saves are ordered. */
function minuteClock() {
  let minute = 0;
  return () => new Date(Date.UTC(2026, 9, 30, 10, minute++));
}

describe("createIndexedDbStore", () => {
  it("reads back the envelope it wrote", async () => {
    const kv = createMapKeyValue();
    const store = createIndexedDbStore(kv, () => new Date("2026-10-30T10:00:00Z"));
    const record = sampleRecord();

    await store.save(VS_AI, { settings: AI_SETTINGS, record, inProgress: false });

    expect(kv.entries.get("tictactoe:ai")).toEqual({
      version: 2,
      savedAt: "2026-10-30T10:00:00.000Z",
      inProgress: false,
      mode: AI_SETTINGS,
      record,
    });
    expect(await store.load(VS_AI)).toEqual({ settings: AI_SETTINGS, record });
  });

  it("keeps the two modes of one game apart", async () => {
    const store = createIndexedDbStore(createMapKeyValue());
    const record = sampleRecord();

    await store.save(LOCAL, { settings: { kind: "local" }, record, inProgress: true });
    await store.save(VS_AI, { settings: AI_SETTINGS, record, inProgress: true });
    await store.clear(VS_AI);

    expect(await store.load(LOCAL)).toEqual({ settings: { kind: "local" }, record });
    expect(await store.load(VS_AI)).toBeUndefined();
  });

  it("drops unreadable data and a game stored in the wrong mode's slot", async () => {
    const kv = createMapKeyValue({
      "tictactoe:local": "garbage",
      "tictactoe:ai": envelope({ kind: "local" }, "2026-10-30T10:00:00.000Z"),
    });
    const store = createIndexedDbStore(kv);

    expect(await store.load(LOCAL)).toBeUndefined();
    expect(await store.load(VS_AI)).toBeUndefined();
    expect([...kv.entries.keys()]).toEqual([]);
  });

  it("rejects, and keeps the data, when it was saved by a newer version", async () => {
    const newer = { version: 3, savedAt: "2027-01-01T00:00:00.000Z", future: "format" };
    const kv = createMapKeyValue({ "tictactoe:ai": newer });
    const store = createIndexedDbStore(kv);

    await expect(store.load(VS_AI)).rejects.toThrow("newer version");
    expect(kv.entries.get("tictactoe:ai")).toEqual(newer);
  });

  it("lists games in progress, most recently saved first", async () => {
    const store = createIndexedDbStore(createMapKeyValue(), minuteClock());
    const record = sampleRecord();

    await store.save(VS_AI, { settings: AI_SETTINGS, record, inProgress: true });
    await store.save(LOCAL, { settings: { kind: "local" }, record, inProgress: true });

    expect(await store.listInProgress()).toEqual([
      {
        gameId: "tictactoe",
        mode: "local",
        settings: { kind: "local" },
        savedAt: "2026-10-30T10:01:00.000Z",
      },
      {
        gameId: "tictactoe",
        mode: "ai",
        settings: AI_SETTINGS,
        savedAt: "2026-10-30T10:00:00.000Z",
      },
    ]);
  });

  it("lists only readable games in progress of registered games, and drops nothing", async () => {
    const initial = {
      "tictactoe:ai": envelope(AI_SETTINGS, "2026-10-30T10:00:00.000Z", false),
      "tictactoe:local": { version: 3, future: "format" },
      "chess:local": envelope({ kind: "local" }, "2026-10-30T10:00:00.000Z"),
      "tictactoe:online": envelope({ kind: "local" }, "2026-10-30T10:00:00.000Z"),
      "tictactoe:local:extra": envelope({ kind: "local" }, "2026-10-30T10:00:00.000Z"),
    };
    const kv = createMapKeyValue(initial);
    const store = createIndexedDbStore(kv);

    expect(await store.listInProgress()).toEqual([]);
    expect(Object.fromEntries(kv.entries)).toEqual(initial);
  });

  it("skips keys without a mode and unreadable data when listing", async () => {
    // A key without a mode that a newer version wrote: neither moved nor dropped, nor listed.
    const newer = { version: 5, savedAt: "2027-01-01T00:00:00.000Z", inProgress: true };
    const kv = createMapKeyValue({
      tictactoe: newer,
      "tictactoe:ai": "garbage",
      "tictactoe:local": envelope({ kind: "local" }, "2026-10-30T10:00:00.000Z"),
    });
    const store = createIndexedDbStore(kv);

    expect(await store.listInProgress()).toEqual([
      expect.objectContaining({ gameId: "tictactoe", mode: "local" }),
    ]);
    expect(kv.entries.get("tictactoe:ai")).toBe("garbage");
    expect(kv.entries.get("tictactoe")).toEqual(newer);
  });
});
