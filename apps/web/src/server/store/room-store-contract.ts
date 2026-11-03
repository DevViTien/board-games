// Test-only: the behaviour every RoomStore must have, run against each implementation.
import { createRng, RECORD_VERSION } from "@board-games/engine";
import { ludo, LUDO_DEFAULT_OPTIONS, tictactoe } from "@board-games/games";
import {
  normalizeRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type RoomCode,
} from "@board-games/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { seatOf, STORED_ROOM_FORMAT, type StoredRoom } from "../room";
import { createRoomService } from "../room-service";
import type { RoomStore } from "./room-store";

export interface RoomStoreHarness {
  readonly store: RoomStore;
  /** Stores `json` as a room's data without any check, like data written by another version. */
  writeRaw(code: RoomCode, revision: number, json: string): Promise<void>;
  /** Removes what the test wrote and closes the store. */
  cleanup(): Promise<void>;
}

/** A fresh random code, so tests sharing a real Redis never meet. */
function randomRoomCode(): RoomCode {
  const code = Array.from(
    crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH)),
    (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length],
  ).join("");
  const normalized = normalizeRoomCode(code);
  if (normalized === null) throw new Error(`Generated an invalid code ${code}`);
  return normalized;
}

export function testRoom(overrides: Partial<StoredRoom> = {}): StoredRoom {
  return {
    format: STORED_ROOM_FORMAT,
    code: randomRoomCode(),
    gameId: "tictactoe",
    revision: 1,
    gameNumber: 1,
    hostId: "player-one-0123456789",
    players: [{ kind: "human", playerId: "player-one-0123456789", name: "Lan" }, null],
    record: {
      version: RECORD_VERSION,
      gameId: "tictactoe",
      playerCount: 2,
      options: {},
      entries: [],
    },
    updatedAt: 1_000,
    ...overrides,
  };
}

/** `room` one write later. */
export function nextRevision(room: StoredRoom, cell = room.record.entries.length): StoredRoom {
  return {
    ...room,
    revision: room.revision + 1,
    record: { ...room.record, entries: [...room.record.entries, { move: { cell } }] },
    updatedAt: room.updatedAt + 1,
  };
}

