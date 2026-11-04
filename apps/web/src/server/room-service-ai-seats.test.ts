import {
  type AnyGameDefinition,
  createRng,
  currentState,
  fromRecord,
  GAME_CATEGORY,
  type GameDefinition,
  type PlayerIndex,
  RECORD_VERSION,
  type Rng,
} from "@board-games/engine";
import { ludo, tictactoe } from "@board-games/games";
import { ROOM_CODE_ALPHABET, type RoomCode } from "@board-games/protocol";
import { describe, expect, it, vi } from "vitest";

import { type RoomPlayer, STORED_ROOM_FORMAT, type StoredRoom, toRoomView } from "./room";
import { createRoomService, MAX_AI_MOVES_PER_WRITE, type ServiceResult } from "./room-service";
import { createMemoryRoomStore, type MemoryRoomStore } from "./store/memory";

// AI seats in online rooms (change `add-room-ai-seats`): the host marks empty seats, and the server
// plays them in the write that hands them the turn, with its own rng, through the game's rules.

/** Three players who never stop: seat 0 moves once, then seat 1 (an AI) for ever. */
const endlessGame = {
  id: "endless",
  meta: {
    players: { min: 3, max: 3 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 1,
    supportsAI: true,
  },
  defaultOptions: {},
  setup: () => ({ moves: 0 }),
  currentPlayer: (state) => (state.moves === 0 ? 0 : 1),
  legalMoves: () => [{ step: true }],
  applyMove: (state) => ({ moves: state.moves + 1 }),
  result: () => null,
  evaluate: () => 0,
} as const satisfies GameDefinition<{ moves: number }, { step: true }>;

/** A game without an AI: its rooms have no AI seats. */
const noAiGame = {
  ...endlessGame,
  id: "no-ai",
  meta: { ...endlessGame.meta, supportsAI: false },
} as const satisfies GameDefinition<{ moves: number }, { step: true }>;

interface RaceState {
  readonly steps: readonly number[];
  readonly toMove: PlayerIndex;
}

/** Three players step in turn; the first to take two steps wins. */
const raceGame = {
  id: "race",
  meta: { ...endlessGame.meta },
  defaultOptions: {},
  setup: () => ({ steps: [0, 0, 0], toMove: 0 }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => (state.steps.some((steps) => steps >= 2) ? [] : [{ step: true }]),
  applyMove: (state) => ({
    steps: state.steps.map((steps, seat) => (seat === state.toMove ? steps + 1 : steps)),
    toMove: (state.toMove + 1) % state.steps.length,
  }),
  result: (state) => {
    const winner = state.steps.findIndex((steps) => steps >= 2);
    return winner === -1 ? null : { kind: "win", winners: [winner] };
  },
  evaluate: (state, player) => state.steps[player] ?? 0,
} as const satisfies GameDefinition<RaceState, { step: true }>;

const GAMES: readonly AnyGameDefinition[] = [tictactoe, ludo, endlessGame, noAiGame, raceGame];

const LAN: RoomPlayer = { playerId: "lan-0123456789abcdef", name: "Lan" };
const AN: RoomPlayer = { playerId: "an-0123456789abcdefgh", name: "An" };
const BINH: RoomPlayer = { playerId: "binh-0123456789abcdef", name: "Bình" };
const CODE = "ABC234" as RoomCode;

/** Draws the room code first, then from `draws`, then like a seeded generator. */
function serverRng(seed: number, draws: number[] = []): Rng & { readonly draws: number[] } {
  const seeded = createRng(seed);
  const code = Array.from(CODE, (character) => ROOM_CODE_ALPHABET.indexOf(character));
  return {
    draws,
    nextInt: (min, max) => code.shift() ?? draws.shift() ?? seeded.nextInt(min, max),
    nextFloat: seeded.nextFloat,
  };
}

/** For a room put in the store by hand: the draws of its code are not needed. */
function skipRoomCode(rng: Rng): void {
  Array.from(CODE, () => rng.nextInt(0, ROOM_CODE_ALPHABET.length - 1));
}

function setup(seed = 1) {
  const store = createMemoryRoomStore();
  const rng = serverRng(seed);
  let clock = 1_000;
  const service = createRoomService({ store, rng, now: () => (clock += 1), games: GAMES });
  return { store, rng, service };
}

function expectOk<T>(result: ServiceResult<T>): T {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.value;
}

async function stored(store: MemoryRoomStore, code: RoomCode): Promise<StoredRoom> {
  const room = await store.get(code);
  if (room === null) throw new Error(`No room ${code}`);
  return room;
}

/** A room of `gameId` for `seats` players, created by Lan, with `others` seated after her. */
async function room(gameId: string, seats: number, others: readonly RoomPlayer[] = []) {
  const context = setup();
  const created = expectOk(
    await context.service.create({ gameId, playerCount: seats, player: LAN }),
  );
  for (const player of others) expectOk(await context.service.sit(created.code, player));
  return { ...context, code: created.code };
}

/** The game of `stored` replayed, and the seat that made each of its moves. */
function replay(game: AnyGameDefinition, { record }: StoredRoom) {
  const rebuilt = fromRecord(game, record);
  if (!rebuilt.ok) throw new Error(rebuilt.error);
  const movers = rebuilt.value.states
    .slice(0, -1)
    .map((state): PlayerIndex => game.currentPlayer(state));
  const state = currentState(rebuilt.value);
  return { state, movers, toMove: game.currentPlayer(state), result: game.result(state) };
}

/** A race for three with Lan first and the AI in the two other seats. */
async function raceWithTwoAis() {
  const context = await room("race", 3);
  expectOk(await context.service.setAiSeat(context.code, LAN.playerId, 1, true));
  expectOk(await context.service.setAiSeat(context.code, LAN.playerId, 2, true));
  return context;
}

const step = { step: true } as const;

describe("the host", () => {
  it("Người tạo là chủ phòng: tells everyone the creator's seat as the host's", async () => {
    const { service, code } = await room("tictactoe", 2);

    const forAn = expectOk(await service.sit(code, AN));

    expect(toRoomView(forAn, 0).host).toBe(0);
    expect(forAn.hostId).toBe(LAN.playerId);
  });

  it("Chủ phòng sau ván mới: follows the host into the second seat after a rematch", async () => {
    const context = await room("tictactoe", 2, [AN]);
    // Lan and An take turns until the game is over.
    for (const [cell, player] of [
      [0, LAN],
      [3, AN],
      [1, LAN],
      [4, AN],
      [2, LAN],
    ] as const) {
      const current = await stored(context.store, context.code);
      expectOk(
        await context.service.move(
          context.code,
          player.playerId,
          { gameNumber: 1, moveIndex: current.record.entries.length },
          { cell },
        ),
      );
    }

    const next = expectOk(await context.service.rematch(context.code, AN.playerId, 1));

    expect(toRoomView(next, 0).host).toBe(1);
  });
});

describe("marking AI seats", () => {
  it("Đánh dấu ghế máy: marks the third seat for everyone, the others still empty", async () => {
    const { service, code } = await room("ludo", 4);

    const marked = expectOk(await service.setAiSeat(code, LAN.playerId, 2, true));

    expect(toRoomView(marked, 0).seats).toEqual([
      { kind: "human", name: "Lan", standIn: false },
      null,
      { kind: "ai" },
      null,
    ]);
  });

  it("Ghế máy làm phòng đủ người: starts the game once the last empty seat is an AI seat", async () => {
    const { service, code } = await room("ludo", 4, [AN]);
    const third = expectOk(await service.setAiSeat(code, LAN.playerId, 2, true));
    expect(third.players).toContain(null);

    const full = expectOk(await service.setAiSeat(code, LAN.playerId, 3, true));

    expect(full.players).not.toContain(null);
    // Lan in the first seat moves first: the AI has nothing to play yet.
    expect(full.record.entries).toEqual([]);
    expect(replay(ludo, full).toMove).toBe(0);
    expect(
      expectOk(
        await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { type: "roll" }),
      ).record.entries.length,
    ).toBeGreaterThan(0);
  });

  it("Người mới không ngồi vào ghế máy: seats a newcomer in the empty seat, past the AI seat", async () => {
    const { service, code } = await room("ludo", 3);
    expectOk(await service.setAiSeat(code, LAN.playerId, 1, true));

    const seated = expectOk(await service.sit(code, AN));

    expect(seated.players).toEqual([
      { kind: "human", ...LAN, standIn: false },
      { kind: "ai" },
      { kind: "human", ...AN, standIn: false },
    ]);
  });

  it("refuses a newcomer once every seat is a person or the AI", async () => {
    const { service, code } = await room("ludo", 3, [AN]);
    expectOk(await service.setAiSeat(code, LAN.playerId, 2, true));

    expect(await service.sit(code, BINH)).toMatchObject({ ok: false, error: "room-full" });
  });

  it("Bỏ dấu ghế máy: empties an AI seat again", async () => {
    const { service, code } = await room("ludo", 4);
    expectOk(await service.setAiSeat(code, LAN.playerId, 2, true));

    const unmarked = expectOk(await service.setAiSeat(code, LAN.playerId, 2, false));

    expect(unmarked.players).toEqual([{ kind: "human", ...LAN, standIn: false }, null, null, null]);
  });

  it("Đánh dấu lại ghế máy: writes nothing when the seat is already an AI seat", async () => {
    const { service, code, store } = await room("ludo", 4);
    const marked = expectOk(await service.setAiSeat(code, LAN.playerId, 2, true));
    const update = vi.fn();
    store.intercept("update", update);

    const again = expectOk(await service.setAiSeat(code, LAN.playerId, 2, true));

    expect(again.revision).toBe(marked.revision);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("refusing AI seat changes", () => {
  /** Expects `request` refused with `code`, and the stored room untouched. */
  async function expectRefused(
    context: Awaited<ReturnType<typeof room>>,
    request: Promise<ServiceResult<StoredRoom>>,
    code: string,
  ) {
    const before = await stored(context.store, context.code);
    const result = await request;
    expect(result).toMatchObject({ ok: false, error: code });
    expect(await stored(context.store, context.code)).toEqual(before);
    // With the room as it is, for the client to show before the refusal.
    expect(!result.ok && result.room).toEqual(before);
  }

  it("Không phải chủ phòng: refuses anyone but the host", async () => {
    const context = await room("ludo", 4, [AN]);

    await expectRefused(
      context,
      context.service.setAiSeat(context.code, AN.playerId, 2, true),
      "not-host",
    );
  });

  it("Ván đã bắt đầu: refuses once the game has a move", async () => {
    const context = await room("ludo", 3, [AN]);
    expectOk(await context.service.setAiSeat(context.code, LAN.playerId, 2, true));
    expectOk(
      await context.service.move(
        context.code,
        LAN.playerId,
        { gameNumber: 1, moveIndex: 0 },
        { type: "roll" },
      ),
    );

    await expectRefused(
      context,
      context.service.setAiSeat(context.code, LAN.playerId, 2, false),
      "game-started",
    );
  });

  it.each([
    ["a seat a person holds", 1],
    ["the host's own seat", 0],
  ])("Ghế đã có người: refuses to mark %s", async (_label, seat) => {
    const context = await room("ludo", 4, [AN]);

    await expectRefused(
      context,
      context.service.setAiSeat(context.code, LAN.playerId, seat, true),
      "seat-taken",
    );
  });

  it.each([
    ["an empty seat", 2],
    ["a person's seat", 1],
  ])("Bỏ dấu ghế không phải ghế máy: refuses to unmark %s", async (_label, seat) => {
    const context = await room("ludo", 4, [AN]);

    await expectRefused(
      context,
      context.service.setAiSeat(context.code, LAN.playerId, seat, false),
      "not-ai-seat",
    );
  });

  it.each([
    ["the fifth seat of a three-seat room", 4],
    ["a negative seat", -1],
  ])("Ghế không có trong phòng: refuses %s", async (_label, seat) => {
    const context = await room("ludo", 3);

    await expectRefused(
      context,
      context.service.setAiSeat(context.code, LAN.playerId, seat, true),
      "invalid-seat",
    );
  });

  it("Phòng hai ghế: refuses AI seats in a room for two", async () => {
    const context = await room("tictactoe", 2);

    await expectRefused(
      context,
      context.service.setAiSeat(context.code, LAN.playerId, 1, true),
      "ai-not-supported",
    );
  });

  it("Game không hỗ trợ máy: refuses AI seats for a game without an AI", async () => {
    const context = await room("no-ai", 3);

    await expectRefused(
      context,
      context.service.setAiSeat(context.code, LAN.playerId, 1, true),
      "ai-not-supported",
    );
  });

  it("refuses everyone in a room stored before hosts", async () => {
    const context = await room("ludo", 3);
    const current = await stored(context.store, context.code);
    context.store.writeRaw(
      context.code,
      current.revision,
      JSON.stringify({ ...current, hostId: null }),
    );

    await expectRefused(
      context,
      context.service.setAiSeat(context.code, LAN.playerId, 1, true),
      "not-host",
    );
  });
});

describe("the server plays the AI seats", () => {
  it("Máy đi sau nước của người: the three AIs roll and move before it is the person's turn again", async () => {
    const context = await room("ludo", 4);
    for (const seat of [1, 2, 3]) {
      expectOk(await context.service.setAiSeat(context.code, LAN.playerId, seat, true));
    }
    // Lan rolls a 1 and cannot move; the first AI rolls a 6 and has a horse to bring out.
    context.rng.draws.push(0, 5);

    const after = expectOk(
      await context.service.move(
        context.code,
        LAN.playerId,
        { gameNumber: 1, moveIndex: 0 },
        { type: "roll" },
      ),
    );

    const { movers, toMove } = replay(ludo, after);
    expect(toMove).toBe(0);
    expect(movers[0]).toBe(0);
    expect(movers.slice(1).every((seat) => seat !== 0)).toBe(true);
    expect(new Set(movers.slice(1))).toEqual(new Set([1, 2, 3]));
    expect(after.record.entries[1]).toEqual({ move: { type: "roll" }, outcome: 6 });
    expect(after.record.entries[2]).toMatchObject({ move: { type: "move" } });
  });

  it("draws every roll of the AIs from the server's rng", async () => {
    const context = await room("ludo", 4);
    for (const seat of [1, 2, 3]) {
      expectOk(await context.service.setAiSeat(context.code, LAN.playerId, seat, true));
    }
    context.rng.draws.push(0, 1, 2, 3);

    const after = expectOk(
      await context.service.move(
        context.code,
        LAN.playerId,
        { gameNumber: 1, moveIndex: 0 },
        { type: "roll" },
      ),
    );

    expect(after.record.entries).toEqual(
      [1, 2, 3, 4].map((outcome) => ({ move: { type: "roll" }, outcome })),
    );
  });

  it("Người chơi rời đi ngay sau nước của mình: the store already holds the AIs' moves", async () => {
    const context = await room("ludo", 4);
    for (const seat of [1, 2, 3]) {
      expectOk(await context.service.setAiSeat(context.code, LAN.playerId, seat, true));
    }

    const answered = expectOk(
      await context.service.move(
        context.code,
        LAN.playerId,
        { gameNumber: 1, moveIndex: 0 },
        { type: "roll" },
      ),
    );

    const kept = await stored(context.store, context.code);
    expect(kept).toEqual(answered);
    expect(replay(ludo, kept).toMove).toBe(0);
  });

  it("answers a person's move with the moves of every AI seat after it, in the same write", async () => {
    const context = await raceWithTwoAis();

    const after = expectOk(
      await context.service.move(context.code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, step),
    );

    expect(replay(raceGame, after).movers).toEqual([0, 1, 2]);
    expect(after.revision).toBe((await stored(context.store, context.code)).revision);
  });

  it("Ván mới với ghế máy đi đầu: the new game comes with the AI's first move", async () => {
    const context = await raceWithTwoAis();
    expectOk(
      await context.service.move(context.code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, step),
    );
    const won = expectOk(
      await context.service.move(context.code, LAN.playerId, { gameNumber: 1, moveIndex: 3 }, step),
    );
    expect(replay(raceGame, won).result).toEqual({ kind: "win", winners: [0] });

    const next = expectOk(await context.service.rematch(context.code, LAN.playerId, 1));

    expect(next.players).toEqual([
      { kind: "ai" },
      { kind: "human", ...LAN, standIn: false },
      { kind: "ai" },
    ]);
    expect(next.record.entries).toHaveLength(1);
    expect(replay(raceGame, next).toMove).toBe(1);
  });

  /** A race left on the AI's turn: an AI in the first seat of a second game. */
  async function roomOnAiTurn(context: ReturnType<typeof setup>) {
    const stuck: StoredRoom = {
      format: STORED_ROOM_FORMAT,
      code: CODE,
      gameId: "race",
      revision: 5,
      gameNumber: 2,
      hostId: LAN.playerId,
      players: [{ kind: "ai" }, { kind: "human", ...LAN, standIn: false }, { kind: "ai" }],
      record: { version: RECORD_VERSION, gameId: "race", playerCount: 3, options: {}, entries: [] },
      updatedAt: 1_000,
      turnStartedAt: 1_000,
    };
    await context.store.create(stuck);
    return stuck;
  }

  it("Phòng dừng ở lượt máy: plays on when a seated player comes back", async () => {
    const context = setup();
    skipRoomCode(context.rng);
    await roomOnAiTurn(context);

    const joined = expectOk(await context.service.join(CODE, LAN.playerId, LAN.name));

    expect(joined.record.entries).toHaveLength(1);
    expect(joined.revision).toBe(6);
    expect(await stored(context.store, CODE)).toEqual(joined);
  });

  it("plays on when a seated player comes back without a name, keeping theirs", async () => {
    const context = setup();
    skipRoomCode(context.rng);
    await roomOnAiTurn(context);

    const joined = expectOk(await context.service.join(CODE, LAN.playerId, null));

    expect(joined.record.entries).toHaveLength(1);
    expect(joined.players[1]).toEqual({ kind: "human", ...LAN, standIn: false });
    expect(await stored(context.store, CODE)).toEqual(joined);
  });

  it("does not play on for someone without a seat", async () => {
    const context = setup();
    skipRoomCode(context.rng);
    const stuck = await roomOnAiTurn(context);

    expect(expectOk(await context.service.join(CODE, AN.playerId, AN.name))).toEqual(stuck);
  });

  it("Không ai đi thay ghế máy: refuses a person's move on the AI's turn", async () => {
    const context = setup();
    skipRoomCode(context.rng);
    const stuck = await roomOnAiTurn(context);

    expect(
      await context.service.move(CODE, LAN.playerId, { gameNumber: 2, moveIndex: 0 }, step),
    ).toMatchObject({ ok: false, error: "not-your-turn" });
    expect(await stored(context.store, CODE)).toEqual(stuck);
  });

  it("decides the AI's moves again on the newer room after a conflicting write", async () => {
    const context = await raceWithTwoAis();
    // Another instance renames Lan just before this write lands.
    let raced = false;
    context.store.intercept("update", async () => {
      if (raced) return;
      raced = true;
      expectOk(await context.service.join(context.code, LAN.playerId, "Lan Anh"));
    });

    const after = expectOk(
      await context.service.move(context.code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, step),
    );

    expect(after.record.entries).toHaveLength(3);
    expect(after.players[0]).toEqual({ kind: "human", ...LAN, name: "Lan Anh", standIn: false });
    expect(await stored(context.store, context.code)).toEqual(after);
  });

  it("stops a chain of AI moves at the safety net, and plays on at the next join", async () => {
    const context = await room("endless", 3);
    expectOk(await context.service.setAiSeat(context.code, LAN.playerId, 1, true));
    expectOk(await context.service.setAiSeat(context.code, LAN.playerId, 2, true));

    const after = expectOk(
      await context.service.move(context.code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, step),
    );
    expect(after.record.entries).toHaveLength(1 + MAX_AI_MOVES_PER_WRITE);

    const joined = expectOk(await context.service.join(context.code, LAN.playerId, LAN.name));
    expect(joined.record.entries).toHaveLength(1 + 2 * MAX_AI_MOVES_PER_WRITE);
  });

  it("plays a legal move at random when the AI fails, and says so once per chain", async () => {
    const failing = {
      ...endlessGame,
      legalMoves: () => [{ step: true }, { step: false }],
      evaluate: () => {
        throw new Error("The AI is broken");
      },
    } satisfies GameDefinition<{ moves: number }, { step: boolean }>;
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = createMemoryRoomStore();
    const service = createRoomService({ store, rng: serverRng(1), now: () => 1, games: [failing] });
    const { code } = expectOk(await service.create({ gameId: "endless", player: LAN }));
    expectOk(await service.setAiSeat(code, LAN.playerId, 1, true));
    expectOk(await service.setAiSeat(code, LAN.playerId, 2, true));

    const after = expectOk(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, step),
    );

    expect(after.record.entries).toHaveLength(1 + MAX_AI_MOVES_PER_WRITE);
    expect(logged).toHaveBeenCalledOnce();
    logged.mockRestore();
  });
});
