import { createRng, type Rng } from "@board-games/engine";
import { jellyCrew, tictactoe } from "@board-games/games";
import { ROOM_CODE_ALPHABET, ROOM_ERROR, type RoomCode } from "@board-games/protocol";
import { describe, expect, it } from "vitest";

import { type RoomPlayer, type StoredRoom, toRoomView } from "./room";
import { createRoomService, type ServiceResult } from "./room-service";
import { createMemoryRoomStore } from "./store/memory";

// A game played freely (change `add-jelly-crew-game`, design §10.2) refereed by the server, and the
// time of a game kept in the room (§10.4).

const MINH: RoomPlayer = { playerId: "minh-0123456789abcdef", name: "Minh" };
const LAN: RoomPlayer = { playerId: "lan-0123456789abcdef0", name: "Lan" };
const CODE = "ABC234" as RoomCode;
const START = 1_000_000;
const MINUTE = 60_000;

/** The two players' kitchen won (`layouts.solutions.ts`): Minh is seat 0, Lan seat 1. */
const KITCHEN_TWO = [
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
] as const;

function serverRng(): Rng {
  const seeded = createRng(5);
  const code = Array.from(CODE, (character) => ROOM_CODE_ALPHABET.indexOf(character));
  return {
    nextInt: (min, max) => code.shift() ?? seeded.nextInt(min, max),
    nextFloat: seeded.nextFloat,
  };
}

function expectOk<T>(result: ServiceResult<T>): T {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.value;
}

/** A room of Đội gom thạch for two, Minh and Lan seated, two minutes after it was created. */
async function crewRoom(gameId: string = jellyCrew.id) {
  const store = createMemoryRoomStore();
  const clock = { now: START };
  const service = createRoomService({
    store,
    rng: serverRng(),
    now: () => clock.now,
    games: [jellyCrew, tictactoe],
  });
  const { code } = expectOk(await service.create({ gameId, playerCount: 2, player: MINH }));
  clock.now += 2 * MINUTE;
  expectOk(await service.sit(code, LAN));
  const current = async (): Promise<StoredRoom> => {
    const stored = await store.get(code);
    if (stored === null) throw new Error("The room is gone");
    return stored;
  };
  /** `player` sends `move` as from the position `moveIndex` (the latest by default). */
  const send = async (player: RoomPlayer, move: unknown, moveIndex?: number) => {
    const stored = await current();
    return service.move(
      code,
      player.playerId,
      { gameNumber: stored.gameNumber, moveIndex: moveIndex ?? stored.record.entries.length },
      move,
    );
  };
  return { service, code, clock, current, send };
}

describe("Trọng tài của game đi tự do", () => {
  it("Hai nước gửi cùng lúc: both are recorded, in the order received", async () => {
    const { current, send } = await crewRoom();
    expectOk(await send(MINH, "0D", 0));
    expectOk(await send(LAN, "1D", 0));
    expect((await current()).record.entries).toEqual([{ move: "0D" }, { move: "1D" }]);
  });

  it("Nước cũ không còn hợp lệ: refused by the rules on the newest state, with the room", async () => {
    const { current, send } = await crewRoom();
    expectOk(await send(MINH, "0D"));
    expectOk(await send(LAN, "1D"));
    const before = (await current()).record.entries.length;
    // Minh puts the map back: Lan, sending from before it, would step up into the wall.
    expectOk(await send(MINH, "0reset"));
    const refused = await send(LAN, "1U", before);
    expect(refused).toMatchObject({ ok: false, error: "illegal-move" });
    if (refused.ok) return;
    expect(refused.room?.record.entries).toHaveLength(3);
  });

  it("Đi thay người khác: a move naming another seat is not the sender's", async () => {
    const { current, send } = await crewRoom();
    expect(await send(LAN, "0D")).toMatchObject({ ok: false, error: ROOM_ERROR.NotYourTurn });
    expect((await current()).record.entries).toEqual([]);
  });

  it("refuses as stale a move sent again after its first copy was recorded", async () => {
    const { current, send } = await crewRoom();
    expectOk(await send(MINH, "0D", 0));
    expectOk(await send(LAN, "1D", 1));
    // Minh's answer was lost: the same move again, from the same position.
    expect(await send(MINH, "0D", 0)).toMatchObject({ ok: false, error: ROOM_ERROR.StaleMove });
    expect((await current()).record.entries).toHaveLength(2);
  });

  it("refuses a position ahead of the game as stale", async () => {
    const { send } = await crewRoom();
    expect(await send(MINH, "0D", 1)).toMatchObject({ ok: false, error: ROOM_ERROR.StaleMove });
  });

  it("still refuses a stale position in a game with turns", async () => {
    const { send } = await crewRoom(tictactoe.id);
    expectOk(await send(MINH, { cell: 0 }));
    expect(await send(LAN, { cell: 1 }, 0)).toMatchObject({
      ok: false,
      error: ROOM_ERROR.StaleMove,
    });
  });

  it("Không xử bỏ ván: no claim, however long nobody moves", async () => {
    const { service, code, clock, current, send } = await crewRoom();
    expectOk(await send(MINH, "0D"));
    clock.now += 6 * MINUTE;
    const stored = await current();
    const claimed = await service.claimAbandoned(code, LAN.playerId, {
      gameNumber: stored.gameNumber,
      moveIndex: stored.record.entries.length,
    });
    expect(claimed).toMatchObject({ ok: false, error: ROOM_ERROR.NotAbandoned });
  });
});

describe("Thời gian ván online", () => {
  it("Thời gian của ván thắng: from the room full to the result, by the server's clock", async () => {
    const { clock, current, send } = await crewRoom();
    const started = START + 2 * MINUTE;
    expect(await current()).toMatchObject({ gameStartedAt: started, gameEndedAt: null });
    for (const move of KITCHEN_TWO) {
      clock.now += 10_000;
      expectOk(await send(move.startsWith("0") ? MINH : LAN, move));
    }
    const won = await current();
    expect(won.gameStartedAt).toBe(started);
    expect(won.gameEndedAt).toBe(clock.now);
    expect(toRoomView(won, clock.now, LAN.playerId).gameTime).toEqual({
      startedAt: started,
      endedAt: started + KITCHEN_TWO.length * 10_000,
    });
  });

  it("starts the clock again with Chơi lại", async () => {
    const { service, code, clock, current, send } = await crewRoom();
    for (const move of KITCHEN_TWO) expectOk(await send(move.startsWith("0") ? MINH : LAN, move));
    clock.now += MINUTE;
    expectOk(await service.rematch(code, LAN.playerId, 1));
    expect(await current()).toMatchObject({ gameStartedAt: clock.now, gameEndedAt: null });
  });

  it("has no time while the room waits for players, nor for a room stored before", async () => {
    const store = createMemoryRoomStore();
    const service = createRoomService({
      store,
      rng: serverRng(),
      now: () => START,
      games: [jellyCrew],
    });
    const created = expectOk(
      await service.create({ gameId: jellyCrew.id, playerCount: 2, player: MINH }),
    );
    expect(toRoomView(created, START, MINH.playerId).gameTime).toBeNull();
    const older = Object.fromEntries(
      Object.entries(created).filter(([key]) => key !== "gameStartedAt" && key !== "gameEndedAt"),
    ) as StoredRoom;
    expect(toRoomView(older, START, MINH.playerId).gameTime).toBeNull();
  });
});
