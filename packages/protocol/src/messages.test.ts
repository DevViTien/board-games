import { describe, expect, it } from "vitest";

import { parseClientMessage, parseServerMessage, readGreetingVersion } from "./messages";
import { PROTOCOL_VERSION } from "./room";

const PLAYER_ID = "player_0123456789-abc";

const room = {
  code: "ABC234",
  gameId: "tictactoe",
  revision: 2,
  gameNumber: 1,
  seats: [{ name: "Lan" }, { name: "An" }],
  record: {
    version: 1,
    gameId: "tictactoe",
    playerCount: 2,
    options: {},
    entries: [{ move: { cell: 4 } }],
  },
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
    { type: "sit", name: "An" },
    { type: "move", gameNumber: 1, moveIndex: 0, move: { cell: 4 } },
    { type: "rematch", gameNumber: 2 },
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
    ["an invalid name", { name: "" }],
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
    ["a sit with an invalid name", { type: "sit", name: " " }],
    ["an unknown field", { type: "ping", at: 1 }],
    ["an unknown type", { type: "resign" }],
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
});

describe("readGreetingVersion", () => {
  it("reads the version of a greeting even when the rest is from another version", () => {
    expect(readGreetingVersion({ type: "join", protocol: 7, field: "from the future" })).toBe(7);
    expect(readGreetingVersion({ type: "create", protocol: 1 })).toBe(1);
  });

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
      room: { ...room, seats: [{ name: "Lan", playerId: PLAYER_ID }, null] },
      you: 0,
    });

    expect(JSON.stringify(parsed)).not.toContain(PLAYER_ID);
  });

  it.each([
    ["an unknown code", { type: "error", code: "server-on-fire" }],
    ["a seat index that is negative", { type: "room", room, you: -1 }],
    ["a code that is not canonical", { type: "created", code: "abc234" }],
    ["an unknown type", { type: "chat" }],
  ])("rejects a message with %s", (_label, message) => {
    expect(parseServerMessage(message)).toBeNull();
  });
});
