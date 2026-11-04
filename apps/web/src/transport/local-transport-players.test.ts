import { createRng, type GameDefinition, type Rng } from "@board-games/engine";
import {
  diceRaceAiGame,
  diceRaceGame,
  type DiceRaceMove,
  type DiceRaceState,
  rollChooseGame,
  type RollChooseMove,
  type RollChooseState,
} from "@board-games/engine/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AI_RESULT_DELAY_MS, AI_SETTLE_DELAY_MS, AI_THROW_DELAY_MS } from "./ai-timing";
import { createLocalTransport } from "./local-transport";
import { createMemoryStore } from "./memory-store";
import type {
  AiPlayer,
  AiRequest,
  AiSetup,
  FirstPlayer,
  LocalSetup,
  ModeSettings,
  ReadySnapshot,
  SavedGameStore,
  Transport,
  TransportEvent,
} from "./types";

// Games of 2–4 players with dice, from the engine's sample games: a race where every move is a roll,
// and a game whose every turn is a roll followed by a choice.

type RaceTransport = Transport<DiceRaceState, DiceRaceMove, number>;
type RollChooseTransport = Transport<RollChooseState, RollChooseMove, number>;

const ROLL = { type: "roll" } as const;
const SAFE = { type: "safe" } as const;
const HUMAN = { kind: "human" } as const;
const ai = (level: "easy" | "medium" | "hard") => ({ kind: "ai", level }) as const;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** The ready snapshot once the saved game has been read. */
async function ready<State, Move, Outcome>(
  transport: Transport<State, Move, Outcome>,
): Promise<ReadySnapshot<State, Move, Outcome>> {
  await vi.advanceTimersByTimeAsync(0);
  return readySnapshot(transport);
}

function readySnapshot<State, Move, Outcome>(
  transport: Transport<State, Move, Outcome>,
): ReadySnapshot<State, Move, Outcome> {
  const snapshot = transport.getSnapshot();
  if (snapshot.status !== "ready") throw new Error("transport is still loading");
  return snapshot;
}

function recordEvents(transport: Transport<unknown, unknown, unknown>): TransportEvent[] {
  const events: TransportEvent[] = [];
  transport.subscribe((event) => events.push(event));
  return events;
}

/** An AI that plays the first legal move of `definition`, recording what it was asked. */
function firstMoveAi<State, Move, Outcome, Options extends object>(
  definition: GameDefinition<State, Move, Outcome, Options>,
): AiPlayer & { readonly requests: AiRequest[] } {
  const requests: AiRequest[] = [];
  return {
    requests,
    chooseMove: (request) => {
      requests.push(request);
      return Promise.resolve(definition.legalMoves(request.state as State)[0]);
    },
    dispose: () => undefined,
  };
}

/**
 * Answers the draws of the player's seat in a game of `playerCount` (`nextInt(0, playerCount − 1)`)
 * with `seatDraws`, in turn; every other draw (dice, seeds), and any seat draw past the list, gets
 * the lowest value.
 */
function seatRng(playerCount: number, seatDraws: readonly number[]): Rng {
  const draws = [...seatDraws];
  return {
    nextInt: (min, max) =>
      min === 0 && max === playerCount - 1 && draws.length > 0 ? (draws.shift() ?? min) : min,
    nextFloat: () => 0,
  };
}

function race(
  store: SavedGameStore,
  { start, fallback }: { start?: LocalSetup; fallback?: LocalSetup } = {},
): RaceTransport {
  return createLocalTransport({
    definition: diceRaceGame,
    store,
    rng: createRng(7),
    start,
    fallback,
  });
}

function raceVsAi(
  store: SavedGameStore,
  {
    start,
    fallback = { mode: "ai", level: "easy", first: "human" },
    rng = createRng(7),
    aiPlayer = firstMoveAi(diceRaceAiGame),
  }: { start?: AiSetup; fallback?: AiSetup; rng?: Rng; aiPlayer?: AiPlayer } = {},
): RaceTransport {
  return createLocalTransport({
    definition: diceRaceAiGame,
    store,
    rng,
    mode: "ai",
    start,
    fallback,
    ai: aiPlayer,
  });
}