export function describeRoomStore(
  name: string,
  setup: () => Promise<RoomStoreHarness>,
  options: { readonly skip?: boolean } = {},
): void {
  describe.skipIf(options.skip === true)(`${name} (RoomStore contract)`, () => {
    let harness: RoomStoreHarness;
    let store: RoomStore;

    beforeEach(async () => {
      harness = await setup();
      store = harness.store;
    });

    afterEach(async () => {
      await harness.cleanup();
    });

    it("reads back a room it created", async () => {
      const room = testRoom();

      expect(await store.create(room)).toBe("created");
      expect(await store.get(room.code)).toEqual(room);
    });

    it("has no room under an unknown code", async () => {
      expect(await store.get(randomRoomCode())).toBeNull();
    });

    it("refuses to create a room over an existing one and keeps the old one", async () => {
      const room = testRoom();
      await store.create(room);

      expect(await store.create({ ...room, gameNumber: 7 })).toBe("exists");
      expect(await store.get(room.code)).toEqual(room);
    });

    it("writes a room based on the stored revision", async () => {
      const room = testRoom();
      await store.create(room);
      const next = nextRevision(room);

      expect(await store.update(room.code, 1, next)).toBe("updated");
      expect(await store.get(room.code)).toEqual(next);
    });

    it("refuses a write based on another revision and keeps the room", async () => {
      const room = testRoom();
      await store.create(room);
      await store.update(room.code, 1, nextRevision(room));

      expect(await store.update(room.code, 1, nextRevision(room, 8))).toBe("conflict");
      expect(await store.get(room.code)).toEqual(nextRevision(room));
    });

    it("reports a write to a room that does not exist", async () => {
      const room = testRoom();

      expect(await store.update(room.code, 1, nextRevision(room))).toBe("missing");
      expect(await store.get(room.code)).toBeNull();
    });

    it("tells a listener every room written after it subscribed, in order", async () => {
      const room = testRoom();
      await store.create(room);
      const received: StoredRoom[] = [];
      const unsubscribe = await store.subscribe(room.code, (written) => received.push(written));
      const second = nextRevision(room);
      const third = nextRevision(second);

      await store.update(room.code, 1, second);
      await store.update(room.code, 2, third);

      await vi.waitFor(() => {
        expect(received).toEqual([second, third]);
      });
      unsubscribe();
    });

    it("tells every listener of a room", async () => {
      const room = testRoom();
      await store.create(room);
      const first = vi.fn();
      const second = vi.fn();
      const unsubscribers = await Promise.all([
        store.subscribe(room.code, first),
        store.subscribe(room.code, second),
      ]);

      await store.update(room.code, 1, nextRevision(room));

      await vi.waitFor(() => {
        expect(first).toHaveBeenCalledWith(nextRevision(room));
        expect(second).toHaveBeenCalledWith(nextRevision(room));
      });
      for (const unsubscribe of unsubscribers) unsubscribe();
    });

    it("tells the other listeners when one of them throws", async () => {
      const room = testRoom();
      await store.create(room);
      const failure = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const broken = vi.fn(() => {
        throw new Error("broken listener");
      });
      const working = vi.fn();
      const unsubscribers = [
        await store.subscribe(room.code, broken),
        await store.subscribe(room.code, working),
      ];

      await store.update(room.code, 1, nextRevision(room));

      await vi.waitFor(() => {
        expect(working).toHaveBeenCalledWith(nextRevision(room));
      });
      expect(broken).toHaveBeenCalledTimes(1);
      expect(failure).toHaveBeenCalled();
      failure.mockRestore();
      for (const unsubscribe of unsubscribers) unsubscribe();
    });

    it("stops telling a listener that unsubscribed", async () => {
      const room = testRoom();
      await store.create(room);
      const gone = vi.fn();
      const staying = vi.fn();
      const unsubscribe = await store.subscribe(room.code, gone);
      const stop = await store.subscribe(room.code, staying);

      unsubscribe();
      await store.update(room.code, 1, nextRevision(room));

      // The listener still subscribed shows the write has been delivered.
      await vi.waitFor(() => {
        expect(staying).toHaveBeenCalledTimes(1);
      });
      expect(gone).not.toHaveBeenCalled();
      stop();
    });

    it("tells listeners nothing about other rooms", async () => {
      const room = testRoom();
      const other = testRoom();
      await store.create(room);
      await store.create(other);
      const listener = vi.fn();
      const fence = vi.fn();
      const unsubscribers = [
        await store.subscribe(room.code, listener),
        await store.subscribe(other.code, fence),
      ];

      await store.update(other.code, 1, nextRevision(other));

      await vi.waitFor(() => {
        expect(fence).toHaveBeenCalledTimes(1);
      });
      expect(listener).not.toHaveBeenCalled();
      for (const unsubscribe of unsubscribers) unsubscribe();
    });

    it.each([
      ["broken JSON", "{"],
      ["another format", JSON.stringify({ ...testRoom(), format: 3 })],
      ["a record that is not one", JSON.stringify({ ...testRoom(), record: "moves" })],
    ])("reads %s as no room", async (_label, json) => {
      const code = randomRoomCode();
      await harness.writeRaw(code, 1, json);

      expect(await store.get(code)).toBeNull();
    });

    it("Phòng dừng ở lượt máy: plays on when a seated player comes back without a name, keeping theirs", async () => {
      const lan = { playerId: "player-two-0123456789", name: "Lan" };
      // A Cờ cá ngựa room for three left on the turn of its AI in the first seat.
      const room = testRoom({
        gameId: "ludo",
        revision: 4,
        players: [{ kind: "ai" }, { kind: "human", ...lan }, { kind: "ai" }],
        record: {
          version: RECORD_VERSION,
          gameId: "ludo",
          playerCount: 3,
          options: LUDO_DEFAULT_OPTIONS,
          entries: [],
        },
      });
      await store.create(room);
      const service = createRoomService({
        store,
        rng: createRng(1),
        now: () => 2_000,
        games: [ludo],
      });

      const joined = await service.join(room.code, lan.playerId, null);

      expect(joined.ok).toBe(true);
      if (!joined.ok) return;
      expect(seatOf(joined.value, lan.playerId)).toBe(1);
      expect(joined.value.players[1]).toEqual({ kind: "human", ...lan });
      expect(joined.value.record.entries.length).toBeGreaterThan(0);
      expect(joined.value.revision).toBe(5);
      expect(await store.get(room.code)).toEqual(joined.value);
    });

    it("Ván dở từ bản trước: lets a seated player back into a room stored before AI seats, and play on", async () => {
      const code = randomRoomCode();
      const lan = { playerId: "player-one-0123456789", name: "Lan" };
      const an = { playerId: "player-two-0123456789", name: "An" };
      // Format 1, as the version before AI seats and hosts wrote it.
      await harness.writeRaw(
        code,
        3,
        JSON.stringify({
          format: 1,
          code,
          gameId: "tictactoe",
          revision: 3,
          gameNumber: 1,
          players: [lan, an],
          record: { ...testRoom().record, entries: [{ move: { cell: 4 } }] },
          updatedAt: 1_000,
        }),
      );
      const service = createRoomService({
        store,
        rng: createRng(1),
        now: () => 2_000,
        games: [tictactoe],
      });

      const joined = await service.join(code, an.playerId, an.name);
      expect(joined.ok && seatOf(joined.value, an.playerId)).toBe(1);
      expect(joined.ok && joined.value.record.entries).toEqual([{ move: { cell: 4 } }]);

      const moved = await service.move(
        code,
        an.playerId,
        { gameNumber: 1, moveIndex: 1 },
        { cell: 0 },
      );
      expect(moved.ok).toBe(true);
      expect(await store.get(code)).toMatchObject({
        format: STORED_ROOM_FORMAT,
        hostId: null,
        players: [
          { kind: "human", ...lan },
          { kind: "human", ...an },
        ],
        record: { entries: [{ move: { cell: 4 } }, { move: { cell: 0 } }] },
      });
    });
  });
}
