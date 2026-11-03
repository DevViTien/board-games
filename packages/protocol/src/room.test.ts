import { describe, expect, it } from "vitest";

import {
  normalizeRoomCode,
  playerNameSchema,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  roomViewSchema,
} from "./room";

describe("room codes", () => {
  it("uses 31 characters that cannot be mistaken for one another", () => {
    expect(ROOM_CODE_ALPHABET).toHaveLength(31);
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01OIL]/u);
    expect(new Set(ROOM_CODE_ALPHABET).size).toBe(31);
    expect(ROOM_CODE_LENGTH).toBe(6);
  });

  it("normalizes a code typed in lower case with spaces inside and around", () => {
    expect(normalizeRoomCode("abc 234")).toBe("ABC234");
    expect(normalizeRoomCode("  aB c2 34\t")).toBe("ABC234");
    expect(normalizeRoomCode("XYZ789")).toBe("XYZ789");
  });

  it.each(["ABC230", "ABCO34", "ABC134", "ABCI34", "ABCL34", "abcl34"])(
    "rejects %s, which holds a confusable character",
    (raw) => {
      expect(normalizeRoomCode(raw)).toBeNull();
    },
  );

  it.each(["ABC23", "ABC2345", "", "ABC-34", "ÀBC234", "ABC 23"])(
    "rejects %j, which has the wrong length or a stray character",
    (raw) => {
      expect(normalizeRoomCode(raw)).toBeNull();
    },
  );
});

describe("playerNameSchema", () => {
  const parse = (raw: unknown) => playerNameSchema.safeParse(raw);

  it("trims the name and puts it in NFC", () => {
    expect(parse("  Lan  ").data).toBe("Lan");
    // "Vi\u1EC7t" typed as e + combining dot below + combining circumflex becomes the precomposed \u1EC7.
    expect(parse("Vie\u0323\u0302t").data).toBe("Vi\u1EC7t");
  });

  it("accepts 24 characters and counts an emoji once", () => {
    expect(parse("a".repeat(24)).success).toBe(true);
    expect(parse("🎲".repeat(24)).success).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["25 characters", "a".repeat(25)],
    ["a control character", "Lan\u0007"],
    ["a line break", "Lan\nAn"],
    ["a bidi override", "Lan\u202Eabc"],
    ["a zero-width space", "La\u200Bn"],
    ["a zero-width joiner", "La\u200Dn"],
    ["not a string", 42],
  ])("rejects a name with %s", (_label, raw) => {
    expect(parse(raw).success).toBe(false);
  });
});

describe("roomViewSchema", () => {
  const view = {
    code: "ABC234",
    gameId: "tictactoe",
    revision: 3,
    gameNumber: 1,
    seats: [{ kind: "human", name: "Lan" }, null],
    host: 0,
    record: { version: 1, gameId: "tictactoe", playerCount: 2, options: {}, entries: [] },
  };

  it("accepts a room", () => {
    expect(roomViewSchema.parse(view)).toEqual(view);
  });

  it("accepts AI seats and a room without a host", () => {
    const withAi = { ...view, seats: [{ kind: "human", name: "Lan" }, { kind: "ai" }], host: null };

    expect(roomViewSchema.parse(withAi)).toEqual(withAi);
  });

  it("drops any playerId, in the room and in its seats", () => {
    const parsed = roomViewSchema.parse({
      ...view,
      playerId: "secret-secret-secret",
      seats: [{ kind: "human", name: "Lan", playerId: "secret-secret-secret" }, null],
    });

    expect(JSON.stringify(parsed)).not.toContain("playerId");
    expect(parsed.seats[0]).toEqual({ kind: "human", name: "Lan" });
  });

  it("rejects a code that is not canonical", () => {
    expect(roomViewSchema.safeParse({ ...view, code: "abc234" }).success).toBe(false);
  });
});