/** A saved same-device race of `playerCount` players, after `rolls` rolls. */
function savedRace(playerCount: number, rolls: number[]) {
  return {
    "dice-race:local": {
      settings: { kind: "local" } satisfies ModeSettings,
      record: {
        version: 1,
        gameId: "dice-race",
        playerCount,
        options: { target: 20 },
        entries: rolls.map((outcome) => ({ move: ROLL, outcome })),
      },
    },
  };
}

describe("createLocalTransport: number of players", () => {
  it("plays a same-device game for 3, each player in turn", async () => {
    const transport = race(createMemoryStore(), { start: { mode: "local", playerCount: 3 } });

    const snapshot = await ready(transport);
    expect(snapshot.seats).toEqual([HUMAN, HUMAN, HUMAN]);
    expect(snapshot.state.positions).toHaveLength(3);
    const turns = [snapshot.currentPlayer];
    for (let roll = 0; roll < 3; roll += 1) {
      transport.submit(ROLL);
      turns.push(readySnapshot(transport).currentPlayer);
    }
    expect(turns).toEqual([0, 1, 2, 0]);
  });

  it("keeps the number of players for a new game once a game for 4 has ended", async () => {
    const transport = race(createMemoryStore(), {
      start: { mode: "local", playerCount: 4, options: { target: 5 } },
    });
    await ready(transport);
    // Every roll moves at least 1, so someone reaches 5 within 20 rolls.
    for (let roll = 0; roll < 20 && readySnapshot(transport).result === null; roll += 1) {
      transport.submit(ROLL);
    }
    expect(readySnapshot(transport).result).not.toBeNull();

    transport.requestNewGame();

    const snapshot = readySnapshot(transport);
    expect(snapshot.result).toBeNull();
    expect(snapshot.moveCount).toBe(0);
    expect(snapshot.state.positions).toEqual([0, 0, 0, 0]);
    expect(snapshot.seats).toHaveLength(4);
    expect(snapshot.options).toEqual({ target: 5 });
  });

  it("restores a game for 3 after a reload, its moves and whose turn it is", async () => {
    const store = createMemoryStore();
    const first = race(store, { start: { mode: "local", playerCount: 3 } });
    await ready(first);
    first.submit(ROLL);
    first.submit(ROLL);
    const before = readySnapshot(first).state;
    first.dispose();

    const snapshot = await ready(race(store));

    expect(snapshot.state).toEqual(before);
    expect(snapshot.currentPlayer).toBe(2);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.seats).toHaveLength(3);
  });

  it.each([5, 1, 2.5, "4", null])(
    "resumes the saved game, without writing over it, when the address asks for %j players",
    async (playerCount) => {
      const store = createMemoryStore(savedRace(3, [4, 2]));
      const saved = store.entries.get("dice-race:local");

      const snapshot = await ready(race(store, { start: { mode: "local", playerCount } }));

      expect(snapshot.moveCount).toBe(2);
      expect(snapshot.state.positions).toEqual([4, 2, 0]);
      expect(store.entries.get("dice-race:local")).toBe(saved);
    },
  );

  it("sets up a game like the last one chosen when none is saved", async () => {
    const snapshot = await ready(
      race(createMemoryStore(), { fallback: { mode: "local", playerCount: 4 } }),
    );

    expect(snapshot.state.positions).toHaveLength(4);
  });

  it("keeps the remembered number of players when only the remembered rules are refused", async () => {
    const snapshot = await ready(
      race(createMemoryStore(), {
        fallback: { mode: "local", playerCount: 4, options: { target: 2 } },
      }),
    );

    expect(snapshot.state.positions).toHaveLength(4);
    expect(snapshot.options).toEqual({ target: 20 });
  });

  it("falls back to the game's smallest number when the remembered one is refused", async () => {
    const snapshot = await ready(
      race(createMemoryStore(), { fallback: { mode: "local", playerCount: 9 } }),
    );

    expect(snapshot.state.positions).toHaveLength(2);
  });
});

