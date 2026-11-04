import {
  type AnyGameDefinition,
  createRng,
  currentState,
  fromRecord,
  GAME_CATEGORY,
  type GameDefinition,
  type PlayerIndex,
  type Rng,
  sessionResult,
} from "@board-games/engine";
import { caro, chess, ludo, tictactoe } from "@board-games/games";
import { ROOM_CODE_ALPHABET, type RoomCode } from "@board-games/protocol";
import { describe, expect, it } from "vitest";

import { type RoomPlayer, seatOf, type StoredRoom, toRoomView } from "./room";
import { createRoomService, type ServiceResult } from "./room-service";
import { createMemoryRoomStore } from "./store/memory";

// Resigning and abandoning in online rooms (change `add-resign-and-abandon`): the server decides
// both, by its own clock and the time it stored when the turn began.

interface RaceState {
  readonly steps: readonly number[];
  readonly toMove: PlayerIndex;
}

/** Three players step in turn; the first to take two steps wins. */
const raceGame = {
  id: "race",
  meta: {
    players: { min: 3, max: 3 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 1,
    supportsAI: true,
  },
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

const GAMES: readonly AnyGameDefinition[] = [tictactoe, caro, chess, ludo, raceGame];

const LAN: RoomPlayer = { playerId: "lan-0123456789abcdef", name: "Lan" };
const AN: RoomPlayer = { playerId: "an-0123456789abcdefgh", name: "An" };
const BINH: RoomPlayer = { playerId: "binh-0123456789abcdef", name: "Bình" };
const CODE = "ABC234" as RoomCode;

const MINUTE = 60_000;
const START = 1_000_000;

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

function expectOk<T>(result: ServiceResult<T>): T {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.value;
}

/** A room of `gameId` for `seats` players, created by Lan, `others` seated after her. */
async function room(gameId: string, seats: number, others: readonly RoomPlayer[]) {
  const store = createMemoryRoomStore();
  const rng = serverRng(5);
  const clock = { now: START };
  const service = createRoomService({ store, rng, now: () => clock.now, games: GAMES });
  const { code } = expectOk(await service.create({ gameId, playerCount: seats, player: LAN }));
  for (const player of others) expectOk(await service.sit(code, player));
  const current = async (): Promise<StoredRoom> => {
    const stored = await store.get(code);
    if (stored === null) throw new Error("The room is gone");
    return stored;
  };
  const wait = (ms: number) => {
    clock.now += ms;
  };
  return { store, rng, clock, service, code, current, wait };
}

type Context = Awaited<ReturnType<typeof room>>;

/** The game of `stored` replayed. */
function replay(stored: StoredRoom) {
  const game = GAMES.find((candidate) => candidate.id === stored.gameId);
  if (game === undefined) throw new Error(`No game ${stored.gameId}`);
  const rebuilt = fromRecord(game, stored.record);
  if (!rebuilt.ok) throw new Error(rebuilt.error);
  const state = currentState(rebuilt.value);
  return {
    toMove: game.currentPlayer(state),
    result: sessionResult(game, rebuilt.value),
    entries: rebuilt.value.entries.length,
  };
}

/** Plays `player`'s move at the current position. */
async function play({ service, code, current }: Context, player: RoomPlayer, move: unknown) {
  const stored = await current();
  return expectOk(
    await service.move(
      code,
      player.playerId,
      { gameNumber: stored.gameNumber, moveIndex: stored.record.entries.length },
      move,
    ),
  );
}

/** Claims the current turn abandoned, as `player`. */
async function claim({ service, code, current }: Context, player: RoomPlayer) {
  const stored = await current();
  return service.claimAbandoned(code, player.playerId, {
    gameNumber: stored.gameNumber,
    moveIndex: stored.record.entries.length,
  });
}

/** A roll of 3 for Cờ cá ngựa: nobody leaves home, the turn passes. */
const ROLL = { type: "roll" } as const;
const FACE_THREE = 2;

describe("Thời điểm bắt đầu lượt", () => {
  it("Chưa có lượt: a room with only its creator has no turn", async () => {
    const context = await room("tictactoe", 2, []);

    const view = toRoomView(await context.current(), START + MINUTE);

    expect(view.turnIdleMs).toBeNull();
  });

  it("Phòng vừa đủ người: the first turn begins when the last seat is taken", async () => {
    const context = await room("tictactoe", 2, []);
    context.wait(10 * MINUTE);

    const seated = expectOk(await context.service.sit(context.code, AN));

    expect(seated.turnStartedAt).toBe(START + 10 * MINUTE);
    expect(toRoomView(seated, context.clock.now).turnIdleMs).toBe(0);
  });

  it("Thời gian của lượt: a player who comes back sees how long the turn has lasted", async () => {
    const context = await room("tictactoe", 2, [AN]);
    await play(context, LAN, { cell: 4 });
    context.wait(2 * MINUTE);

    const back = expectOk(await context.service.join(context.code, AN.playerId, "An"));

    expect(toRoomView(back, context.clock.now).turnIdleMs).toBe(2 * MINUTE);
  });

  it("Đổi tên không tính lại lượt: a rename keeps the turn's start", async () => {
    const context = await room("tictactoe", 2, [AN]);
    await play(context, LAN, { cell: 4 });
    context.wait(3 * MINUTE);

    const renamed = expectOk(await context.service.join(context.code, AN.playerId, "An Nguyễn"));

    expect(renamed.players[1]).toMatchObject({ name: "An Nguyễn" });
    expect(toRoomView(renamed, context.clock.now).turnIdleMs).toBe(3 * MINUTE);
  });

  it("restarts the turn on every move and on a new game, and stops it once the game has a result", async () => {
    const context = await room("tictactoe", 2, [AN]);
    context.wait(MINUTE);
    expect((await play(context, LAN, { cell: 0 })).turnStartedAt).toBe(context.clock.now);
    await play(context, AN, { cell: 3 });
    await play(context, LAN, { cell: 1 });
    await play(context, AN, { cell: 4 });

    const won = await play(context, LAN, { cell: 2 });
    expect(won.turnStartedAt).toBeNull();
    expect(toRoomView(won, context.clock.now).turnIdleMs).toBeNull();

    context.wait(MINUTE);
    const next = expectOk(await context.service.rematch(context.code, AN.playerId, 1));
    expect(next.turnStartedAt).toBe(context.clock.now);
  });
});

describe("Đầu hàng trong phòng", () => {
  it("Đầu hàng Cờ vua: Black resigning on White's turn ends the game for White, and a new game follows", async () => {
    const context = await room("chess", 2, [AN]);
    await play(context, LAN, { from: "e2", to: "e4" });
    await play(context, AN, { from: "e7", to: "e5" });

    const resigned = expectOk(await context.service.resign(context.code, AN.playerId, 1));

    expect(resigned.record.ending).toEqual({ reason: "resigned", player: 1 });
    expect(replay(resigned).result).toEqual({ kind: "win", winners: [0], reason: "resigned" });
    expect(resigned.turnStartedAt).toBeNull();
    expect(expectOk(await context.service.rematch(context.code, AN.playerId, 1)).gameNumber).toBe(
      2,
    );
  });

  it("Đầu hàng Cờ cá ngựa: the AI stands in for the second seat, still under its name", async () => {
    const context = await room("ludo", 3, [AN, BINH]);
    const before = await context.current();

    const resigned = expectOk(await context.service.resign(context.code, AN.playerId, 1));

    expect(resigned.players[1]).toEqual({ kind: "human", ...AN, standIn: true });
    expect(replay(resigned).result).toBeNull();
    expect(resigned.record.entries).toEqual(before.record.entries);
    expect(seatOf(resigned, AN.playerId)).toBe(1);
    // Lan's turn goes on.
    expect(resigned.turnStartedAt).toBe(before.turnStartedAt);
    expect(toRoomView(resigned, context.clock.now).seats[1]).toEqual({
      kind: "human",
      name: "An",
      standIn: true,
    });
  });

  it("Đầu hàng đúng lượt mình ở Cờ cá ngựa: the AI moves for the seat at once, up to a person's turn", async () => {
    const context = await room("ludo", 3, [AN, BINH]);
    context.rng.draws.push(FACE_THREE);
    await play(context, LAN, ROLL);
    expect(replay(await context.current()).toMove).toBe(1);
    context.wait(MINUTE);

    const resigned = expectOk(await context.service.resign(context.code, AN.playerId, 1));

    const after = replay(resigned);
    expect(after.entries).toBeGreaterThan(1);
    expect(after.toMove).not.toBe(1);
    expect(resigned.turnStartedAt).toBe(context.clock.now);
  });

  it("Phòng Cờ cá ngựa hai ghế: resigning ends the game, no seat left to the AI", async () => {
    const context = await room("ludo", 2, [AN]);

    const resigned = expectOk(await context.service.resign(context.code, AN.playerId, 1));

    expect(replay(resigned).result).toEqual({ kind: "win", winners: [0], reason: "resigned" });
    expect(resigned.players.every((seat) => seat?.kind === "human" && !seat.standIn)).toBe(true);
  });

  it("Người cuối cùng đầu hàng: the last person resigning to three AI seats ends the game", async () => {
    const context = await room("ludo", 4, []);
    for (const seat of [1, 2, 3]) {
      expectOk(await context.service.setAiSeat(context.code, LAN.playerId, seat, true));
    }
    const playing = await context.current();

    const resigned = expectOk(
      await context.service.resign(context.code, LAN.playerId, playing.gameNumber),
    );

    expect(replay(resigned).result).toEqual({
      kind: "win",
      winners: [1, 2, 3],
      reason: "resigned",
    });
  });

  it("Đầu hàng lần nữa: a seat already left to the AI changes nothing", async () => {
    const context = await room("ludo", 3, [AN, BINH]);
    const first = expectOk(await context.service.resign(context.code, AN.playerId, 1));

    const again = expectOk(await context.service.resign(context.code, AN.playerId, 1));

    expect(again).toEqual(first);
    expect((await context.current()).revision).toBe(first.revision);
  });
});

describe("Xử bỏ ván", () => {
  it("Xử thắng Cờ caro: a turn of 5 min 10 s ends the game for the claimer", async () => {
    const context = await room("caro", 2, [AN]);
    await play(context, LAN, { cell: 112 });
    context.wait(5 * MINUTE + 10_000);

    const claimed = expectOk(await claim(context, LAN));

    expect(claimed.record.ending).toEqual({ reason: "abandoned", player: 1 });
    expect(replay(claimed).result).toEqual({ kind: "win", winners: [0], reason: "abandoned" });
  });

  it("Cho máy chơi thay ở Cờ cá ngựa: the AI takes the seat and moves at once", async () => {
    const context = await room("ludo", 3, [AN, BINH]);
    context.rng.draws.push(FACE_THREE);
    await play(context, LAN, ROLL);
    context.wait(6 * MINUTE);

    const claimed = expectOk(await claim(context, BINH));

    expect(claimed.players[1]).toEqual({ kind: "human", ...AN, standIn: true });
    expect(replay(claimed).entries).toBeGreaterThan(1);
    expect(replay(claimed).result).toBeNull();
    expect(replay(claimed).toMove).not.toBe(1);
  });

  it("Phòng Cờ cá ngựa hai ghế bị bỏ: ends the game", async () => {
    const context = await room("ludo", 2, [AN]);
    context.rng.draws.push(FACE_THREE);
    await play(context, LAN, ROLL);
    context.wait(6 * MINUTE);

    const claimed = expectOk(await claim(context, LAN));

    expect(replay(claimed).result).toEqual({ kind: "win", winners: [0], reason: "abandoned" });
  });

  it("Người tự chơi cuối cùng bỏ đi: a claim on the last person playing ends the game", async () => {
    const context = await room("race", 3, [AN, BINH]);
    // Bình resigns on Lan's turn; Lan resigns on her own, and the AI plays her seat to An's turn.
    expectOk(await context.service.resign(context.code, BINH.playerId, 1));
    const handed = expectOk(await context.service.resign(context.code, LAN.playerId, 1));
    expect(replay(handed).toMove).toBe(1);
    context.wait(6 * MINUTE);

    const claimed = expectOk(await claim(context, LAN));

    expect(replay(claimed).result).toEqual({ kind: "win", winners: [0, 2], reason: "abandoned" });
  });

  it("Người vắng vừa kịp đi: a claim on a turn just played is stale", async () => {
    const context = await room("tictactoe", 2, [AN]);
    await play(context, LAN, { cell: 4 });
    context.wait(6 * MINUTE);
    const stale = await context.current();
    await play(context, AN, { cell: 0 });

    const claimed = await context.service.claimAbandoned(context.code, LAN.playerId, {
      gameNumber: 1,
      moveIndex: stale.record.entries.length,
    });

    expect(claimed).toMatchObject({ ok: false, error: "stale-move" });
    const after = await context.current();
    expect(after.record.entries).toHaveLength(2);
    expect(replay(after).result).toBeNull();
  });
});

describe("Từ chối đầu hàng và xử bỏ ván", () => {
  it("Chưa đủ 5 phút: refuses a claim at 4 min 50 s, with the room", async () => {
    const context = await room("tictactoe", 2, [AN]);
    const moved = await play(context, LAN, { cell: 4 });
    context.wait(4 * MINUTE + 50_000);

    const claimed = await claim(context, LAN);

    expect(claimed).toMatchObject({ ok: false, error: "not-abandoned" });
    if (claimed.ok || claimed.room === undefined) throw new Error("Expected the room");
    expect(claimed.room.revision).toBe(moved.revision);
    expect(toRoomView(claimed.room, context.clock.now).turnIdleMs).toBe(4 * MINUTE + 50_000);
  });

  it("Tự xử mình: refuses a claim on one's own turn", async () => {
    const context = await room("tictactoe", 2, [AN]);
    context.wait(6 * MINUTE);

    expect(await claim(context, LAN)).toMatchObject({ ok: false, error: "not-abandoned" });
    expect(replay(await context.current()).result).toBeNull();
  });

  it("Xử hai lần: a second claim on the same turn finds the game over", async () => {
    const context = await room("tictactoe", 2, [AN]);
    await play(context, LAN, { cell: 4 });
    context.wait(6 * MINUTE);
    const position = { gameNumber: 1, moveIndex: 1 };

    expectOk(await context.service.claimAbandoned(context.code, LAN.playerId, position));
    const again = await context.service.claimAbandoned(context.code, LAN.playerId, position);

    expect(again).toMatchObject({ ok: false, error: "game-over" });
  });

  it("Người chưa có ghế: refuses someone who has not sat down", async () => {
    const context = await room("tictactoe", 2, [AN]);

    expect(await context.service.resign(context.code, BINH.playerId, 1)).toMatchObject({
      ok: false,
      error: "not-seated",
    });
    expect(await claim(context, BINH)).toMatchObject({ ok: false, error: "not-seated" });
  });

  it("Đầu hàng khi chưa đủ người: refuses a room still waiting for players", async () => {
    const context = await room("tictactoe", 2, []);

    expect(await context.service.resign(context.code, LAN.playerId, 1)).toMatchObject({
      ok: false,
      error: "waiting-for-players",
    });
  });

  it("Đầu hàng ván đã kết thúc: refuses a game with a result, or an older game", async () => {
    const context = await room("tictactoe", 2, [AN]);
    expectOk(await context.service.resign(context.code, AN.playerId, 1));

    expect(await context.service.resign(context.code, LAN.playerId, 1)).toMatchObject({
      ok: false,
      error: "game-over",
    });
    expect(replay(await context.current()).result).toMatchObject({ winners: [0] });
    expect(await context.service.resign(context.code, LAN.playerId, 2)).toMatchObject({
      ok: false,
      error: "stale-move",
    });
  });
});

describe("Máy chơi thay người", () => {
  it("Người được máy chơi thay gửi nước đi: refuses a move from the seat the AI plays", async () => {
    const context = await room("ludo", 3, [AN, BINH]);
    expectOk(await context.service.resign(context.code, LAN.playerId, 1));
    const stored = await context.current();

    const moved = await context.service.move(
      context.code,
      LAN.playerId,
      { gameNumber: 1, moveIndex: stored.record.entries.length },
      ROLL,
    );

    expect(moved).toMatchObject({ ok: false, error: "not-your-turn" });
  });

  it("Máy đi tiếp cho ghế vắng: a move handing the turn to the stand-in brings its moves too", async () => {
    const context = await room("race", 3, [AN, BINH]);
    expectOk(await context.service.resign(context.code, AN.playerId, 1));

    const moved = await play(context, LAN, { step: true });

    // Lan stepped, the AI stepped for An, and it is Bình's turn.
    expect(moved.record.entries).toHaveLength(2);
    expect(replay(moved).toMove).toBe(2);
  });

  it("Máy chơi thay về đích trước: the seat the AI plays wins like any other", async () => {
    const context = await room("race", 3, [AN, BINH]);
    // Lan resigns on her turn: the AI steps for her, then An and Bình step.
    expectOk(await context.service.resign(context.code, LAN.playerId, 1));
    await play(context, AN, { step: true });

    const won = await play(context, BINH, { step: true });

    expect(replay(won).result).toEqual({ kind: "win", winners: [0] });
    expect(won.turnStartedAt).toBeNull();
  });

  it("Ván mới trả ghế: a new game gives every seat back to its person, the seats moved on", async () => {
    const context = await room("race", 3, [AN, BINH]);
    expectOk(await context.service.resign(context.code, LAN.playerId, 1));
    await play(context, AN, { step: true });
    await play(context, BINH, { step: true });

    const next = expectOk(await context.service.rematch(context.code, AN.playerId, 1));

    expect(next.players).toEqual([
      { kind: "human", ...BINH, standIn: false },
      { kind: "human", ...LAN, standIn: false },
      { kind: "human", ...AN, standIn: false },
    ]);
  });
});
