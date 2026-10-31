import { createRng } from "@board-games/engine";
import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { describe, expect, it, vi } from "vitest";

import { createLocalTransport } from "./local-transport";
import { createMemoryStore } from "./memory-store";
import type { ReadySnapshot, SavedGameStore, Transport, TransportEvent } from "./types";

type TicTacToeTransport = Transport<TicTacToeState, TicTacToeMove>;

function createTransport(store: SavedGameStore = createMemoryStore()): TicTacToeTransport {
  return createLocalTransport({ definition: tictactoe, store, rng: createRng(1) });
}

/** Resolves with the first ready snapshot. */
function ready(
  transport: TicTacToeTransport,
): Promise<ReadySnapshot<TicTacToeState, TicTacToeMove>> {
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

function readySnapshot(transport: TicTacToeTransport) {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("transport is still loading");
  return snapshot;
}

function recordEvents(transport: TicTacToeTransport): TransportEvent[] {
  const events: TransportEvent[] = [];
  transport.subscribe((event) => events.push(event));
  return events;
}

/** Lets the fire-and-forget store writes settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createLocalTransport", () => {
  it("starts loading, then shows a new game when nothing is saved", async () => {
    const transport = createTransport();
    expect(transport.getSnapshot()).toEqual({ status: "loading" });

    const snapshot = await ready(transport);
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.currentPlayer).toBe(0);
    expect(snapshot.legalMoves).toHaveLength(9);
    expect(snapshot.canUndo).toBe(false);
    expect(snapshot.canRedo).toBe(false);
    expect(snapshot.viewer).toBeNull();
    expect(snapshot.canMove).toBe(true);
  });

  it("applies a legal move, updates the snapshot and emits changed", async () => {
    const transport = createTransport();
    await ready(transport);
    const events = recordEvents(transport);

    transport.submit({ cell: 4 });

    const snapshot = readySnapshot(transport);
    expect(snapshot.state.board[4]).toBe(0);
    expect(snapshot.currentPlayer).toBe(1);
    expect(snapshot.lastEntry).toEqual({ move: { cell: 4 } });
    expect(snapshot.moveCount).toBe(1);
    expect(events).toEqual([{ type: "changed" }]);
  });

  it("rejects an illegal move and keeps the same snapshot object", async () => {
    const transport = createTransport();
    await ready(transport);
    transport.submit({ cell: 4 });
    const before = transport.getSnapshot();
    const events = recordEvents(transport);

    transport.submit({ cell: 4 });

    expect(transport.getSnapshot()).toBe(before);
    expect(events).toEqual([{ type: "rejected", code: "illegal-move" }]);
  });

  it("undoes and redoes, and does not count undone moves", async () => {
    const transport = createTransport();
    await ready(transport);
    transport.submit({ cell: 0 });
    transport.submit({ cell: 4 });

    transport.requestUndo();
    let snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(1);
    expect(snapshot.lastEntry).toEqual({ move: { cell: 0 } });
    expect(snapshot.state.board[4]).toBeNull();
    expect(snapshot.canRedo).toBe(true);

    transport.requestRedo();
    snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.canRedo).toBe(false);
  });

  it("emits rejected when there is nothing to undo or redo", async () => {
    const transport = createTransport();
    await ready(transport);
    const events = recordEvents(transport);

    transport.requestUndo();
    transport.requestRedo();

    expect(events).toEqual([
      { type: "rejected", code: "nothing-to-undo" },
      { type: "rejected", code: "nothing-to-redo" },
    ]);
  });

  it("starts a new game on request", async () => {
    const transport = createTransport();
    await ready(transport);
    transport.submit({ cell: 0 });

    transport.requestNewGame();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.canUndo).toBe(false);
  });

  it("reports the result and offers no moves once the game is won", async () => {
    const transport = createTransport();
    await ready(transport);
    for (const cell of [0, 3, 1, 4, 2]) transport.submit({ cell });

    const snapshot = readySnapshot(transport);
    expect(snapshot.result).toEqual({ kind: "win", winners: [0] });
    expect(snapshot.legalMoves).toEqual([]);
  });

  it("saves the game after every change and clears it when empty or finished", async () => {
    const store = createMemoryStore();
    const transport = createTransport(store);
    await ready(transport);

    transport.submit({ cell: 0 });
    await flush();
    expect(store.entries.get("tictactoe:local")?.record).toMatchObject({
      entries: [{ move: { cell: 0 } }],
    });

    transport.requestUndo();
    await flush();
    expect(store.entries.has("tictactoe:local")).toBe(false);

    for (const cell of [0, 3, 1, 4, 2]) transport.submit({ cell });
    await flush();
    expect(store.entries.has("tictactoe:local")).toBe(false);
  });

  it("restores a saved game", async () => {
    const store = createMemoryStore();
    const first = createTransport(store);
    await ready(first);
    for (const cell of [0, 4, 8, 2]) first.submit({ cell });
    await flush();
    first.dispose();

    const snapshot = await ready(createTransport(store));
    expect(snapshot.moveCount).toBe(4);
    expect(snapshot.state.board).toEqual([0, null, 1, null, 1, null, null, null, 0]);
    expect(snapshot.canUndo).toBe(true);
  });

  it("drops a saved game the engine rejects and starts a new one", async () => {
    const store = createMemoryStore({
      "tictactoe:local": {
        settings: { kind: "local" },
        record: { version: 1, gameId: "tictactoe", junk: true },
      },
    });

    const snapshot = await ready(createTransport(store));

    expect(snapshot.moveCount).toBe(0);
    await flush();
    expect(store.entries.has("tictactoe:local")).toBe(false);
  });

  it("starts a new game when storage fails, and keeps playing when saving fails", async () => {
    const broken: SavedGameStore = {
      load: () => Promise.reject(new Error("blocked")),
      save: () => Promise.reject(new Error("blocked")),
      clear: () => Promise.reject(new Error("blocked")),
      listInProgress: () => Promise.reject(new Error("blocked")),
    };
    const transport = createTransport(broken);

    await ready(transport);
    transport.submit({ cell: 0 });
    await flush();

    expect(readySnapshot(transport).moveCount).toBe(1);
  });

  it("stops emitting after dispose", async () => {
    const transport = createTransport();
    await ready(transport);
    const listener = vi.fn();
    transport.subscribe(listener);

    transport.dispose();
    transport.submit({ cell: 0 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores every request after dispose and never writes to the store again", async () => {
    const store = createMemoryStore();
    const transport = createTransport(store);
    await ready(transport);
    transport.submit({ cell: 0 });
    await flush();
    const saved = store.entries.get("tictactoe:local");
    const before = transport.getSnapshot();

    transport.dispose();
    transport.submit({ cell: 4 });
    transport.requestUndo();
    transport.requestRedo();
    transport.requestNewGame();
    await flush();

    expect(transport.getSnapshot()).toBe(before);
    expect(store.entries.get("tictactoe:local")).toEqual(saved);
  });

  it("lets a move be made while the game is on, and none once it is over", async () => {
    const transport = createTransport();
    expect(transport.getSnapshot().status).toBe("loading");

    expect((await ready(transport)).canMove).toBe(true);
    for (const cell of [0, 3, 1, 4, 2]) transport.submit({ cell });

    expect(readySnapshot(transport).canMove).toBe(false);
  });

  it("never writes over a saved game it could not read", async () => {
    const store = createMemoryStore({
      "tictactoe:local": { settings: { kind: "local" }, record: { kept: true } },
    });
    const transport = createTransport({
      ...store,
      load: () => Promise.reject(new Error("Connection to Indexed Database server lost")),
    });
    await ready(transport);

    transport.submit({ cell: 0 });
    transport.requestUndo();
    transport.requestRedo();
    transport.requestNewGame();
    await flush();

    expect(readySnapshot(transport).moveCount).toBe(0);
    expect(store.entries.get("tictactoe:local")?.record).toEqual({ kept: true });
  });

  it("starts a new game after 3 seconds when the store does not answer, and never writes over it", async () => {
    vi.useFakeTimers();
    try {
      const store = createMemoryStore({
        "tictactoe:local": { settings: { kind: "local" }, record: { kept: true } },
      });
      const save = vi.spyOn(store, "save");
      const transport = createTransport({ ...store, load: () => new Promise(() => undefined) });

      await vi.advanceTimersByTimeAsync(2999);
      expect(transport.getSnapshot()).toEqual({ status: "loading" });
      await vi.advanceTimersByTimeAsync(1);

      expect(readySnapshot(transport).moveCount).toBe(0);
      transport.submit({ cell: 0 });
      await vi.advanceTimersByTimeAsync(0);
      expect(readySnapshot(transport).moveCount).toBe(1);
      expect(save).not.toHaveBeenCalled();
      expect(store.entries.get("tictactoe:local")?.record).toEqual({ kept: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not resume a finished game left in storage, and drops it", async () => {
    const finished = createMemoryStore();
    const first = createTransport(finished);
    await ready(first);
    for (const cell of [0, 3, 1, 4]) first.submit({ cell });
    await flush();
    first.dispose();
    // Only reachable if clearing after the winning move failed: put the won game in storage.
    const won = finished.entries.get("tictactoe:local")?.record as { entries: unknown[] };
    const store = createMemoryStore({
      "tictactoe:local": {
        settings: { kind: "local" },
        record: { ...won, entries: [...won.entries, { move: { cell: 2 } }] },
      },
    });

    const snapshot = await ready(createTransport(store));

    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.result).toBeNull();
    await flush();
    expect(store.entries.has("tictactoe:local")).toBe(false);
  });

  it("keeps playing when the store throws instead of rejecting", async () => {
    const throwing: SavedGameStore = {
      ...createMemoryStore(),
      save: () => {
        throw new Error("sync failure");
      },
      clear: () => {
        throw new Error("sync failure");
      },
    };
    const transport = createTransport(throwing);
    await ready(transport);

    expect(() => {
      transport.submit({ cell: 0 });
    }).not.toThrow();
    expect(readySnapshot(transport).moveCount).toBe(1);
    expect(() => {
      transport.requestUndo();
    }).not.toThrow();
  });
});
