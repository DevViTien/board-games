import {
  type AnyGameDefinition,
  GAME_CATEGORY,
  type GameDefinition,
  type PlayerIndex,
  type Rng,
} from "@board-games/engine";
import { tictactoe } from "@board-games/games";
import { ROOM_CODE_ALPHABET, type RoomCode } from "@board-games/protocol";
import { describe, expect, it, vi } from "vitest";

import { type RoomPlayer, seatOf, type StoredRoom, toRoomView } from "./room";
import { createRoomService, type ServiceResult } from "./room-service";
import { createMemoryRoomStore, type MemoryRoomStore } from "./store/memory";

// --- fixtures ---------------------------------------------------------------------------------

interface DiceState {
  readonly positions: readonly number[];
  readonly toMove: PlayerIndex;
}

/** 2–3 players roll a die in turn; the first to reach 3 wins. Has random outcomes and options. */
const diceGame = {
  id: "dice",
  meta: {
    players: { min: 2, max: 3 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 1,
    supportsAI: false,
  },
  defaultOptions: { target: 3 },
  parseOptions: (raw: unknown) =>
    typeof raw === "object" &&
    raw !== null &&
    "target" in raw &&
    (raw.target === 3 || raw.target === 6)
      ? { target: raw.target }
      : null,
  setup: ({ playerCount }) => ({
    positions: Array.from({ length: playerCount }, () => 0),
    toMove: 0,
  }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) =>
    state.positions.some((position) => position >= 3) ? [] : [{ roll: true }],
  outcomes: () => [1, 2, 3, 4, 5, 6].map((face) => ({ outcome: face, weight: 1 })),
  applyMove: (state, _move, outcome = 0) => ({
    positions: state.positions.map((position, seat) =>
      seat === state.toMove ? position + outcome : position,
    ),
    toMove: (state.toMove + 1) % state.positions.length,
  }),
  result: (state) => {
    const winner = state.positions.findIndex((position) => position >= 3);
    return winner === -1 ? null : { kind: "win", winners: [winner] };
  },
} as const satisfies GameDefinition<DiceState, { roll: true }, number, { target: number }>;

const GAMES: readonly AnyGameDefinition[] = [tictactoe, diceGame];

const LAN: RoomPlayer = { playerId: "lan-0123456789abcdef", name: "Lan" };
const AN: RoomPlayer = { playerId: "an-0123456789abcdefgh", name: "An" };
const BINH: RoomPlayer = { playerId: "binh-0123456789abcdef", name: "Bình" };

/** An rng that answers `nextInt` from `draws`, then with `min`. */
function scriptedRng(draws: number[] = []): Rng & { readonly draws: number[] } {
  return {
    draws,
    nextInt: (min) => draws.shift() ?? min,
    nextFloat: () => 0,
  };
}

/** The draws that make the service generate `code`. */
function drawsFor(code: string): number[] {
  return Array.from(code, (character) => ROOM_CODE_ALPHABET.indexOf(character));
}

function setup(draws: number[] = drawsFor("ABC234")) {
  const store = createMemoryRoomStore();
  const rng = scriptedRng(draws);
  let clock = 1_000;
  const service = createRoomService({ store, rng, now: () => (clock += 1), games: GAMES });
  return { store, rng, service };
}

function expectOk<T>(result: ServiceResult<T>): T {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.value;
}

/** A Tic-tac-toe room ABC234 with Lan in seat 0 and, if `full`, An in seat 1. */
async function tictactoeRoom({ full = true } = {}) {
  const context = setup();
  const room = expectOk(await context.service.create({ gameId: "tictactoe", player: LAN }));
  if (full) expectOk(await context.service.sit(room.code, AN));
  return { ...context, code: room.code };
}

async function stored(store: MemoryRoomStore, code: RoomCode): Promise<StoredRoom> {
  const room = await store.get(code);
  if (room === null) throw new Error(`No room ${code}`);
  return room;
}

/** Plays `cells` in order, alternating seats from Lan. */
async function play(context: Awaited<ReturnType<typeof tictactoeRoom>>, cells: number[]) {
  for (const cell of cells) {
    const room = await stored(context.store, context.code);
    const player = room.record.entries.length % 2 === 0 ? room.players[0] : room.players[1];
    expectOk(
      await context.service.move(
        context.code,
        player?.playerId ?? "",
        { gameNumber: room.gameNumber, moveIndex: room.record.entries.length },
        { cell },
      ),
    );
  }
}

// --- create -----------------------------------------------------------------------------------

describe("create", () => {
  it("creates a Tic-tac-toe room with the creator in the first seat", async () => {
    const { service } = setup();

    const room = expectOk(await service.create({ gameId: "tictactoe", player: LAN }));

    expect(room.code).toMatch(new RegExp(`^[${ROOM_CODE_ALPHABET}]{6}$`, "u"));
    const joined = expectOk(await service.join(room.code, AN));
    expect(seatOf(joined, AN.playerId)).toBeNull();
    expect(joined.players).toEqual([LAN, null]);
    expect(joined.record.entries).toEqual([]);
    expect(joined).toMatchObject({ revision: 1, gameNumber: 1, gameId: "tictactoe" });
  });

  it("refuses a game that does not exist and creates nothing", async () => {
    const { service, store } = setup();
    const create = vi.fn();
    store.intercept("create", create);

    expect(await service.create({ gameId: "khong-co-game-nay", player: LAN })).toEqual({
      ok: false,
      error: "unknown-game",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a player count the game does not allow", async () => {
    const { service, store } = setup();
    const create = vi.fn();
    store.intercept("create", create);

    expect(
      await service.create({ gameId: "tictactoe", playerCount: 3, player: LAN }),
    ).toMatchObject({ ok: false, error: "invalid-player-count" });
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses options the game does not accept", async () => {
    const { service } = setup();

    expect(
      await service.create({ gameId: "tictactoe", options: { size: 4 }, player: LAN }),
    ).toMatchObject({ ok: false, error: "invalid-options" });
    expect(
      await service.create({ gameId: "dice", options: { target: 99 }, player: LAN }),
    ).toMatchObject({ ok: false, error: "invalid-options" });
  });

  it("uses the game's default options and fewest players when none are sent", async () => {
    const { service } = setup();

    const room = expectOk(await service.create({ gameId: "dice", player: LAN }));

    expect(room.record).toMatchObject({ playerCount: 2, options: { target: 3 } });
    expect(room.players).toEqual([LAN, null]);
  });

  it("uses the options and player count sent", async () => {
    const { service } = setup();

    const room = expectOk(
      await service.create({ gameId: "dice", playerCount: 3, options: { target: 6 }, player: LAN }),
    );

    expect(room.record).toMatchObject({ playerCount: 3, options: { target: 6 } });
    expect(room.players).toEqual([LAN, null, null]);
  });

  it("generates another code when the first one is taken, leaving the old room alone", async () => {
    const { service, store, rng } = setup();
    const taken = expectOk(await service.create({ gameId: "tictactoe", player: LAN }));
    rng.draws.push(...drawsFor("ABC234"), ...drawsFor("XYZ789"));

    const room = expectOk(await service.create({ gameId: "tictactoe", player: AN }));

    expect(room.code).toBe("XYZ789");
    expect(await store.get(taken.code)).toEqual(taken);
  });

  it("gives up after 5 codes that are all taken", async () => {
    const { service, store } = setup();
    const exists = vi.spyOn(store, "create").mockResolvedValue("exists");

    expect(await service.create({ gameId: "tictactoe", player: LAN })).toMatchObject({
      ok: false,
      error: "unavailable",
    });
    expect(exists).toHaveBeenCalledTimes(5);
  });
});

// --- join and sit -----------------------------------------------------------------------------

describe("join", () => {
  it("lets a new player in without a seat", async () => {
    const { service, code } = await tictactoeRoom({ full: false });

    const room = expectOk(await service.join(code, AN));

    expect(seatOf(room, AN.playerId)).toBeNull();
    expect(room.players).toEqual([LAN, null]);
  });

  it("recognises a seated player coming back and moves nobody", async () => {
    const { service, code, store } = await tictactoeRoom();
    const before = await stored(store, code);

    const room = expectOk(await service.join(code, AN));

    expect(seatOf(room, AN.playerId)).toBe(1);
    expect(room).toEqual(before);
  });

  it("shows the new name of a seated player coming back under another name", async () => {
    const { service, code, store } = await tictactoeRoom();
    const listener = vi.fn();
    await store.subscribe(code, listener);

    const room = expectOk(await service.join(code, { ...AN, name: "An Nguyễn" }));

    expect(seatOf(room, AN.playerId)).toBe(1);
    expect(room.players[1]).toEqual({ ...AN, name: "An Nguyễn" });
    expect(room.revision).toBe(3);
    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(room);
    });
  });

  it("writes nothing when the name is the same", async () => {
    const { service, code, store } = await tictactoeRoom();
    const update = vi.spyOn(store, "update");

    expectOk(await service.join(code, AN));

    expect(update).not.toHaveBeenCalled();
  });

  it("answers room-not-found for a room that does not exist", async () => {
    const { service } = await tictactoeRoom();

    expect(await service.join("ZZZ999" as RoomCode, AN)).toEqual({
      ok: false,
      error: "room-not-found",
    });
  });
});

describe("sit", () => {
  it("seats the second player in the second seat", async () => {
    const { service, code } = await tictactoeRoom({ full: false });

    const room = expectOk(await service.sit(code, AN));

    expect(seatOf(room, AN.playerId)).toBe(1);
    expect(room.players).toEqual([LAN, AN]);
  });

  it("refuses a third player and moves nobody", async () => {
    const { service, code, store } = await tictactoeRoom();
    const before = await stored(store, code);

    expect(await service.sit(code, BINH)).toEqual({ ok: false, error: "room-full", room: before });
    expect(await stored(store, code)).toEqual(before);
  });

  it("keeps the seat of a player who already has one, without writing", async () => {
    const { service, code, store } = await tictactoeRoom();
    const update = vi.spyOn(store, "update");

    expect(seatOf(expectOk(await service.sit(code, LAN)), LAN.playerId)).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });

  it("shows the name sent with the sit of a player who already has a seat", async () => {
    const { service, code } = await tictactoeRoom();

    const room = expectOk(await service.sit(code, { ...LAN, name: "Lan Anh" }));

    expect(room.players).toEqual([{ ...LAN, name: "Lan Anh" }, AN]);
    expect(room.revision).toBe(3);
  });

  it("seats a player under the name sent with the sit", async () => {
    const { service, code } = await tictactoeRoom({ full: false });
    expectOk(await service.join(code, AN));

    const room = expectOk(await service.sit(code, { ...AN, name: "An Nguyễn" }));

    expect(room.players[1]).toEqual({ ...AN, name: "An Nguyễn" });
  });

  it("gives the last seat to only one of two players asking at once", async () => {
    const { service, code, store } = await tictactoeRoom({ full: false });
    let raced = false;
    store.intercept("update", async () => {
      if (raced) return;
      raced = true;
      // Bình takes the seat between An's read and An's write.
      expectOk(await service.sit(code, BINH));
    });

    expect(await service.sit(code, AN)).toMatchObject({ ok: false, error: "room-full" });
    expect((await stored(store, code)).players).toEqual([LAN, BINH]);
  });

  it("gives up after 3 conflicts in a row", async () => {
    const { service, code, store } = await tictactoeRoom({ full: false });
    let writing = false;
    const conflicts = vi.fn(async () => {
      if (writing) return;
      writing = true;
      // Someone else writes the room every time, just before the sit does.
      const room = await stored(store, code);
      await store.update(code, room.revision, { ...room, revision: room.revision + 1 });
      writing = false;
    });
    store.intercept("update", conflicts);

    expect(await service.sit(code, AN)).toMatchObject({ ok: false, error: "unavailable" });
    expect((await stored(store, code)).players).toEqual([LAN, null]);
  });

  it("answers room-not-found for a room that does not exist", async () => {
    const { service } = setup();

    expect(await service.sit("ZZZ999" as RoomCode, AN)).toEqual({
      ok: false,
      error: "room-not-found",
    });
  });
});

// --- move -------------------------------------------------------------------------------------

describe("move", () => {
  it("records a legal move of the player whose turn it is", async () => {
    const { service, code } = await tictactoeRoom();

    const room = expectOk(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    );

    expect(room.record.entries).toEqual([{ move: { cell: 4 } }]);
    expect(room.revision).toBe(3);
  });

  it("refuses a move before every seat is taken", async () => {
    const { service, code, store } = await tictactoeRoom({ full: false });

    expect(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    ).toMatchObject({ ok: false, error: "waiting-for-players" });
    expect((await stored(store, code)).record.entries).toEqual([]);
  });

  it("refuses a move out of turn and sends the room along", async () => {
    const { service, code, store } = await tictactoeRoom();
    const before = await stored(store, code);

    expect(
      await service.move(code, AN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    ).toEqual({ ok: false, error: "not-your-turn", room: before });
    expect(await stored(store, code)).toEqual(before);
  });

  it("refuses a move the rules do not allow", async () => {
    const context = await tictactoeRoom();
    await play(context, [4]);
    const before = await stored(context.store, context.code);

    expect(
      await context.service.move(
        context.code,
        AN.playerId,
        { gameNumber: 1, moveIndex: 1 },
        { cell: 4 },
      ),
    ).toEqual({ ok: false, error: "illegal-move", room: before });
  });

  it("records a move sent twice only once", async () => {
    const { service, code } = await tictactoeRoom();
    const position = { gameNumber: 1, moveIndex: 0 };

    const first = expectOk(await service.move(code, LAN.playerId, position, { cell: 4 }));
    const second = await service.move(code, LAN.playerId, position, { cell: 4 });

    expect(second).toEqual({ ok: false, error: "stale-move", room: first });
  });

  it("refuses a move for a past game", async () => {
    const { service, code } = await tictactoeRoom();

    expect(
      await service.move(code, LAN.playerId, { gameNumber: 2, moveIndex: 0 }, { cell: 4 }),
    ).toMatchObject({ ok: false, error: "stale-move" });
  });

  it("still records a move when the opponent renames themselves in between", async () => {
    const { service, code, store } = await tictactoeRoom();
    let renamed = false;
    store.intercept("update", async () => {
      if (renamed) return;
      renamed = true;
      expectOk(await service.join(code, { ...AN, name: "An Nguyễn" }));
    });

    const room = expectOk(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    );

    expect(room.record.entries).toEqual([{ move: { cell: 4 } }]);
    expect(room.players[1]?.name).toBe("An Nguyễn");
  });

  it("refuses a move from a player without a seat", async () => {
    const { service, code, store } = await tictactoeRoom();
    expectOk(await service.join(code, BINH));

    expect(
      await service.move(code, BINH.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    ).toMatchObject({ ok: false, error: "not-seated" });
    expect((await stored(store, code)).record.entries).toEqual([]);
  });

  it("refuses a move once the game is over", async () => {
    const context = await tictactoeRoom();
    await play(context, [0, 3, 1, 4, 2]);

    expect(
      await context.service.move(
        context.code,
        AN.playerId,
        { gameNumber: 1, moveIndex: 5 },
        { cell: 8 },
      ),
    ).toMatchObject({ ok: false, error: "game-over" });
  });

  it("draws a random outcome from the server's rng, never from the client", async () => {
    const { service, rng } = setup();
    const { code } = expectOk(await service.create({ gameId: "dice", player: LAN }));
    expectOk(await service.sit(code, AN));

    expect(
      await service.move(
        code,
        LAN.playerId,
        { gameNumber: 1, moveIndex: 0 },
        {
          roll: true,
          outcome: 6,
        },
      ),
    ).toMatchObject({ ok: false, error: "illegal-move" });

    rng.draws.push(1);
    const room = expectOk(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { roll: true }),
    );
    expect(room.record.entries).toEqual([{ move: { roll: true }, outcome: 2 }]);
  });

  it("gives up after a second conflict and sends the room it read", async () => {
    const { service, code, store } = await tictactoeRoom();
    let writing = false;
    store.intercept("update", async () => {
      if (writing) return;
      writing = true;
      const room = await stored(store, code);
      await store.update(code, room.revision, { ...room, revision: room.revision + 1 });
      writing = false;
    });

    expect(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    ).toMatchObject({ ok: false, error: "unavailable", room: { code } });
  });
});

// --- rematch ----------------------------------------------------------------------------------

describe("rematch", () => {
  it("starts a new game after a win, with everyone one seat on", async () => {
    const context = await tictactoeRoom();
    await play(context, [0, 3, 1, 4, 2]);

    const room = expectOk(await context.service.rematch(context.code, AN.playerId, 1));

    expect(room.gameNumber).toBe(2);
    expect(room.record.entries).toEqual([]);
    expect(room.players).toEqual([AN, LAN]);
  });

  it("refuses a new game while the game is still going", async () => {
    const context = await tictactoeRoom();
    await play(context, [4]);
    const before = await stored(context.store, context.code);

    expect(await context.service.rematch(context.code, LAN.playerId, 1)).toEqual({
      ok: false,
      error: "game-not-over",
      room: before,
    });
  });

  it("starts only one new game when both players ask for it", async () => {
    const context = await tictactoeRoom();
    await play(context, [0, 3, 1, 4, 2]);

    const results = await Promise.all([
      context.service.rematch(context.code, LAN.playerId, 1),
      context.service.rematch(context.code, AN.playerId, 1),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ error: "stale-move" });
    expect((await stored(context.store, context.code)).gameNumber).toBe(2);
  });

  it("moves three players one seat on, the last to the first", async () => {
    const { service, rng } = setup();
    const { code } = expectOk(
      await service.create({ gameId: "dice", playerCount: 3, player: LAN }),
    );
    expectOk(await service.sit(code, AN));
    expectOk(await service.sit(code, BINH));
    rng.draws.push(5);
    expectOk(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { roll: true }),
    );

    const room = expectOk(await service.rematch(code, BINH.playerId, 1));

    expect(room.players).toEqual([BINH, LAN, AN]);
  });

  it("refuses a new game from a player without a seat", async () => {
    const context = await tictactoeRoom();
    await play(context, [0, 3, 1, 4, 2]);

    expect(await context.service.rematch(context.code, BINH.playerId, 1)).toMatchObject({
      ok: false,
      error: "not-seated",
    });
  });
});

describe("watch", () => {
  it("hands every new state of the room to the listener until it stops", async () => {
    const { service, code } = await tictactoeRoom();
    const listener = vi.fn();
    const stop = await service.watch(code, listener);

    const room = expectOk(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { cell: 4 }),
    );
    await vi.waitFor(() => {
      expect(listener).toHaveBeenCalledWith(room);
    });
    stop();
    await service.move(code, AN.playerId, { gameNumber: 1, moveIndex: 1 }, { cell: 0 });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("toRoomView", () => {
  it("holds the names of both seated players but no playerId", async () => {
    const { store, code } = await tictactoeRoom();

    const view = toRoomView(await stored(store, code));

    expect(view.seats).toEqual([{ name: "Lan" }, { name: "An" }]);
    const json = JSON.stringify(view);
    expect(json).not.toContain(LAN.playerId);
    expect(json).not.toContain(AN.playerId);
    expect(json).not.toContain("playerId");
  });
});
