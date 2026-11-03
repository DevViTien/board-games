import { createRng, RECORD_VERSION } from "@board-games/engine";
import { caro, type CaroMove, type CaroState } from "@board-games/games";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalTransport } from "./local-transport";
import { createMemoryStore } from "./memory-store";
import type {
  AiPlayer,
  AiRequest,
  AiSetup,
  LocalSetup,
  ReadySnapshot,
  SavedGameStore,
  Transport,
} from "./types";

type CaroTransport = Transport<CaroState, CaroMove>;

const BIG_FREE = { size: 19, rule: "free" } as const;
const DEFAULTS = { size: 15, rule: "blocked-ends" } as const;

interface SameDeviceOptions {
  readonly store: SavedGameStore;
  readonly start?: LocalSetup;
  readonly fallback?: LocalSetup;
}

function sameDevice({ store, start, fallback }: SameDeviceOptions): CaroTransport {
  return createLocalTransport({ definition: caro, store, rng: createRng(1), start, fallback });
}

interface VsAiOptions {
  readonly store: SavedGameStore;
  readonly ai: AiPlayer;
  readonly start?: AiSetup;
  readonly fallback?: AiSetup;
}

function vsAi({
  store,
  ai,
  start,
  fallback = { mode: "ai", level: "medium", first: "human" },
}: VsAiOptions): CaroTransport {
  return createLocalTransport({
    definition: caro,
    store,
    rng: createRng(1),
    mode: "ai",
    start,
    fallback,
    ai,
  });
}

/** An AI that plays the first cell it may, recording what it was asked. */
function firstCellAi(): AiPlayer & { readonly requests: AiRequest[] } {
  const requests: AiRequest[] = [];
  return {
    requests,
    chooseMove: (request) => {
      requests.push(request);
      return Promise.resolve(caro.legalMoves(request.state as CaroState)[0]);
    },
    dispose: () => undefined,
  };
}

async function ready(transport: CaroTransport): Promise<ReadySnapshot<CaroState, CaroMove>> {
  await vi.advanceTimersByTimeAsync(0);
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("transport is still loading");
  return snapshot;
}

function readySnapshot(transport: CaroTransport): ReadySnapshot<CaroState, CaroMove> {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("transport is still loading");
  return snapshot;
}

/** The rules of the game on screen, as its state and its snapshot have them. */
function rulesOf(snapshot: ReadySnapshot<CaroState, CaroMove>) {
  return { size: snapshot.state.size, rule: snapshot.state.rule, options: snapshot.options };
}

const playedWith = (options: { size: number; rule: string }) => ({
  size: options.size,
  rule: options.rule,
  options,
});

