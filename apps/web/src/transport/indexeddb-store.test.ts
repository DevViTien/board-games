import { createRng, createSession, playMove, toRecord } from "@board-games/engine";
import { tictactoe } from "@board-games/games";
import { describe, expect, it } from "vitest";

import { readSavedGame, toSavedGame } from "./indexeddb-store";

function sampleRecord() {
  const created = createSession(tictactoe, { playerCount: 2 });
  if (!created.ok) throw new Error(created.error);
  const played = playMove(tictactoe, created.value, { cell: 4 }, createRng(1));
  if (!played.ok) throw new Error(played.error);
  return toRecord(played.value);
}

// The IndexedDB calls themselves (drop unreadable data, keep newer data) run in a real browser:
// e2e/play-tictactoe.spec.ts.
describe("toSavedGame and readSavedGame", () => {
  it("wrap a record in a versioned envelope and read the same record back", () => {
    const record = sampleRecord();
    const saved = toSavedGame(record, new Date("2026-10-30T10:00:00Z"));

    expect(saved).toEqual({
      version: 1,
      savedAt: "2026-10-30T10:00:00.000Z",
      mode: { kind: "local" },
      record,
    });
    // IndexedDB stores a structured clone; JSON is a stricter stand-in for it.
    expect(readSavedGame(JSON.parse(JSON.stringify(saved)))).toEqual({ kind: "saved", record });
  });

  it.each([
    ["a bare record without envelope", { version: 1, gameId: "tictactoe" }],
    ["an older envelope version", { ...toSavedGame(sampleRecord()), version: 0 }],
    ["an unknown play mode", { ...toSavedGame(sampleRecord()), mode: { kind: "online" } }],
    ["a missing save time", { version: 1, mode: { kind: "local" }, record: {} }],
    ["a string", "garbage"],
    ["a version that is not a number", { ...toSavedGame(sampleRecord()), version: "2" }],
  ])("find %s unreadable", (_label, raw) => {
    expect(readSavedGame(raw)).toEqual({ kind: "unreadable" });
  });

  it.each([
    ["a newer envelope", { ...toSavedGame(sampleRecord()), version: 2, shape: "unknown" }],
    ["a newer envelope with a record of another shape", { version: 2, record: "opaque" }],
    [
      "a newer engine record in a current envelope",
      { ...toSavedGame(sampleRecord()), record: { ...sampleRecord(), version: 2 } },
    ],
  ])("recognise %s as written by a newer version, to be kept", (_label, raw) => {
    expect(readSavedGame(raw)).toEqual({ kind: "newer" });
  });
});