describe("createLocalTransport against several AIs: seats", () => {
  it("seats the player in any seat, drawn evenly, when who moves first is random", async () => {
    const draws = [0, 1, 2, 3];
    const humanSeats: number[] = [];
    for (let draw = 0; draw < draws.length; draw += 1) {
      const snapshot = await ready(
        raceVsAi(createMemoryStore(), {
          start: { mode: "ai", level: "easy", first: "random", playerCount: 4 },
          rng: seatRng(4, [draw]),
        }),
      );
      humanSeats.push(snapshot.seats.findIndex((seat) => seat.kind === "human"));
      expect(snapshot.seats.filter((seat) => seat.kind === "ai")).toHaveLength(3);
    }

    expect(humanSeats).toEqual([0, 1, 2, 3]);
  });

  it("draws the player's seat among all four, with a real random source", async () => {
    const rng = createRng(3);
    const humanSeats = new Set<number>();
    for (let game = 0; game < 40; game += 1) {
      const snapshot = await ready(
        raceVsAi(createMemoryStore(), {
          start: { mode: "ai", level: "easy", first: "random", playerCount: 4 },
          rng,
          // Never answers: only the seats matter here.
          aiPlayer: { chooseMove: () => new Promise(() => undefined), dispose: () => undefined },
        }),
      );
      humanSeats.add(snapshot.seats.findIndex((seat) => seat.kind === "human"));
    }

    expect(humanSeats).toEqual(new Set([0, 1, 2, 3]));
  });

  it("lets one AI move first in a game for 3 when the AI moves first, then the player", async () => {
    const aiPlayer = firstMoveAi(diceRaceAiGame);
    const transport = raceVsAi(createMemoryStore(), {
      start: { mode: "ai", level: "medium", first: "ai", playerCount: 3 },
      aiPlayer,
    });

    const snapshot = await ready(transport);
    expect(snapshot.seats).toEqual([ai("medium"), HUMAN, ai("medium")]);
    expect(snapshot.viewer).toBe(1);
    expect(snapshot.waitingFor).toBe("ai");

    await vi.advanceTimersByTimeAsync(AI_SETTLE_DELAY_MS);

    const after = readySnapshot(transport);
    expect(aiPlayer.requests).toHaveLength(1);
    expect(after.moveCount).toBe(1);
    expect(after.currentPlayer).toBe(1);
    expect(after.canMove).toBe(true);
  });

  it("lets three AIs move in turn after the player, one move each, then the player again", async () => {
    const aiPlayer = firstMoveAi(diceRaceAiGame);
    const transport = raceVsAi(createMemoryStore(), {
      start: { mode: "ai", level: "easy", first: "human", playerCount: 4 },
      aiPlayer,
    });
    expect((await ready(transport)).seats).toEqual([HUMAN, ai("easy"), ai("easy"), ai("easy")]);

    transport.submit(ROLL);
    // The player's roll is thrown first: the AI waits for it longer than for its own rolls.
    await vi.advanceTimersByTimeAsync(AI_THROW_DELAY_MS - AI_RESULT_DELAY_MS);
    expect(readySnapshot(transport).moveCount).toBe(1);
    const movers: number[] = [];
    while (readySnapshot(transport).waitingFor === "ai") {
      await vi.advanceTimersByTimeAsync(AI_RESULT_DELAY_MS);
      const { lastMover } = readySnapshot(transport);
      if (lastMover !== null) movers.push(lastMover);
    }

    const snapshot = readySnapshot(transport);
    expect(movers).toEqual([1, 2, 3]);
    expect(aiPlayer.requests.map((request) => request.level)).toEqual(["easy", "easy", "easy"]);
    expect(snapshot.moveCount).toBe(4);
    expect(snapshot.currentPlayer).toBe(0);
    expect(snapshot.canMove).toBe(true);
  });

  it("keeps the number of players, the level and the seats for a new game", async () => {
    const transport = raceVsAi(createMemoryStore(), {
      start: { mode: "ai", level: "hard", first: "human", playerCount: 4 },
    });
    await ready(transport);

    transport.requestNewGame();

    expect(readySnapshot(transport).seats).toEqual([HUMAN, ai("hard"), ai("hard"), ai("hard")]);
  });

  it("draws the player's seat again for a new game when it is random", async () => {
    const transport = raceVsAi(createMemoryStore(), {
      start: { mode: "ai", level: "hard", first: "random", playerCount: 4 },
      rng: seatRng(4, [3, 1]),
      aiPlayer: { chooseMove: () => new Promise(() => undefined), dispose: () => undefined },
    });
    expect((await ready(transport)).viewer).toBe(3);

    transport.requestNewGame();

    expect(readySnapshot(transport).viewer).toBe(1);
    expect(readySnapshot(transport).seats).toHaveLength(4);
  });

  it("restores the player's seat and the AI seats after a reload", async () => {
    const store = createMemoryStore();
    const first = raceVsAi(store, {
      start: { mode: "ai", level: "medium", first: "random", playerCount: 3 },
      rng: seatRng(3, [2]),
    });
    await ready(first);
    await vi.advanceTimersByTimeAsync(4 * AI_RESULT_DELAY_MS);
    const before = readySnapshot(first);
    expect(before.currentPlayer).toBe(2);
    first.dispose();

    const snapshot = await ready(raceVsAi(store));

    expect(snapshot.seats).toEqual([ai("medium"), ai("medium"), HUMAN]);
    expect(snapshot.viewer).toBe(2);
    expect(snapshot.state).toEqual(before.state);
  });
});

