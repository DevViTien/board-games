import * as engine from "@board-games/engine";
import { type GameRecord, RECORD_VERSION } from "@board-games/engine";
import type { RoomCode } from "@board-games/protocol";
import { describe, expect, it, vi } from "vitest";

import { parseStoredRoom, seatOf, STORED_ROOM_FORMAT, type StoredRoom, toRoomView } from "./room";

vi.mock("@board-games/engine", { spy: true });

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
    players: [
      { kind: "human", ...LAN, standIn: false },
      { kind: "ai" },
      { kind: "human", ...AN, standIn: true },
    ],
    record,
    updatedAt: 1_000,
    turnStartedAt: 900,
    ...overrides,
  };
}

describe("parseStoredRoom", () => {
  it("reads back a room with AI seats, a stand-in, a host and a turn start from its JSON", () => {
    expect(STORED_ROOM_FORMAT).toBe(3);
    expect(parseStoredRoom(JSON.stringify(room()))).toEqual(room());
    expect(parseStoredRoom(JSON.stringify(room({ turnStartedAt: null })))).toEqual(
      room({ turnStartedAt: null }),
    );
  });

  it("Phòng lưu ở bản trước: reads a format 2 room as one whose turn began at its last write", () => {
    const current: Record<string, unknown> = { ...room() };
    delete current.turnStartedAt;
    const formatTwo = {
      ...current,
      format: 2,
      players: [{ kind: "human", ...LAN }, { kind: "ai" }, { kind: "human", ...AN }],
      updatedAt: 6_000,
    };

    expect(parseStoredRoom(JSON.stringify(formatTwo))).toEqual({
      ...formatTwo,
      format: 3,
      players: [
        { kind: "human", ...LAN, standIn: false },
        { kind: "ai" },
        { kind: "human", ...AN, standIn: false },
      ],
      turnStartedAt: 6_000,
    });
  });

  it("reads a format 2 room still waiting for players as one without a turn", () => {
    const current: Record<string, unknown> = { ...room() };
    delete current.turnStartedAt;
    const waiting = { ...current, format: 2, players: [{ kind: "human", ...LAN }, null, null] };

    expect(parseStoredRoom(JSON.stringify(waiting))?.turnStartedAt).toBeNull();
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
      format: 3,
      hostId: null,
      players: [
        { kind: "human", ...LAN, standIn: false },
        { kind: "human", ...AN, standIn: false },
      ],
      turnStartedAt: 1_000,
    });
  });

  it("keeps the ending of a game that was resigned", () => {
    const ended = room({
      record: { ...record, ending: { reason: "resigned", player: 1 } },
      turnStartedAt: null,
    });

    expect(parseStoredRoom(JSON.stringify(ended))).toEqual(ended);
  });

  it.each([
    ["an unknown format", { ...room(), format: 4 }],
    ["a seat of an unknown kind", { ...room(), players: [{ kind: "robot" }] }],
    ["a format 3 room without a host field", { ...room(), hostId: undefined }],
    ["a format 3 room without a turn start", { ...room(), turnStartedAt: undefined }],
    [
      "a format 3 person without a stand-in flag",
      { ...room(), players: [{ kind: "human", ...LAN }] },
    ],
    ["a format 1 room holding an AI seat", { ...room(), format: 1 }],
  ])("reads %s as no room", (_label, data) => {
    expect(parseStoredRoom(JSON.stringify(data))).toBeNull();
  });
});

describe("toRoomView", () => {
  it("Người tạo là chủ phòng: tells the host's seat, AI seats, stand-ins and names, but no playerId", () => {
    const view = toRoomView(room(), 1_000);

    expect(view.host).toBe(0);
    expect(view.seats).toEqual([
      { kind: "human", name: "Lan", standIn: false },
      { kind: "ai" },
      { kind: "human", name: "An", standIn: true },
    ]);
    expect(JSON.stringify(view)).not.toContain("playerId");
    expect(JSON.stringify(view)).not.toContain(LAN.playerId);
  });

  it("follows the host to their seat after the seats moved on", () => {
    const view = toRoomView(
      room({
        players: [
          { kind: "human", ...AN, standIn: false },
          { kind: "human", ...LAN, standIn: false },
          { kind: "ai" },
        ],
      }),
      1_000,
    );

    expect(view.host).toBe(1);
  });

  it("has no host for a room stored before hosts", () => {
    expect(toRoomView(room({ hostId: null }), 1_000).host).toBeNull();
  });

  it("Thời gian của lượt: tells how long the turn has lasted at the time it is sent", () => {
    expect(toRoomView(room({ turnStartedAt: 10_000 }), 130_000).turnIdleMs).toBe(120_000);
    // Another instance whose clock is a little behind: never a negative duration.
    expect(toRoomView(room({ turnStartedAt: 10_000 }), 9_990).turnIdleMs).toBe(0);
    expect(toRoomView(room({ turnStartedAt: null }), 130_000).turnIdleMs).toBeNull();
  });

  it("never replays the game", () => {
    vi.mocked(engine.fromRecord).mockClear();

    toRoomView(room(), 5_000);

    expect(engine.fromRecord).not.toHaveBeenCalled();
  });
});

describe("seatOf", () => {
  it("finds a person's seat, stand-in or not, and never an AI seat", () => {
    expect(seatOf(room(), AN.playerId)).toBe(2);
    expect(seatOf(room({ players: [{ kind: "ai" }, null] }), LAN.playerId)).toBeNull();
  });
});
