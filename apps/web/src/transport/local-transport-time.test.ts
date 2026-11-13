import { createRng } from "@board-games/engine";
import { jellyCrew, type JellyCrewMove, tictactoe } from "@board-games/games";
import { describe, expect, it } from "vitest";

import { createLocalTransport } from "./local-transport";
import { createMemoryStore } from "./memory-store";
import type { ReadySnapshot, SavedGameStore, Transport } from "./types";

// The time of a game on one device (change `add-jelly-crew-game`, design §10.4), and a game played
// freely on one device (§10.2).

/** The two players' kitchen won (`layouts.solutions.ts`). */
const KITCHEN_TWO: readonly JellyCrewMove[] = [
  "0D",
  "1D",
  "1D",
  "1D",
  "1L",
  "1L",
  "0R",
  "0R",
  "0R",
  "0R",
  "0R",
  "0R",
  "0L",
  "0L",
  "0L",
  "0L",
  "0D",
  "0D",
  "1R",
  "1U",
  "1U",
  "1L",
  "1L",
  "1L",
  "1L",
];

function ready<State, Move>(
  transport: Transport<State, Move>,
): Promise<ReadySnapshot<State, Move>> {
  return new Promise((resolve) => {
    const check = () => {
      const snapshot = transport.getSnapshot();
      if (snapshot.status === "ready") {
        unsubscribe();
        resolve(snapshot);
      }
    };
    const unsubscribe = transport.subscribe(check);
    check();
  });
}

function current<State, Move>(transport: Transport<State, Move>): ReadySnapshot<State, Move> {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("still loading");
  return snapshot;
}

/** Lets the fire-and-forget store writes settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function crewTransport(store: SavedGameStore, clock: { now: number }) {
  return createLocalTransport({
    definition: jellyCrew,
    store,
    rng: createRng(1),
    now: () => clock.now,
    mode: "local",
    start: { mode: "local", playerCount: 2 },
  });
}

describe("Thời gian ván cùng máy", () => {
  it("times a game from its start to its result", async () => {
    const clock = { now: 1000 };
    const transport = crewTransport(createMemoryStore(), clock);
    expect((await ready(transport)).gameTime).toEqual({ startedAt: 1000, endedAt: null });
    for (const move of KITCHEN_TWO) {
      clock.now += 10_000;
      transport.submit(move);
    }
    expect(current(transport)).toMatchObject({
      result: { kind: "win" },
      gameTime: { startedAt: 1000, endedAt: 1000 + KITCHEN_TWO.length * 10_000 },
    });
    transport.dispose();
  });

  it("drops the time of the result when the winning move is undone", async () => {
    const clock = { now: 1000 };
    const transport = crewTransport(createMemoryStore(), clock);
    await ready(transport);
    for (const move of KITCHEN_TWO) transport.submit(move);
    transport.requestUndo();
    expect(current(transport)).toMatchObject({
      result: null,
      gameTime: { startedAt: 1000, endedAt: null },
    });
    transport.dispose();
  });

  it("keeps when the game began through a reload", async () => {
    const store = createMemoryStore();
    const clock = { now: 1000 };
    const first = crewTransport(store, clock);
    await ready(first);
    first.submit("0D");
    await flush();
    first.dispose();

    clock.now = 90_000;
    const second = createLocalTransport({
      definition: jellyCrew,
      store,
      rng: createRng(1),
      now: () => clock.now,
    });
    const restored = await ready(second);
    expect(restored.moveCount).toBe(1);
    expect(restored.gameTime).toEqual({ startedAt: 1000, endedAt: null });
    second.dispose();
  });

  it("has no time for a game saved before it was kept", async () => {
    const store = createMemoryStore();
    const plain = createLocalTransport({
      definition: tictactoe,
      store,
      rng: createRng(1),
    });
    await ready(plain);
    plain.submit({ cell: 4 });
    await flush();
    plain.dispose();
    const saved = await store.load({ gameId: tictactoe.id, mode: "local" });
    if (saved === undefined) throw new Error("not saved");
    await store.save(
      { gameId: tictactoe.id, mode: "local" },
      { settings: saved.settings, record: saved.record as never, inProgress: true },
    );
    const again = createLocalTransport({
      definition: tictactoe,
      store,
      rng: createRng(1),
    });
    expect((await ready(again)).gameTime).toBeNull();
    again.dispose();
  });
});

describe("a game played freely on one device", () => {
  it("lets any seat move at any time, and tells who moved last", async () => {
    const transport = crewTransport(createMemoryStore(), { now: 0 });
    await ready(transport);
    transport.submit("1D");
    transport.submit("1D");
    transport.submit("0D");
    expect(current(transport)).toMatchObject({
      canMove: true,
      waitingFor: null,
      freePlay: true,
      lastMover: 0,
      moveCount: 3,
    });
    transport.dispose();
  });
});