function rollChoose(store: SavedGameStore, rng: Rng = createRng(5)): RollChooseTransport {
  return createLocalTransport({ definition: rollChooseGame, store, rng });
}

function rollChooseVsAi(
  store: SavedGameStore,
  {
    first = "human",
    aiPlayer = firstMoveAi(rollChooseGame),
  }: { first?: FirstPlayer; aiPlayer?: AiPlayer } = {},
): RollChooseTransport {
  return createLocalTransport({
    definition: rollChooseGame,
    store,
    rng: createRng(5),
    mode: "ai",
    start: { mode: "ai", level: "easy", first },
    fallback: { mode: "ai", level: "easy", first },
    ai: aiPlayer,
  });
}

describe("createLocalTransport: the AI's pace in a game with dice", () => {
  it("waits for the player to read the AI's own roll before its next move", async () => {
    const transport = rollChooseVsAi(createMemoryStore(), { first: "ai" });
    await ready(transport);
    await vi.advanceTimersByTimeAsync(AI_SETTLE_DELAY_MS);
    expect(readySnapshot(transport).lastEntry?.move).toEqual(ROLL);

    await vi.advanceTimersByTimeAsync(AI_RESULT_DELAY_MS - 1);
    expect(readySnapshot(transport).moveCount).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(readySnapshot(transport).moveCount).toBe(2);
    expect(AI_RESULT_DELAY_MS).toBeLessThan(2000);
  });

  it("Máy chờ cú tung của người chơi: waits for the throw of the player's roll, then moves within 3 s of it", async () => {
    const aiPlayer = firstMoveAi(diceRaceAiGame);
    const transport = raceVsAi(createMemoryStore(), {
      start: { mode: "ai", level: "easy", first: "human", playerCount: 2 },
      aiPlayer,
    });
    await ready(transport);

    // The player's roll ends the turn: the number is known now.
    transport.submit(ROLL);
    expect(readySnapshot(transport)).toMatchObject({ moveCount: 1, waitingFor: "ai" });

    await vi.advanceTimersByTimeAsync(AI_THROW_DELAY_MS - 1);
    expect(readySnapshot(transport).moveCount).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(readySnapshot(transport)).toMatchObject({ moveCount: 2, lastMover: 1 });
    expect(AI_THROW_DELAY_MS).toBeLessThan(3000);
  });

  it("waits after the player's roll as after its own", async () => {
    const transport = rollChooseVsAi(createMemoryStore(), { first: "ai" });
    await ready(transport);
    await vi.advanceTimersByTimeAsync(AI_SETTLE_DELAY_MS + AI_RESULT_DELAY_MS);
    // Seat 1, the player: rolls, chooses, then seat 0 rolls.
    transport.submit(ROLL);
    transport.submit(SAFE);

    await vi.advanceTimersByTimeAsync(AI_SETTLE_DELAY_MS - 1);
    expect(readySnapshot(transport).moveCount).toBe(4);
    await vi.advanceTimersByTimeAsync(1);
    expect(readySnapshot(transport).moveCount).toBe(5);
  });

  it("never rolls before the player's move has had its time on the board", async () => {
    const transport = rollChooseVsAi(createMemoryStore());
    await ready(transport);
    transport.submit(ROLL);
    transport.submit(SAFE);

    await vi.advanceTimersByTimeAsync(AI_SETTLE_DELAY_MS - 1);
    expect(readySnapshot(transport).moveCount).toBe(2);
    expect(readySnapshot(transport).waitingFor).toBe("ai");

    await vi.advanceTimersByTimeAsync(1);
    expect(readySnapshot(transport).lastEntry?.move).toEqual(ROLL);
    expect(readySnapshot(transport).moveCount).toBe(3);
  });

  it("drops the AI's move when the player undoes while it waits", async () => {
    const transport = rollChooseVsAi(createMemoryStore());
    await ready(transport);
    transport.submit(ROLL);
    const { rolled } = readySnapshot(transport).state;
    transport.submit(SAFE);

    transport.requestUndo();
    await vi.advanceTimersByTimeAsync(2 * AI_RESULT_DELAY_MS);

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(1);
    expect(snapshot.state.rolled).toBe(rolled);
    expect(snapshot.canMove).toBe(true);
  });
});

