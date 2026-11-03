import { type GameRecord, RECORD_VERSION } from "@board-games/engine";
import type { RoomCode } from "@board-games/protocol";
import { describe, expect, it } from "vitest";

import { parseStoredRoom, seatOf, STORED_ROOM_FORMAT, type StoredRoom, toRoomView } from "./room";

const LAN = { playerId: "lan-0123456789abcdef", name: "Lan" };
const AN = { playerId: "an-0123456789abcdefgh", name: "An" };

const record: GameRecord = {
  version: RECORD_VERSION,
  gameId: "ludo",
  playerCount: 3,
  options: {},
  entries: [],
};

function room(overrides: Partial<StoredRoom> = {}): StoredRoom {
  return {
    format: STORED_ROOM_FORMAT,
    code: "ABC234" as RoomCode,
    gameId: "ludo",
    revision: 3,
    gameNumber: 1,
    hostId: LAN.playerId,
    players: [{ kind: "human", ...LAN }, { kind: "ai" }, { kind: "human", ...AN }],
    record,
    updatedAt: 1_000,
    ...overrides,
  };
}

describe("parseStoredRoom", () => {
  it("reads back a room with AI seats and a host from its JSON", () => {
    expect(STORED_ROOM_FORMAT).toBe(2);
    expect(parseStoredRoom(JSON.stringify(room()))).toEqual(room());
  });

  it("reads a room stored before AI seats as one where every seat is a person and nobody is host", () => {
    const formatOne = {
      format: 1,
      code: "ABC234",
      gameId: "tictactoe",
      revision: 4,
      gameNumber: 2,
      players: [LAN, AN],
      record: { ...record, gameId: "tictactoe", playerCount: 2, entries: [{ move: { cell: 4 } }] },
      updatedAt: 1_000,
    };

    expect(parseStoredRoom(JSON.stringify(formatOne))).toEqual({
      ...formatOne,
      format: 2,
      hostId: null,
      players: [
        { kind: "human", ...LAN },
        { kind: "human", ...AN },
      ],
    });
  });

  it.each([
    ["an unknown format", { ...room(), format: 3 }],
    ["a seat of an unknown kind", { ...room(), players: [{ kind: "robot" }] }],
    ["a format 2 room without a host field", { ...room(), hostId: undefined }],
    ["a format 1 room holding an AI seat", { ...room(), format: 1 }],
  ])("reads %s as no room", (_label, data) => {
    expect(parseStoredRoom(JSON.stringify(data))).toBeNull();
  });
});

describe("toRoomView", () => {
  it("Người tạo là chủ phòng: tells the host's seat, AI seats and names, but no playerId", () => {
    const view = toRoomView(room());

    expect(view.host).toBe(0);
    expect(view.seats).toEqual([
      { kind: "human", name: "Lan" },
      { kind: "ai" },
      { kind: "human", name: "An" },
    ]);
    expect(JSON.stringify(view)).not.toContain("playerId");
    expect(JSON.stringify(view)).not.toContain(LAN.playerId);
  });

  it("follows the host to their seat after the seats moved on", () => {
    const view = toRoomView(
      room({ players: [{ kind: "human", ...AN }, { kind: "human", ...LAN }, { kind: "ai" }] }),
    );

    expect(view.host).toBe(1);
  });

  it("has no host for a room stored before hosts", () => {
    expect(toRoomView(room({ hostId: null })).host).toBeNull();
  });
});

describe("seatOf", () => {
  it("finds a person's seat and never an AI seat", () => {
    expect(seatOf(room(), AN.playerId)).toBe(2);
    expect(seatOf(room({ players: [{ kind: "ai" }, null] }), LAN.playerId)).toBeNull();
  });
});
