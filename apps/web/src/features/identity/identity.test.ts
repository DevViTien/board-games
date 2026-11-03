import { playerIdSchema } from "@board-games/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IDENTITY_KEY, ROOM_IDENTITY_KEY_PREFIX } from "@/config/storage-keys";

import type * as IdentityModule from "./identity";

// A fresh module per test: the identity kept in memory when storage is blocked lives in the module.
let identity: typeof IdentityModule;

beforeEach(async () => {
  vi.resetModules();
  identity = await import("./identity");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("identity", () => {
  it("has none before the player has given a name", () => {
    expect(identity.readIdentity()).toBeNull();
  });

  it("creates a player id with the first name, and keeps it when the name changes", () => {
    const first = identity.saveName("Minh");
    expect(playerIdSchema.safeParse(first.playerId).success).toBe(true);
    expect(identity.readIdentity()).toEqual(first);

    const renamed = identity.saveName("Minh Anh");

    expect(renamed).toEqual({ playerId: first.playerId, name: "Minh Anh" });
    expect(identity.readIdentity()).toEqual(renamed);
  });

  it.each([
    "{corrupt",
    "null",
    '"Minh"',
    '{"playerId":"short","name":"Minh"}',
    '{"playerId":"0123456789abcdef0123","name":"   "}',
  ])("has none, without an error, when the remembered identity is corrupt: %s", (raw) => {
    window.localStorage.setItem(IDENTITY_KEY, raw);

    expect(identity.readIdentity()).toBeNull();
  });

  it("keeps the identity for the tab when the browser refuses to store it", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    const saved = identity.saveName("Minh");

    expect(identity.readIdentity()).toEqual(saved);
    expect(identity.saveName("Lan").playerId).toBe(saved.playerId);
  });

  it("keeps the identity for the tab when storage is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    const saved = identity.saveName("Minh");

    expect(identity.readIdentity()).toEqual(saved);
  });

  it("keeps the tab's new name over an older one the browser still holds but no longer updates", () => {
    const old = identity.saveName("Minh");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    const renamed = identity.saveName("Lan");

    expect(renamed).toEqual({ playerId: old.playerId, name: "Lan" });
    expect(identity.readIdentity()).toEqual(renamed);
  });

  it("makes a player id the protocol accepts without crypto.randomUUID (plain http)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const { playerId } = identity.saveName("Minh");

    expect(playerId).toMatch(/^[0-9a-f]{32}$/);
    expect(playerIdSchema.safeParse(playerId).success).toBe(true);
  });

  it("makes a new guest player id each time, the protocol accepts, and remembers none", () => {
    const first = identity.guestPlayerId();
    const second = identity.guestPlayerId();

    expect(first).not.toBe(second);
    expect(playerIdSchema.safeParse(first).success).toBe(true);
    expect(identity.readIdentity()).toBeNull();
    expect(window.localStorage.getItem(IDENTITY_KEY)).toBeNull();
  });

  describe("with the id of a room page", () => {
    it("remembers that id with the name when the browser has no identity yet", () => {
      const guest = identity.guestPlayerId();

      expect(identity.saveName("Lan", guest)).toEqual({ playerId: guest, name: "Lan" });
      expect(identity.readIdentity()).toEqual({ playerId: guest, name: "Lan" });
    });

    it("renames the remembered identity when it has that id", () => {
      const { playerId } = identity.saveName("Lan");

      expect(identity.saveName("Lan Anh", playerId)).toEqual({ playerId, name: "Lan Anh" });
      expect(identity.readIdentity()).toEqual({ playerId, name: "Lan Anh" });
    });

    it("writes nothing when another tab remembered another id meanwhile", () => {
      const other = identity.saveName("Lan");
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      const guest = identity.guestPlayerId();

      expect(identity.saveName("Minh", guest)).toEqual({ playerId: guest, name: "Minh" });
      expect(identity.readIdentity()).toEqual(other);
      expect(setItem).not.toHaveBeenCalled();
    });

    it("keeps that id for the tab when the browser refuses to store it", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
      const guest = identity.guestPlayerId();

      expect(identity.saveName("Lan", guest)).toEqual({ playerId: guest, name: "Lan" });
      expect(identity.readIdentity()).toEqual({ playerId: guest, name: "Lan" });
      expect(identity.saveName("Lan Anh", guest)).toEqual({ playerId: guest, name: "Lan Anh" });
    });
  });

  describe("pinned to a room page in this tab", () => {
    const pinned = { playerId: "guest-0123456789abcdef", name: "Lan" };

    it("reads back the identity pinned to that room only", () => {
      identity.pinRoomIdentity("ABC234", pinned);

      expect(identity.readRoomIdentity("ABC234")).toEqual(pinned);
      expect(identity.readRoomIdentity("XYZ789")).toBeNull();
      // Nothing is remembered for other rooms or tabs.
      expect(identity.readIdentity()).toBeNull();
    });

    it.each([
      "{corrupt",
      '{"playerId":"short","name":"Lan"}',
      '{"playerId":"guest-0123456789abcdef"}',
    ])("has none, without an error, when the pin is corrupt: %s", (raw) => {
      window.sessionStorage.setItem(`${ROOM_IDENTITY_KEY_PREFIX}ABC234`, raw);

      expect(identity.readRoomIdentity("ABC234")).toBeNull();
    });

    it("has none, without an error, when the browser refuses the storage", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });

      expect(() => {
        identity.pinRoomIdentity("ABC234", pinned);
      }).not.toThrow();
      expect(identity.readRoomIdentity("ABC234")).toBeNull();
    });
  });

  it("reads a name the way the server does", () => {
    expect(identity.parsePlayerName("  Minh  ")).toBe("Minh");
    expect(identity.parsePlayerName("   ")).toBeNull();
    expect(identity.parsePlayerName("a".repeat(24))).toBe("a".repeat(24));
    expect(identity.parsePlayerName("a".repeat(25))).toBeNull();
  });
});
