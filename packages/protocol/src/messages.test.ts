import { describe, expect, it } from "vitest";

import { parseClientMessage, parseServerMessage, readGreetingVersion } from "./messages";
import { PROTOCOL_VERSION } from "./room";

const PLAYER_ID = "player_0123456789-abc";

const room = {
  code: "ABC234",
  gameId: "tictactoe",
  revision: 2,
  gameNumber: 1,
  seats: [
    { kind: "human", name: "Lan", standIn: false },
    { kind: "human", name: "An", standIn: false },
  ],
  host: 0,
  record: {
    version: 1,
    gameId: "tictactoe",
    playerCount: 2,
    options: {},
    entries: [{ move: { cell: 4 } }],
  },
  turnIdleMs: 2_000,
};

describe("parseClientMessage", () => {
  it.each([
    {
      type: "create",
      protocol: PROTOCOL_VERSION,
      gameId: "tictactoe",
      playerId: PLAYER_ID,
      name: "Lan",
    },
    {
      type: "create",
      protocol: PROTOCOL_VERSION,
      gameId: "dice-race",
      playerCount: 3,
      options: { target: 30 },
      playerId: PLAYER_ID,
      name: "Lan",
    },
    { type: "join", protocol: PROTOCOL_VERSION, code: "abc 234", playerId: PLAYER_ID, name: "An" },
    // A visitor who has not chosen a name yet.
    { type: "join", protocol: PROTOCOL_VERSION, code: "ABC234", playerId: PLAYER_ID },
    { type: "sit", name: "An" },
    { type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } },
    { type: "rematch", gameNumber: 2 },
    { type: "ai-seat", seat: 2, on: true },
    { type: "ai-seat", seat: 0, on: false },
    // Not a seat of any room, but read: the server answers it with `invalid-seat`.
    { type: "ai-seat", seat: 7, on: true },
    { type: "ai-seat", seat: -1, on: true },
    { type: "ping" },
  ])("accepts a valid $type message", (message) => {
    expect(parseClientMessage(message)).toEqual(message);
  });

  it("trims and normalizes the name of a greeting", () => {
    expect(
      parseClientMessage({
        type: "join",
        protocol: PROTOCOL_VERSION,
        code: "ABC234",
        playerId: PLAYER_ID,
        name: "  An ",
      }),
    ).toMatchObject({ name: "An" });
  });

  it("reads another protocol version, which the server answers with outdated-client", () => {
    expect(
      parseClientMessage({
        type: "join",
        protocol: PROTOCOL_VERSION + 1,
        code: "ABC234",
        playerId: PLAYER_ID,
        name: "An",
      }),
    ).not.toBeNull();
  });

  it.each([
    ["a playerId that is too short", { playerId: "short" }],
    ["a playerId with other characters", { playerId: "player 0123456789abc" }],
    ["a playerId that is too long", { playerId: "a".repeat(65) }],
    ["an empty name", { name: "" }],
    ["a blank name", { name: "   " }],
    ["a name that is too long", { name: "a".repeat(25) }],
    ["a name that is not a string", { name: null }],
    ["an unknown field", { extra: true }],
  ])("rejects a greeting with %s", (_label, change) => {
    expect(
      parseClientMessage({
        type: "join",
        protocol: PROTOCOL_VERSION,
        code: "ABC234",
        playerId: PLAYER_ID,
        name: "An",
        ...change,
      }),
    ).toBeNull();
  });

  it.each([
    ["a negative moveIndex", { type: "move", gameNumber: 1, moveIndex: -1, move: {} }],
    ["a fractional moveIndex", { type: "move", gameNumber: 1, moveIndex: 0.5, move: {} }],
    ["a negative gameNumber", { type: "move", gameNumber: -1, moveIndex: 0, move: {} }],
    ["a fractional gameNumber", { type: "rematch", gameNumber: 1.5 }],
    ["no move", { type: "move", gameNumber: 1, moveIndex: 0 }],
    ["a sit without a name", { type: "sit" }],
    [
      "a create without a name",
      { type: "create", protocol: PROTOCOL_VERSION, gameId: "tictactoe", playerId: PLAYER_ID },
    ],
    ["a sit with an invalid name", { type: "sit", name: " " }],
    ["an unknown field", { type: "ping", at: 1 }],
    ["an ai-seat with a fractional seat", { type: "ai-seat", seat: 1.5, on: true }],
    ["an ai-seat without on", { type: "ai-seat", seat: 1 }],
    ["an ai-seat with an on that is not a boolean", { type: "ai-seat", seat: 1, on: "yes" }],
    ["an ai-seat with an unknown field", { type: "ai-seat", seat: 1, on: true, level: "hard" }],
    ["an unknown type", { type: "concede" }],
    ["a resign without a gameNumber", { type: "resign" }],
    ["a resign with an unknown field", { type: "resign", gameNumber: 1, seat: 0 }],
    ["a claim without a moveIndex", { type: "claim-abandoned", gameNumber: 1 }],
    [
      "a claim with a negative moveIndex",
      { type: "claim-abandoned", gameNumber: 1, moveIndex: -1 },
    ],
    [
      "a claim with an unknown field",
      { type: "claim-abandoned", gameNumber: 1, moveIndex: 0, seat: 1 },
    ],
    ["no type", {}],
  ])("rejects a message with %s", (_label, message) => {
    expect(parseClientMessage(message)).toBeNull();
  });

  it.each([null, "ping", 42, []])("rejects %j", (raw) => {
    expect(parseClientMessage(raw)).toBeNull();
  });

  it("trims and normalizes the name sent with a sit", () => {
    expect(parseClientMessage({ type: "sit", name: " An  " })).toEqual({ type: "sit", name: "An" });
  });

  it.each([
    { type: "resign", gameNumber: 2 },
    { type: "claim-abandoned", gameNumber: 1, moveIndex: 7 },
  ])("accepts a $type request", (message) => {
    expect(parseClientMessage(message)).toEqual(message);
  });
});

