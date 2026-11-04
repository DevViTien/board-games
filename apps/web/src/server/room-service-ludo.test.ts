import { createRng, currentState, fromRecord, type Rng } from "@board-games/engine";
import { ludo, LUDO_DEFAULT_OPTIONS } from "@board-games/games";
import { ROOM_CODE_ALPHABET } from "@board-games/protocol";
import { describe, expect, it, vi } from "vitest";

import type { RoomPlayer, StoredSeat } from "./room";
import { createRoomService, type ServiceResult } from "./room-service";
import { createMemoryRoomStore } from "./store/memory";

// Cờ cá ngựa online between people (specs/ludo "Cờ cá ngựa online"): the server rolls every die
// with its own generator, from the very rules the clients play.

const LAN: RoomPlayer = { playerId: "lan-0123456789abcdef", name: "Lan" };
const AN: RoomPlayer = { playerId: "an-0123456789abcdefgh", name: "An" };
const BINH: RoomPlayer = { playerId: "binh-0123456789abcdef", name: "Bình" };

/** A person in a seat, as the room stores them. */
const human = (player: RoomPlayer): StoredSeat => ({ kind: "human", ...player, standIn: false });
const CODE = "ABC234";

/** Draws the room code first, then answers like a seeded generator (or from `draws`). */
function serverRng(seed: number, draws: number[] = []): Rng & { readonly draws: number[] } {
  const seeded = createRng(seed);
  const code = Array.from(CODE, (character) => ROOM_CODE_ALPHABET.indexOf(character));
  return {
    draws,
    nextInt: (min, max) => code.shift() ?? draws.shift() ?? seeded.nextInt(min, max),
    nextFloat: seeded.nextFloat,
  };
}

function setup(seed = 1) {
  const store = createMemoryRoomStore();
  const rng = serverRng(seed);
  let clock = 1_000;
  const service = createRoomService({ store, rng, now: () => (clock += 1), games: [ludo] });
  return { store, rng, service };
}

function expectOk<T>(result: ServiceResult<T>): T {
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.value;
}

async function twoPlayerRoom(seed = 1) {
  const context = setup(seed);
  const room = expectOk(await context.service.create({ gameId: "ludo", player: LAN }));
  expectOk(await context.service.sit(room.code, AN));
  return { ...context, code: room.code };
}

describe("Cờ cá ngựa online", () => {
  it("opens a room with as many seats as players chosen", async () => {
    const { service } = setup();

    const room = expectOk(await service.create({ gameId: "ludo", playerCount: 3, player: LAN }));

    expect(room.players).toEqual([human(LAN), null, null]);
    expect(room.record).toMatchObject({ playerCount: 3, options: LUDO_DEFAULT_OPTIONS });
    const rebuilt = fromRecord(ludo, room.record);
    expect(rebuilt.ok && currentState(rebuilt.value).colours).toEqual([0, 1, 2]);
  });

  it("Biến thể bị từ chối: refuses a variant and creates no room", async () => {
    const { service, store } = setup();
    const create = vi.fn();
    store.intercept("create", create);

    expect(
      await service.create({ gameId: "ludo", options: { exitRoll: "one-or-six" }, player: LAN }),
    ).toMatchObject({ ok: false, error: "invalid-options" });
    expect(create).not.toHaveBeenCalled();
  });

  it("records a roll with the face drawn by the server's generator", async () => {
    const { service, code, rng } = await twoPlayerRoom();

    rng.draws.push(4);
    const room = expectOk(
      await service.move(code, LAN.playerId, { gameNumber: 1, moveIndex: 0 }, { type: "roll" }),
    );

    expect(room.record.entries).toEqual([{ move: { type: "roll" }, outcome: 5 }]);
  });

  it("Số chấm gửi kèm không có tác dụng: a face sent with the roll is ignored", async () => {
    const { service, code, rng } = await twoPlayerRoom();

    rng.draws.push(1);
    const room = expectOk(
      await service.move(
        code,
        LAN.playerId,
        { gameNumber: 1, moveIndex: 0 },
        { type: "roll", face: 6, outcome: 6 },
      ),
    );

    expect(room.record.entries).toEqual([{ move: { type: "roll" }, outcome: 2 }]);
  });

  it("plays a two-player game to a winner through the service, then rotates the seats", async () => {
    const { service, store, code } = await twoPlayerRoom(7);
    const seated = [LAN, AN];

    let winner = false;
    for (let index = 0; index < 4000; index += 1) {
      const room = await store.get(code);
      if (room === null) throw new Error("The room is gone");
      const rebuilt = fromRecord(ludo, room.record);
      if (!rebuilt.ok) throw new Error(rebuilt.error);
      const state = currentState(rebuilt.value);
      if (ludo.result(state) !== null) {
        winner = true;
        break;
      }
      // The first choice every time: a full game, not a good one.
      const [move] = ludo.legalMoves(state);
      const player = seated[ludo.currentPlayer(state)];
      expectOk(
        await service.move(
          code,
          player?.playerId ?? "",
          { gameNumber: room.gameNumber, moveIndex: room.record.entries.length },
          move,
        ),
      );
    }

    expect(winner).toBe(true);
    const next = expectOk(await service.rematch(code, AN.playerId, 1));
    expect(next.players).toEqual([human(AN), human(LAN)]);
    expect(next.record.entries).toEqual([]);
  });

  it("seats a third player in a three-player room", async () => {
    const { service } = setup();
    const { code } = expectOk(
      await service.create({ gameId: "ludo", playerCount: 3, player: LAN }),
    );
    expectOk(await service.sit(code, AN));

    const room = expectOk(await service.sit(code, BINH));

    expect(room.players).toEqual([human(LAN), human(AN), human(BINH)]);
  });
});
