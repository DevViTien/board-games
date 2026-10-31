import { createRng, type Rng, toRecord } from "@board-games/engine";
import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInlineAiPlayer } from "@/ai-worker/ai-player";

import { createLocalTransport } from "./local-transport";
import { createMemoryStore } from "./memory-store";
import type {
  AiPlayer,
  AiRequest,
  AiSetup,
  ModeSettings,
  ReadySnapshot,
  SavedGameStore,
  Transport,
  TransportEvent,
} from "./types";

type TicTacToeTransport = Transport<TicTacToeState, TicTacToeMove>;

const MEDIUM_HUMAN_FIRST: AiSetup = { mode: "ai", level: "medium", first: "human" };

interface VsAiOptions {
  readonly store?: SavedGameStore;
  readonly ai?: AiPlayer;
  readonly rng?: Rng;
  readonly start?: AiSetup;
  readonly fallback?: AiSetup;
}

function vsAi({
  store = createMemoryStore(),
  ai = createInlineAiPlayer(),
  rng = createRng(1),
  start,
  fallback = MEDIUM_HUMAN_FIRST,
}: VsAiOptions = {}): TicTacToeTransport {
  return createLocalTransport({
    definition: tictactoe,
    store,
    rng,
    mode: "ai",
    start,
    fallback,
    ai,
  });
}

/** An AI that always plays the first empty cell, so games can be scripted. */
function firstCellAi(): AiPlayer & { readonly requests: AiRequest[] } {
  const requests: AiRequest[] = [];
  return {
    requests,
    chooseMove: (request) => {
      requests.push(request);
      return Promise.resolve(tictactoe.legalMoves(request.state as TicTacToeState)[0]);
    },
    dispose: () => undefined,
  };
}

/** An AI that answers only when the test says so. */
function manualAi() {
  const calls: { resolve: (move: unknown) => void; reject: (reason: unknown) => void }[] = [];
  const ai: AiPlayer = {
    chooseMove: () =>
      new Promise((resolve, reject) => {
        calls.push({ resolve, reject });
      }),
    dispose: () => undefined,
  };
  return { ai, calls };
}

/** Draws `firstDraws` in turn for who moves first (`nextInt(0, 1)`), and the lowest value otherwise. */
function scriptedRng(firstDraws: number[]): Rng {
  return {
    nextInt: (min, max) => (min === 0 && max === 1 ? (firstDraws.shift() ?? 0) : min),
    nextFloat: () => 0,
  };
}

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

/** Lets the AI answer and its minimum delay pass. */
async function aiMoves(): Promise<void> {
  await vi.advanceTimersByTimeAsync(300);
}

const HUMAN = { kind: "human" } as const;
const ai = (level: "easy" | "medium" | "hard") => ({ kind: "ai", level }) as const;