/** A saved same-device game of the default rules with one stone in the middle. */
function savedDefaultGame() {
  const record = {
    version: RECORD_VERSION,
    gameId: "caro",
    playerCount: 2,
    options: DEFAULTS,
    entries: [{ move: { cell: 112 } }],
  };
  return createMemoryStore({ "caro:local": { settings: { kind: "local" }, record } });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("local transport rule options", () => {
  it("starts a same-device game on a 19×19 board with the free rule, and saves its options", async () => {
    const store = createMemoryStore();
    const transport = sameDevice({ store, start: { mode: "local", options: BIG_FREE } });

    const snapshot = await ready(transport);
    expect(rulesOf(snapshot)).toEqual(playedWith(BIG_FREE));
    expect(snapshot.legalMoves).toHaveLength(361);

    transport.submit({ cell: 360 });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.entries.get("caro:local")?.record).toMatchObject({ options: BIG_FREE });
  });

  it("keeps the rule options for a new same-device game", async () => {
    const transport = sameDevice({
      store: createMemoryStore(),
      start: { mode: "local", options: BIG_FREE },
    });
    await ready(transport);
    transport.submit({ cell: 0 });

    transport.requestNewGame();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(0);
    expect(rulesOf(snapshot)).toEqual(playedWith(BIG_FREE));
  });

  it("restores the rule options after a reload, and keeps them for the next new game", async () => {
    const store = createMemoryStore();
    const first = sameDevice({ store, start: { mode: "local", options: BIG_FREE } });
    await ready(first);
    for (const cell of [0, 1, 2, 3, 4]) first.submit({ cell });
    await vi.advanceTimersByTimeAsync(0);
    first.dispose();

    const reloaded = sameDevice({ store });
    const restored = await ready(reloaded);
    expect(restored.moveCount).toBe(5);
    expect(rulesOf(restored)).toEqual(playedWith(BIG_FREE));

    reloaded.requestNewGame();
    expect(rulesOf(readySnapshot(reloaded))).toEqual(playedWith(BIG_FREE));
  });

  it("keeps the rule options of a new game across a reload, before any move", async () => {
    const store = createMemoryStore();
    const first = sameDevice({ store, start: { mode: "local", options: BIG_FREE } });
    await ready(first);
    first.submit({ cell: 0 });
    first.requestNewGame();
    await vi.advanceTimersByTimeAsync(0);
    first.dispose();

    // The last choice remembered is another one: the empty board's own options win.
    const reloaded = sameDevice({ store, fallback: { mode: "local", options: DEFAULTS } });
    const snapshot = await ready(reloaded);
    expect(snapshot.moveCount).toBe(0);
    expect(rulesOf(snapshot)).toEqual(playedWith(BIG_FREE));
    expect(await store.listInProgress()).toEqual([]);
  });

  it("keeps the rule options across a reload after every move is undone", async () => {
    const store = createMemoryStore();
    const first = sameDevice({ store, start: { mode: "local", options: BIG_FREE } });
    await ready(first);
    first.submit({ cell: 0 });
    first.requestUndo();
    await vi.advanceTimersByTimeAsync(0);
    first.dispose();

    const reloaded = sameDevice({ store, fallback: { mode: "local", options: DEFAULTS } });
    const snapshot = await ready(reloaded);
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.canRedo).toBe(false);
    expect(rulesOf(snapshot)).toEqual(playedWith(BIG_FREE));
  });

  it("resumes the saved game, untouched, when the start address has options the game refuses", async () => {
    const store = savedDefaultGame();
    const saved = store.entries.get("caro:local");
    const transport = sameDevice({
      store,
      start: { mode: "local", options: { size: 17, rule: "free" } },
    });

    const snapshot = await ready(transport);
    expect(snapshot.moveCount).toBe(1);
    expect(rulesOf(snapshot)).toEqual(playedWith(DEFAULTS));
    await vi.advanceTimersByTimeAsync(0);
    expect(store.entries.get("caro:local")).toBe(saved);
  });

  it("sets up a game like the last choice when refused options leave no game to resume", async () => {
    const transport = sameDevice({
      store: createMemoryStore(),
      start: { mode: "local", options: { size: 17 } },
      fallback: { mode: "local", options: BIG_FREE },
    });

    expect(rulesOf(await ready(transport))).toEqual(playedWith(BIG_FREE));
  });

  it("uses the last choice's rule options when opened with no game", async () => {
    const transport = sameDevice({
      store: createMemoryStore(),
      fallback: { mode: "local", options: BIG_FREE },
    });

    expect(rulesOf(await ready(transport))).toEqual(playedWith(BIG_FREE));
  });

  it("uses the defaults when the last choice's rule options are refused too", async () => {
    const transport = sameDevice({
      store: createMemoryStore(),
      fallback: { mode: "local", options: { size: 17 } },
    });

    expect(rulesOf(await ready(transport))).toEqual(playedWith(DEFAULTS));
  });
});

describe("local transport rule options against the AI", () => {
  it("lets the AI play on the 19×19 board, from the state it is given", async () => {
    const ai = firstCellAi();
    const transport = vsAi({
      store: createMemoryStore(),
      ai,
      start: { mode: "ai", level: "hard", first: "human", options: BIG_FREE },
    });
    await ready(transport);

    // Row 19, column 19.
    transport.submit({ cell: 360 });
    await vi.advanceTimersByTimeAsync(300);

    expect((ai.requests[0]?.state as CaroState | undefined)?.size).toBe(19);
    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.lastEntry).toEqual({ move: { cell: 0 } });
    expect(snapshot.canMove).toBe(true);
  });

  it("keeps the level and the rule options for a new game, also after a reload", async () => {
    const store = createMemoryStore();
    const ai = firstCellAi();
    const first = vsAi({
      store,
      ai,
      start: { mode: "ai", level: "hard", first: "human", options: BIG_FREE },
    });
    await ready(first);
    first.submit({ cell: 180 });
    await vi.advanceTimersByTimeAsync(300);
    first.dispose();

    const reloaded = vsAi({ store, ai });
    expect(rulesOf(await ready(reloaded))).toEqual(playedWith(BIG_FREE));
    reloaded.requestNewGame();

    const snapshot = readySnapshot(reloaded);
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.seats).toEqual([{ kind: "human" }, { kind: "ai", level: "hard" }]);
    expect(rulesOf(snapshot)).toEqual(playedWith(BIG_FREE));
  });

  it("sets up a game like the last choice, rule options included, when none is saved", async () => {
    const transport = vsAi({
      store: createMemoryStore(),
      ai: firstCellAi(),
      fallback: { mode: "ai", level: "hard", first: "human", options: { size: 15, rule: "free" } },
    });

    const snapshot = await ready(transport);
    expect(snapshot.seats).toEqual([{ kind: "human" }, { kind: "ai", level: "hard" }]);
    expect(rulesOf(snapshot)).toEqual(playedWith({ size: 15, rule: "free" }));
  });
});
