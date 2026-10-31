import { describe, expect, it } from "vitest";

import { createMemoryStore } from "./memory-store";
import type { ModeSettings } from "./types";

const LOCAL: ModeSettings = { kind: "local" };
const AI_EASY: ModeSettings = {
  kind: "ai",
  first: "human",
  seats: [{ kind: "human" }, { kind: "ai", level: "easy" }],
};

// Holds to the same contract as the IndexedDB store, which indexeddb-store.test.ts checks, so
// screen tests using it see what the app would.
describe("createMemoryStore", () => {
  it("lists readable games in progress of registered games, the most recently saved first", async () => {
    const store = createMemoryStore({
      "tictactoe:local": { settings: LOCAL, record: {}, savedAt: "2026-10-29T10:00:00.000Z" },
      "tictactoe:ai": { settings: AI_EASY, record: {}, savedAt: "2026-10-30T10:00:00.000Z" },
      "chess:local": { settings: LOCAL, record: {}, savedAt: "2026-10-31T10:00:00.000Z" },
    });

    expect(await store.listInProgress()).toEqual([
      { gameId: "tictactoe", mode: "ai", settings: AI_EASY, savedAt: "2026-10-30T10:00:00.000Z" },
      { gameId: "tictactoe", mode: "local", settings: LOCAL, savedAt: "2026-10-29T10:00:00.000Z" },
    ]);
  });

  it("leaves out games not in progress and settings that do not fit their slot", async () => {
    const store = createMemoryStore({
      "tictactoe:local": { settings: AI_EASY, record: {} },
      "tictactoe:ai": { settings: AI_EASY, record: {}, inProgress: false },
    });

    expect(await store.listInProgress()).toEqual([]);
  });
});