/** A saved game against the AI, X (seat 0) played by `seats[0]`, with these cells played. */
function savedVsAi(settings: ModeSettings, cells: number[], inProgress = true) {
  let state = tictactoe.setup();
  const entries = cells.map((cell) => {
    state = tictactoe.applyMove(state, { cell });
    return { move: { cell } };
  });
  return {
    "tictactoe:ai": {
      settings,
      record: { version: 1, gameId: "tictactoe", playerCount: 2, options: {}, entries },
      inProgress,
    },
  } as const;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createLocalTransport against the AI: seats", () => {
  it("seats the player first when the player moves first", async () => {
    const snapshot = await ready(vsAi({ start: { mode: "ai", level: "hard", first: "human" } }));

    expect(snapshot.seats).toEqual([HUMAN, ai("hard")]);
    expect(snapshot.viewer).toBe(0);
    expect(snapshot.canMove).toBe(true);
    expect(snapshot.waitingFor).toBeNull();
  });

  it("seats the AI first when the AI moves first", async () => {
    const snapshot = await ready(vsAi({ start: { mode: "ai", level: "easy", first: "ai" } }));

    expect(snapshot.seats).toEqual([ai("easy"), HUMAN]);
    expect(snapshot.viewer).toBe(1);
    expect(snapshot.canMove).toBe(false);
    expect(snapshot.waitingFor).toBe("ai");
  });

  it("may draw either side for a random first player", async () => {
    const random: AiSetup = { mode: "ai", level: "medium", first: "random" };

    const humanFirst = await ready(vsAi({ start: random, rng: scriptedRng([0]) }));
    const aiFirst = await ready(vsAi({ start: random, rng: scriptedRng([1]) }));

    expect(humanFirst.seats).toEqual([HUMAN, ai("medium")]);
    expect(aiFirst.seats).toEqual([ai("medium"), HUMAN]);
  });

  it("does not count a game where only the AI has moved as in progress", async () => {
    const store = createMemoryStore();
    const transport = vsAi({
      store,
      ai: firstCellAi(),
      start: { ...MEDIUM_HUMAN_FIRST, first: "ai" },
    });
    await ready(transport);

    await aiMoves();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(1);
    expect(snapshot.inProgress).toBe(false);
    expect(snapshot.canUndo).toBe(false);
    expect(store.entries.get("tictactoe:ai")?.inProgress).toBe(false);

    transport.submit({ cell: 4 });
    expect(readySnapshot(transport).inProgress).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(store.entries.get("tictactoe:ai")?.inProgress).toBe(true);
  });

  it("starts the requested game in place of a saved one it could read", async () => {
    const store = createMemoryStore(
      savedVsAi({ kind: "ai", first: "human", seats: [HUMAN, ai("easy")] }, [4, 0]),
    );

    const snapshot = await ready(
      vsAi({ store, start: { mode: "ai", level: "hard", first: "human" } }),
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.seats).toEqual([HUMAN, ai("hard")]);
    expect(store.entries.get("tictactoe:ai")).toMatchObject({
      settings: { kind: "ai", first: "human", seats: [HUMAN, ai("hard")] },
      record: { entries: [] },
      inProgress: false,
    });
  });

  it("plays the requested game without saving it when the saved one cannot be read", async () => {
    const saved = savedVsAi({ kind: "ai", first: "human", seats: [HUMAN, ai("easy")] }, [4, 0]);
    const store = createMemoryStore(saved);
    const transport = vsAi({
      store: { ...store, load: () => Promise.reject(new Error("blocked")) },
      ai: firstCellAi(),
      start: { mode: "ai", level: "hard", first: "human" },
    });

    const snapshot = await ready(transport);
    transport.submit({ cell: 4 });
    await aiMoves();

    expect(snapshot.seats).toEqual([HUMAN, ai("hard")]);
    expect(readySnapshot(transport).moveCount).toBe(2);
    expect(store.entries.get("tictactoe:ai")?.record).toEqual(saved["tictactoe:ai"].record);
  });

  it("plays the requested game without saving it when reading the saved one never answers", async () => {
    const saved = savedVsAi({ kind: "ai", first: "human", seats: [HUMAN, ai("easy")] }, [4, 0]);
    const store = createMemoryStore(saved);
    const save = vi.spyOn(store, "save");
    const clear = vi.spyOn(store, "clear");
    const transport = vsAi({
      store: { ...store, load: () => new Promise(() => undefined) },
      ai: firstCellAi(),
      start: { mode: "ai", level: "hard", first: "human" },
    });

    await vi.advanceTimersByTimeAsync(2999);
    expect(transport.getSnapshot().status).toBe("loading");
    await vi.advanceTimersByTimeAsync(1);

    expect(readySnapshot(transport).seats).toEqual([HUMAN, ai("hard")]);
    transport.submit({ cell: 4 });
    await aiMoves();
    expect(readySnapshot(transport).moveCount).toBe(2);
    expect(save).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(store.entries.get("tictactoe:ai")?.record).toEqual(saved["tictactoe:ai"].record);
  });

  it("sets up a game like the fallback when none is saved or requested", async () => {
    const store = createMemoryStore();

    const snapshot = await ready(
      vsAi({ store, fallback: { mode: "ai", level: "hard", first: "ai" } }),
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(snapshot.seats).toEqual([ai("hard"), HUMAN]);
    expect(store.entries.get("tictactoe:ai")?.settings).toEqual({
      kind: "ai",
      first: "ai",
      seats: [ai("hard"), HUMAN],
    });
  });
});

