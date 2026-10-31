import { createRng, createSession, playMove, toRecord } from "@board-games/engine";
import { tictactoe } from "@board-games/games";
import { describe, expect, it } from "vitest";

import { readSavedGame, toSavedGame } from "./saved-game";
import type { ModeSettings } from "./types";

function sampleRecord() {
  const created = createSession(tictactoe, { playerCount: 2 });
  if (!created.ok) throw new Error(created.error);
  const played = playMove(tictactoe, created.value, { cell: 4 }, createRng(1));
  if (!played.ok) throw new Error(played.error);
  return toRecord(played.value);
}

const AI_SETTINGS: ModeSettings = {
  kind: "ai",
  first: "random",
  seats: [{ kind: "ai", level: "hard" }, { kind: "human" }],
};

function sample(settings: ModeSettings = { kind: "local" }) {
  return toSavedGame(
    { settings, record: sampleRecord(), inProgress: true },
    "2026-10-30T10:00:00.000Z",
  );
}

describe("toSavedGame and readSavedGame", () => {
  it.each([
    ["same-device", { kind: "local" } as const],
    ["against the AI", AI_SETTINGS],
  ])("wrap a %s game in a versioned envelope and read it back", (_label, settings) => {
    const record = sampleRecord();
    const saved = toSavedGame({ settings, record, inProgress: false }, "2026-10-30T10:00:00.000Z");

    expect(saved).toEqual({
      version: 2,
      savedAt: "2026-10-30T10:00:00.000Z",
      inProgress: false,
      mode: settings,
      record,
    });
    // IndexedDB stores a structured clone; JSON is a stricter stand-in for it.
    expect(readSavedGame(JSON.parse(JSON.stringify(saved)))).toEqual({
      kind: "saved",
      savedAt: "2026-10-30T10:00:00.000Z",
      inProgress: false,
      settings,
      record,
    });
  });

  it.each([
    ["a bare record without envelope", { version: 1, gameId: "tictactoe" }],
    ["an envelope of the first version", { ...sample(), version: 1 }],
    ["an older envelope version", { ...sample(), version: 0 }],
    ["a missing save time", { version: 2, inProgress: true, mode: { kind: "local" }, record: {} }],
    ["a missing in-progress flag", { ...sample(), inProgress: undefined }],
    [
      "an unknown AI level",
      { ...sample(), mode: { ...AI_SETTINGS, seats: [{ kind: "ai", level: "genius" }] } },
    ],
    ["an unknown first player", { ...sample(), mode: { ...AI_SETTINGS, first: "nobody" } }],
    ["an unknown seat kind", { ...sample(), mode: { ...AI_SETTINGS, seats: [{ kind: "cat" }] } }],
    ["a mode that is not a string", { ...sample(), mode: { kind: 7 } }],
    ["a string", "garbage"],
    ["a version that is not a number", { ...sample(), version: "3" }],
  ])("find %s unreadable", (_label, raw) => {
    expect(readSavedGame(raw)).toEqual({ kind: "unreadable" });
  });

  it.each([
    ["a newer envelope", { ...sample(), version: 3, shape: "unknown" }],
    ["a newer envelope with a record of another shape", { version: 3, record: "opaque" }],
    [
      "a newer engine record in a current envelope",
      { ...sample(), record: { ...sampleRecord(), version: 2 } },
    ],
    [
      "a current envelope with a mode this version does not know",
      { ...sample(), mode: { kind: "online" } },
    ],
  ])("recognise %s as written by a newer version, to be kept", (_label, raw) => {
    expect(readSavedGame(raw)).toEqual({ kind: "newer" });
  });
});
