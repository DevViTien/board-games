import * as engine from "@board-games/engine";
import { type GameRecord, RECORD_VERSION } from "@board-games/engine";
import type { RoomCode } from "@board-games/protocol";
import { describe, expect, it, vi } from "vitest";

import {
  parseStoredRoom,
  seatOf,
  STORED_ROOM_FORMAT,
  type StoredChatMessage,
  type StoredRoom,
  toRoomView,
} from "./room";

vi.mock("@board-games/engine", { spy: true });

const LAN = { playerId: "lan-0123456789abcdef", name: "Lan" };
const AN = { playerId: "an-0123456789abcdefgh", name: "An" };
/** Someone without a seat; most views here do not depend on who asks. */
const NOBODY = "nobody-0123456789abcd";

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
    chat: [],
    ...overrides,
  };
}

/** Messages of Lan and An, as stored. */
function message(overrides: Partial<StoredChatMessage> = {}): StoredChatMessage {
  return {
    seq: 2,
    id: "chat-0123",
    playerId: LAN.playerId,
    name: "Lan",
    at: 950,
    body: { kind: "text", text: "chào" },
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
      chat: [],
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
      chat: [],
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

describe("the chat of a stored room", () => {
  it("reads messages back from the JSON", () => {
    const stored = room({ chat: [message(), message({ seq: 3, id: "chat-4567" })] });

    expect(parseStoredRoom(JSON.stringify(stored))).toEqual(stored);
  });

  it("Phòng từ bản trước: reads a room of any earlier format as one with no message", () => {
    const current: Record<string, unknown> = { ...room() };
    delete current.chat;
    expect(parseStoredRoom(JSON.stringify(current))?.chat).toEqual([]);

    delete current.turnStartedAt;
    const formatTwo = {
      ...current,
      format: 2,
      players: [{ kind: "human", ...LAN }, { kind: "ai" }],
    };
    expect(parseStoredRoom(JSON.stringify(formatTwo))?.chat).toEqual([]);

    const formatOne = { ...current, format: 1, players: [LAN, null] };
    delete (formatOne as Record<string, unknown>).hostId;
    expect(parseStoredRoom(JSON.stringify(formatOne))?.chat).toEqual([]);
  });

  it("Tin lưu hỏng: leaves out only what it cannot read, and never loses the room", () => {
    const good = message();
    const data = {
      ...room(),
      chat: [
        good,
        { ...good, seq: "three" },
        "not a message",
        null,
        { ...good, seq: 4, body: { kind: "sticker", sticker: "cat" } },
        { ...good, seq: 5, body: { kind: "preset", preset: "from-a-later-version" } },
        message({ seq: 6, id: "chat-4567" }),
      ],
    };

    const parsed = parseStoredRoom(JSON.stringify(data));

    expect(parsed?.chat.map(({ seq }) => seq)).toEqual([2, 6]);
    expect(parsed?.record).toEqual(record);
  });

  it("reads a chat that is not a list as no message", () => {
    expect(parseStoredRoom(JSON.stringify({ ...room(), chat: "broken" }))?.chat).toEqual([]);
    expect(parseStoredRoom(JSON.stringify({ ...room(), chat: null }))?.chat).toEqual([]);
  });
});

describe("toRoomView", () => {
  const withChat = room({
    chat: [message(), message({ seq: 3, playerId: AN.playerId, name: "An" })],
  });

  it("Người chưa có ghế không thấy tin: gives someone without a seat no message", () => {
    expect(toRoomView(withChat, 1_000, NOBODY).chat).toEqual([]);
  });

  it("Tin không có playerId: tells the name and whether it is theirs, but no playerId", () => {
    const view = toRoomView(withChat, 1_000, LAN.playerId);

    expect(view.chat).toEqual([
      { seq: 2, id: "chat-0123", name: "Lan", mine: true, body: { kind: "text", text: "chào" } },
      { seq: 3, id: "chat-0123", name: "An", mine: false, body: { kind: "text", text: "chào" } },
    ]);
    expect(JSON.stringify(view)).not.toContain("playerId");
    expect(JSON.stringify(view)).not.toContain(LAN.playerId);
    expect(JSON.stringify(view)).not.toContain(AN.playerId);
  });

  it("Tin của mình sau khi xoay ghế: follows the player, not the seat", () => {
    const rotated = {
      ...withChat,
      players: [
        { kind: "human", ...AN, standIn: false },
        { kind: "ai" },
        { kind: "human", ...LAN, standIn: false },
      ],
    } satisfies StoredRoom;

    expect(toRoomView(rotated, 1_000, LAN.playerId).chat.map(({ mine }) => mine)).toEqual([
      true,
      false,
    ]);
  });

  it("gives a stand-in's person the messages too: the seat is still theirs", () => {
    expect(toRoomView(withChat, 1_000, AN.playerId).chat).toHaveLength(2);
  });

  it("Người tạo là chủ phòng: tells the host's seat, AI seats, stand-ins and names, but no playerId", () => {
    const view = toRoomView(room(), 1_000, NOBODY);

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
      NOBODY,
    );

    expect(view.host).toBe(1);
  });

  it("has no host for a room stored before hosts", () => {
    expect(toRoomView(room({ hostId: null }), 1_000, NOBODY).host).toBeNull();
  });

  it("Thời gian của lượt: tells how long the turn has lasted at the time it is sent", () => {
    expect(toRoomView(room({ turnStartedAt: 10_000 }), 130_000, NOBODY).turnIdleMs).toBe(120_000);
    // Another instance whose clock is a little behind: never a negative duration.
    expect(toRoomView(room({ turnStartedAt: 10_000 }), 9_990, NOBODY).turnIdleMs).toBe(0);
    expect(toRoomView(room({ turnStartedAt: null }), 130_000, NOBODY).turnIdleMs).toBeNull();
  });

  it("never replays the game", () => {
    vi.mocked(engine.fromRecord).mockClear();

    toRoomView(room(), 5_000, NOBODY);

    expect(engine.fromRecord).not.toHaveBeenCalled();
  });
});

describe("seatOf", () => {
  it("finds a person's seat, stand-in or not, and never an AI seat", () => {
    expect(seatOf(room(), AN.playerId)).toBe(2);
    expect(seatOf(room({ players: [{ kind: "ai" }, null] }), LAN.playerId)).toBeNull();
  });
});