describe("createLocalTransport against the AI: the AI's turn", () => {
  it("answers the player's move, not sooner than 300 ms, locking the board meanwhile", async () => {
    const thinker = firstCellAi();
    const transport = vsAi({ ai: thinker, start: { mode: "ai", level: "hard", first: "human" } });
    await ready(transport);

    transport.submit({ cell: 4 });

    let snapshot = readySnapshot(transport);
    expect(snapshot.waitingFor).toBe("ai");
    expect(snapshot.canMove).toBe(false);
    expect(thinker.requests).toEqual([
      {
        gameId: "tictactoe",
        state: snapshot.state,
        level: "hard",
        timeLimitMs: 1500,
        seed: expect.any(Number) as number,
      },
    ]);
    await vi.advanceTimersByTimeAsync(299);
    expect(readySnapshot(transport).moveCount).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.state.board[0]).toBe(1);
    expect(snapshot.waitingFor).toBeNull();
    expect(snapshot.canMove).toBe(true);
  });

  it("plays with the real AI in the background", async () => {
    const transport = vsAi({ start: { mode: "ai", level: "medium", first: "human" } });
    await ready(transport);

    transport.submit({ cell: 4 });
    await aiMoves();

    expect(readySnapshot(transport).moveCount).toBe(2);
    expect(readySnapshot(transport).canMove).toBe(true);
  });

  it("moves first by itself when it moves first", async () => {
    const transport = vsAi({ start: { mode: "ai", level: "easy", first: "ai" } });
    await ready(transport);

    await aiMoves();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(1);
    expect(snapshot.currentPlayer).toBe(1);
    expect(snapshot.canMove).toBe(true);
  });

  it("takes its turn after restoring a game on its turn", async () => {
    const settings: ModeSettings = { kind: "ai", first: "human", seats: [HUMAN, ai("easy")] };
    const transport = vsAi({
      store: createMemoryStore(savedVsAi(settings, [4])),
      ai: firstCellAi(),
    });

    const restored = await ready(transport);
    expect(restored.moveCount).toBe(1);
    expect(restored.waitingFor).toBe("ai");
    await aiMoves();

    expect(readySnapshot(transport).moveCount).toBe(2);
  });

  it("refuses a move made for the AI's seat", async () => {
    const transport = vsAi({
      ai: manualAi().ai,
      start: { mode: "ai", level: "easy", first: "ai" },
    });
    await ready(transport);
    const events = recordEvents(transport);

    transport.submit({ cell: 4 });

    expect(events).toEqual([{ type: "rejected", code: "illegal-move" }]);
    expect(readySnapshot(transport).moveCount).toBe(0);
  });

  it("drops a move that has arrived when the player undoes during the delay", async () => {
    const transport = vsAi({ ai: firstCellAi() });
    await ready(transport);
    transport.submit({ cell: 4 });
    await vi.advanceTimersByTimeAsync(150);

    transport.requestUndo();
    await vi.advanceTimersByTimeAsync(1000);

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.canMove).toBe(true);
  });

  it("drops the move it is choosing on a new game or dispose", async () => {
    const newGame = vsAi({ ai: firstCellAi() });
    await ready(newGame);
    newGame.submit({ cell: 4 });
    await vi.advanceTimersByTimeAsync(150);
    newGame.requestNewGame();

    const disposed = vsAi({ ai: firstCellAi() });
    await ready(disposed);
    disposed.submit({ cell: 4 });
    const before = disposed.getSnapshot();
    await vi.advanceTimersByTimeAsync(150);
    disposed.dispose();

    await vi.advanceTimersByTimeAsync(1000);
    expect(readySnapshot(newGame).moveCount).toBe(0);
    expect(disposed.getSnapshot()).toBe(before);
  });

  it("plays a random legal move when the AI fails", async () => {
    const { ai: failing, calls } = manualAi();
    const transport = vsAi({ ai: failing });
    await ready(transport);
    transport.submit({ cell: 4 });

    calls[0]?.reject(new Error("Worker crashed"));
    await aiMoves();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.currentPlayer).toBe(0);
    expect(snapshot.canMove).toBe(true);
  });

  it("plays a random legal move when the AI chooses a move the rules refuse", async () => {
    const { ai: wrong, calls } = manualAi();
    const transport = vsAi({ ai: wrong });
    await ready(transport);
    transport.submit({ cell: 4 });

    calls[0]?.resolve({ cell: 4 });
    await aiMoves();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.state.board.filter((cell) => cell === 1)).toHaveLength(1);
  });
});