describe("readGreetingVersion", () => {
  it("reads the version of a greeting even when the rest is from another version", () => {
    expect(readGreetingVersion({ type: "join", protocol: 7, field: "from the future" })).toBe(7);
    expect(readGreetingVersion({ type: "create", protocol: 1 })).toBe(1);
  });

  it.each([1, 2])(
    "reads version %i from a tab opened before resigning, which the server answers with outdated-client",
    (version) => {
      expect(PROTOCOL_VERSION).toBe(3);
      expect(
        readGreetingVersion({
          type: "join",
          protocol: version,
          code: "ABC234",
          playerId: PLAYER_ID,
          name: "An",
        }),
      ).toBe(version);
    },
  );

  it.each([{ type: "sit", name: "An" }, { type: "join" }, "join", null])(
    "has no version for %j",
    (raw) => {
      expect(readGreetingVersion(raw)).toBeNull();
    },
  );
});

describe("parseServerMessage", () => {
  it.each([
    { type: "created", code: "ABC234" },
    { type: "room", room, you: 1 },
    { type: "room", room, you: null },
    { type: "rejected", request: "move", code: "not-your-turn" },
    { type: "rejected", request: "move", code: "illegal-move" },
    { type: "rejected", request: null, code: "invalid-message" },
    { type: "rejected", request: "ai-seat", code: "not-host" },
    { type: "rejected", request: "ai-seat", code: "seat-taken" },
    { type: "rejected", request: "ai-seat", code: "not-ai-seat" },
    { type: "rejected", request: "ai-seat", code: "game-started" },
    { type: "rejected", request: "ai-seat", code: "invalid-seat" },
    { type: "rejected", request: "ai-seat", code: "ai-not-supported" },
    { type: "rejected", request: "claim-abandoned", code: "not-abandoned" },
    { type: "rejected", request: "claim-abandoned", code: "stale-move" },
    { type: "rejected", request: "resign", code: "game-over" },
    { type: "error", code: "room-not-found" },
    { type: "pong" },
  ])("accepts a valid $type message", (message) => {
    expect(parseServerMessage(message)).toEqual(message);
  });

  it("accepts a message carrying a field added by a newer server", () => {
    expect(parseServerMessage({ type: "pong", serverTime: 1 })).toEqual({ type: "pong" });
    expect(parseServerMessage({ type: "room", room: { ...room, chat: [] }, you: 0 })).toEqual({
      type: "room",
      room,
      you: 0,
    });
  });

  it("keeps no playerId from a room", () => {
    const parsed = parseServerMessage({
      type: "room",
      room: { ...room, seats: [{ kind: "human", name: "Lan", playerId: PLAYER_ID }, null] },
      you: 0,
    });

    expect(JSON.stringify(parsed)).not.toContain(PLAYER_ID);
  });

  it("accepts a room with an AI seat and the host's seat", () => {
    const withAi = {
      ...room,
      seats: [{ kind: "human", name: "Lan", standIn: true }, { kind: "ai" }, null],
      host: 0,
    };

    expect(parseServerMessage({ type: "room", room: withAi, you: 0 })).toEqual({
      type: "room",
      room: withAi,
      you: 0,
    });
  });

  it("keeps the ending of a game to the app", () => {
    const ended = {
      ...room,
      record: { ...room.record, ending: { reason: "resigned", player: 1 } },
      turnIdleMs: null,
    };

    expect(parseServerMessage({ type: "room", room: ended, you: 0 })).toEqual({
      type: "room",
      room: ended,
      you: 0,
    });
  });

  it("reads a room without a host as one with no host", () => {
    const withoutHost: Record<string, unknown> = { ...room };
    delete withoutHost.host;

    expect(parseServerMessage({ type: "room", room: withoutHost, you: 0 })).toEqual({
      type: "room",
      room: { ...room, host: null },
      you: 0,
    });
  });

  it.each([
    ["an unknown code", { type: "error", code: "server-on-fire" }],
    [
      "a seat in the format of version 1",
      { type: "room", room: { ...room, seats: [{ name: "Lan" }] }, you: 0 },
    ],
    [
      "a seat of an unknown kind",
      { type: "room", room: { ...room, seats: [{ kind: "robot" }] }, you: 0 },
    ],
    ["a seat index that is negative", { type: "room", room, you: -1 }],
    ["a code that is not canonical", { type: "created", code: "abc234" }],
    ["an unknown type", { type: "chat" }],
  ])("rejects a message with %s", (_label, message) => {
    expect(parseServerMessage(message)).toBeNull();
  });
});