describe("createLocalTransport: undo never takes back a roll", () => {
  it("takes back the move chosen after a roll, keeping the roll, on a shared device", async () => {
    const transport = rollChoose(createMemoryStore());
    await ready(transport);
    transport.submit(ROLL);
    const { rolled } = readySnapshot(transport).state;
    transport.submit(SAFE);
    expect(readySnapshot(transport).canUndo).toBe(true);

    transport.requestUndo();

    const snapshot = readySnapshot(transport);
    expect(snapshot.state.rolled).toBe(rolled);
    expect(snapshot.currentPlayer).toBe(0);
    expect(snapshot.legalMoves).toContainEqual(SAFE);
    expect(snapshot.canUndo).toBe(false);
  });

  it("cannot undo a roll before a move is chosen for it", async () => {
    const transport = rollChoose(createMemoryStore());
    await ready(transport);
    transport.submit(ROLL);
    const before = readySnapshot(transport);
    const events = recordEvents(transport);

    expect(before.canUndo).toBe(false);
    transport.requestUndo();

    expect(readySnapshot(transport)).toBe(before);
    expect(events).toEqual([{ type: "rejected", code: "nothing-to-undo" }]);
  });

  it("cannot undo in a game where every move is a roll", async () => {
    const transport = race(createMemoryStore(), { start: { mode: "local", playerCount: 3 } });
    await ready(transport);
    transport.submit(ROLL);

    expect(readySnapshot(transport).canUndo).toBe(false);
  });

  it("restores the same roll after undoing the move chosen for it and reloading", async () => {
    const store = createMemoryStore();
    const first = rollChoose(store);
    await ready(first);
    first.submit(ROLL);
    const { rolled } = readySnapshot(first).state;
    first.submit(SAFE);
    first.requestUndo();
    await vi.advanceTimersByTimeAsync(0);
    first.dispose();

    const snapshot = await ready(rollChoose(store, createRng(99)));

    expect(snapshot.moveCount).toBe(1);
    expect(snapshot.state.rolled).toBe(rolled);
    expect(snapshot.legalMoves).toContainEqual(SAFE);
  });

  it("cannot undo against the AI once the AI has rolled after the player's move", async () => {
    const transport = rollChooseVsAi(createMemoryStore());
    await ready(transport);
    transport.submit(ROLL);
    transport.submit(SAFE);

    await vi.advanceTimersByTimeAsync(AI_SETTLE_DELAY_MS);
    expect(readySnapshot(transport).lastEntry?.move).toEqual(ROLL);
    expect(readySnapshot(transport).canUndo).toBe(false);

    await vi.advanceTimersByTimeAsync(AI_RESULT_DELAY_MS);
    expect(readySnapshot(transport).currentPlayer).toBe(0);
    expect(readySnapshot(transport).canUndo).toBe(false);
  });

  it("takes back the player's move before the AI rolls, keeping the player's roll", async () => {
    const aiPlayer = firstMoveAi(rollChooseGame);
    const transport = rollChooseVsAi(createMemoryStore(), { aiPlayer });
    await ready(transport);
    transport.submit(ROLL);
    const { rolled } = readySnapshot(transport).state;
    transport.submit(SAFE);
    expect(readySnapshot(transport).canUndo).toBe(true);

    transport.requestUndo();
    await vi.advanceTimersByTimeAsync(2 * AI_RESULT_DELAY_MS);

    const snapshot = readySnapshot(transport);
    expect(snapshot.state.rolled).toBe(rolled);
    expect(snapshot.moveCount).toBe(1);
    expect(snapshot.canMove).toBe(true);
    expect(snapshot.canUndo).toBe(false);
    // The AI was asked once its turn began, but its roll was dropped with the undone move.
    expect(aiPlayer.requests).toHaveLength(1);
    expect(snapshot.lastEntry?.move).toEqual(ROLL);
    expect(snapshot.waitingFor).toBeNull();
  });

  it("redoes the move chosen for the same roll on a shared device", async () => {
    const transport = rollChoose(createMemoryStore());
    await ready(transport);
    transport.submit(ROLL);
    transport.submit(SAFE);
    const played = readySnapshot(transport);
    transport.requestUndo();

    transport.requestRedo();

    const snapshot = readySnapshot(transport);
    expect(snapshot.moveCount).toBe(2);
    expect(snapshot.state).toEqual(played.state);
    expect(snapshot.lastEntry).toEqual({ move: SAFE });
    expect(snapshot.canRedo).toBe(false);
  });

  it("redoes the player's move up to the AI's turn, and the AI then rolls anew", async () => {
    const aiPlayer = firstMoveAi(rollChooseGame);
    const transport = rollChooseVsAi(createMemoryStore(), { aiPlayer });
    await ready(transport);
    transport.submit(ROLL);
    transport.submit(SAFE);
    const played = readySnapshot(transport);
    transport.requestUndo();

    transport.requestRedo();

    const redone = readySnapshot(transport);
    expect(redone.moveCount).toBe(2);
    expect(redone.state).toEqual(played.state);
    expect(redone.canRedo).toBe(false);
    expect(redone.waitingFor).toBe("ai");

    await vi.advanceTimersByTimeAsync(AI_SETTLE_DELAY_MS);

    const rolled = readySnapshot(transport);
    expect(rolled.moveCount).toBe(3);
    expect(rolled.lastMover).toBe(1);
    expect(rolled.lastEntry?.move).toEqual(ROLL);
    expect(rolled.lastEntry).toHaveProperty("outcome");
    expect(rolled.canUndo).toBe(false);
  });

  it("saves the roll but not the move undone after it", async () => {
    const store = createMemoryStore();
    const transport = rollChoose(store);
    await ready(transport);
    transport.submit(ROLL);
    transport.submit(SAFE);
    transport.requestUndo();
    await vi.advanceTimersByTimeAsync(0);

    const saved = store.entries.get("roll-choose:local")?.record;
    expect(saved).toMatchObject({ playerCount: 2, entries: [{ move: ROLL }] });
  });
});