describe("createLocalTransport against the AI: undo, redo and new game", () => {
  it("undoes the AI's reply together with the player's move", async () => {
    const transport = vsAi({ ai: firstCellAi() });
    await ready(transport);
    transport.submit({ cell: 4 });
    await aiMoves();
    transport.submit({ cell: 8 });
    await aiMoves();
    expect(readySnapshot(transport).moveCount).toBe(4);

    transport.requestUndo();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.state.board).toEqual([1, null, null, null, 0, null, null, null, null]);
    expect(snapshot.canMove).toBe(true);
    expect(snapshot.canRedo).toBe(true);
  });

  it("cannot undo when only the AI has moved", async () => {
    const transport = vsAi({ ai: firstCellAi(), start: { ...MEDIUM_HUMAN_FIRST, first: "ai" } });
    await ready(transport);
    await aiMoves();
    const events = recordEvents(transport);

    expect(readySnapshot(transport).canUndo).toBe(false);
    transport.requestUndo();

    expect(events).toEqual([{ type: "rejected", code: "nothing-to-undo" }]);
    expect(readySnapshot(transport).moveCount).toBe(1);
  });

  it("undoes the player's move while the AI has not answered yet", async () => {
    const { ai: slow } = manualAi();
    const transport = vsAi({ ai: slow });
    await ready(transport);
    transport.submit({ cell: 4 });

    transport.requestUndo();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.waitingFor).toBeNull();
    expect(snapshot.canMove).toBe(true);
  });

  it("undoes the player's move while the AI's answer waits for the delay", async () => {
    const { ai: quick, calls } = manualAi();
    const transport = vsAi({ ai: quick });
    await ready(transport);
    transport.submit({ cell: 4 });
    calls[0]?.resolve({ cell: 0 });
    await vi.advanceTimersByTimeAsync(299);

    transport.requestUndo();
    await vi.advanceTimersByTimeAsync(1000);

    expect(readySnapshot(transport).moveCount).toBe(0);
    expect(readySnapshot(transport).state.board).toEqual(Array(9).fill(null));
  });

  it("redoes the AI's reply together with the player's move", async () => {
    const thinker = firstCellAi();
    const transport = vsAi({ ai: thinker });
    await ready(transport);
    transport.submit({ cell: 4 });
    await aiMoves();
    transport.requestUndo();
    expect(readySnapshot(transport).moveCount).toBe(0);

    transport.requestRedo();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.state.board[4]).toBe(0);
    expect(snapshot.state.board[0]).toBe(1);
    expect(snapshot.canMove).toBe(true);
    expect(snapshot.waitingFor).toBeNull();
    await aiMoves();
    expect(thinker.requests).toHaveLength(1);
  });

  it("keeps the level for a new game after a finished one", async () => {
    const transport = vsAi({
      ai: firstCellAi(),
      start: { mode: "ai", level: "hard", first: "human" },
    });
    await ready(transport);
    // X takes 4, 2 and 6 while the AI fills 0 and 1.
    for (const cell of [4, 2, 6]) {
      transport.submit({ cell });
      await aiMoves();
    }
    expect(readySnapshot(transport).result).toEqual({ kind: "win", winners: [0] });
    expect(readySnapshot(transport).inProgress).toBe(false);

    transport.requestNewGame();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.seats).toEqual([HUMAN, ai("hard")]);
  });

  it("draws a random first player again for each new game, also after a reload", async () => {
    const settings: ModeSettings = { kind: "ai", first: "random", seats: [HUMAN, ai("medium")] };
    const store = createMemoryStore(savedVsAi(settings, [4, 0]));
    const transport = vsAi({ store, ai: manualAi().ai, rng: scriptedRng([1, 0]) });
    expect((await ready(transport)).seats).toEqual([HUMAN, ai("medium")]);

    transport.requestNewGame();
    expect(readySnapshot(transport).seats).toEqual([ai("medium"), HUMAN]);
    transport.requestNewGame();
    expect(readySnapshot(transport).seats).toEqual([HUMAN, ai("medium")]);
  });

  it("starts a new game with an empty board while the AI is thinking", async () => {
    const { ai: quick, calls } = manualAi();
    const transport = vsAi({ ai: quick });
    await ready(transport);
    transport.submit({ cell: 4 });

    transport.requestNewGame();
    calls[0]?.resolve({ cell: 0 });
    await vi.advanceTimersByTimeAsync(1000);

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.state.board).toEqual(Array(9).fill(null));
  });
});

describe("createLocalTransport against the AI: saving", () => {
  it("restores the moves, the seats and the level after a reload", async () => {
    const store = createMemoryStore();
    const first = vsAi({
      store,
      ai: firstCellAi(),
      start: { mode: "ai", level: "hard", first: "ai" },
    });
    await ready(first);
    await aiMoves();
    first.submit({ cell: 4 });
    await aiMoves();
    first.dispose();

    const snapshot = await ready(vsAi({ store, ai: firstCellAi() }));

    expect(snapshot.moveCount).toBe(3);
    expect(snapshot.seats).toEqual([ai("hard"), HUMAN]);
    expect(snapshot.viewer).toBe(1);
    expect(snapshot.canMove).toBe(true);
  });

  it("keeps the level and the first player after a reload before the first move", async () => {
    const store = createMemoryStore();
    const first = vsAi({ store, start: { mode: "ai", level: "hard", first: "human" } });
    await ready(first);
    await vi.advanceTimersByTimeAsync(0);
    first.dispose();
    expect(store.entries.get("tictactoe:ai")?.inProgress).toBe(false);

    const snapshot = await ready(vsAi({ store }));

    expect(snapshot.seats).toEqual([HUMAN, ai("hard")]);
    expect(snapshot.canMove).toBe(true);
  });

  it("does not draw a random first player again after a reload", async () => {
    const store = createMemoryStore();
    const random: AiSetup = { mode: "ai", level: "medium", first: "random" };
    const first = vsAi({ store, ai: manualAi().ai, start: random, rng: scriptedRng([1]) });
    expect((await ready(first)).seats).toEqual([ai("medium"), HUMAN]);
    await vi.advanceTimersByTimeAsync(0);
    first.dispose();

    const snapshot = await ready(vsAi({ store, ai: manualAi().ai, rng: scriptedRng([0]) }));

    expect(snapshot.seats).toEqual([ai("medium"), HUMAN]);
  });

  it("keeps a same-device game and a game against the AI of one game apart", async () => {
    const store = createMemoryStore();
    const local = createLocalTransport({ definition: tictactoe, store, rng: createRng(1) });
    await ready(local);
    local.submit({ cell: 8 });
    const versus = vsAi({ store, ai: firstCellAi() });
    await ready(versus);
    versus.submit({ cell: 4 });
    await aiMoves();
    local.dispose();
    versus.dispose();

    const localAgain = await ready(
      createLocalTransport({ definition: tictactoe, store, rng: createRng(1) }),
    );
    const versusAgain = await ready(vsAi({ store, ai: firstCellAi() }));

    expect(localAgain.state.board).toEqual([null, null, null, null, null, null, null, null, 0]);
    expect(localAgain.seats).toEqual([HUMAN, HUMAN]);
    expect(versusAgain.state.board).toEqual([1, null, null, null, 0, null, null, null, null]);
    expect(await store.listInProgress()).toEqual([
      expect.objectContaining({ mode: "ai" }),
      expect.objectContaining({ mode: "local" }),
    ]);
  });

  it("drops a finished game from its slot", async () => {
    const store = createMemoryStore();
    const transport = vsAi({ store, ai: firstCellAi() });
    await ready(transport);
    for (const cell of [4, 2, 6]) {
      transport.submit({ cell });
      await aiMoves();
    }

    expect(readySnapshot(transport).result).not.toBeNull();
    expect(store.entries.has("tictactoe:ai")).toBe(false);
  });

  it("drops a saved game whose seats do not match its record, like a corrupt one", async () => {
    const settings: ModeSettings = {
      kind: "ai",
      first: "human",
      seats: [HUMAN, ai("hard"), ai("hard")],
    };
    const store = createMemoryStore(savedVsAi(settings, [4, 0]));

    const snapshot = await ready(vsAi({ store }));
    await vi.advanceTimersByTimeAsync(0);

    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.seats).toEqual([HUMAN, ai("medium")]);
    expect(store.entries.get("tictactoe:ai")?.settings).toEqual({
      kind: "ai",
      first: "human",
      seats: [HUMAN, ai("medium")],
    });
  });

  it.each([
    ["only AI seats", [ai("hard"), ai("hard")]],
    ["only seats of people", [HUMAN, HUMAN]],
  ])("drops a saved game against the AI with %s, like a corrupt one", async (_, seats) => {
    const store = createMemoryStore(savedVsAi({ kind: "ai", first: "human", seats }, [4, 0]));
    const chooseMove = vi.fn(() => Promise.resolve({ cell: 8 }));

    const snapshot = await ready(vsAi({ store, ai: { chooseMove, dispose: () => undefined } }));
    await aiMoves();

    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.seats).toEqual([HUMAN, ai("medium")]);
    // The player moves first in the fallback game, so the AI has nothing to play by itself.
    expect(chooseMove).not.toHaveBeenCalled();
    expect(store.entries.get("tictactoe:ai")?.settings).toEqual({
      kind: "ai",
      first: "human",
      seats: [HUMAN, ai("medium")],
    });
  });

  it("drops the saved same-device game when a new one is requested", async () => {
    const store = createMemoryStore();
    const first = createLocalTransport({ definition: tictactoe, store, rng: createRng(1) });
    await ready(first);
    first.submit({ cell: 4 });
    await vi.advanceTimersByTimeAsync(0);
    first.dispose();
    expect(store.entries.has("tictactoe:local")).toBe(true);

    const snapshot = await ready(
      createLocalTransport({
        definition: tictactoe,
        store,
        rng: createRng(1),
        start: { mode: "local" },
      }),
    );
    await vi.advanceTimersByTimeAsync(0);

    expect(snapshot.moveCount).toBe(0);
    expect(store.entries.has("tictactoe:local")).toBe(false);
  });

  it("saves the record it shows", async () => {
    const store = createMemoryStore();
    const transport = vsAi({ store, ai: firstCellAi() });
    await ready(transport);
    transport.submit({ cell: 4 });
    await aiMoves();

    expect(store.entries.get("tictactoe:ai")?.record).toEqual(
      toRecord({
        gameId: "tictactoe",
        playerCount: 2,
        options: {},
        states: [],
        entries: [{ move: { cell: 4 } }, { move: { cell: 0 } }],
        cursor: 2,
      }),
    );
  });
});
