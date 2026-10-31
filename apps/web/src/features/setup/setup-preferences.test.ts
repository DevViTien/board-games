import { afterEach, describe, expect, it, vi } from "vitest";

import { SETUP_CHOICE_KEY_PREFIX } from "@/config/storage-keys";

import { readSetupChoice, writeSetupChoice } from "./setup-preferences";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("setup preferences", () => {
  it("has nothing for a game never started", () => {
    expect(readSetupChoice("tictactoe", true)).toBeUndefined();
  });

  it("reads back the choice written for each game", () => {
    writeSetupChoice("tictactoe", { mode: "ai", level: "hard", first: "ai" });
    writeSetupChoice("caro", { mode: "local", level: "easy", first: "random" });

    expect(readSetupChoice("tictactoe", true)).toEqual({ mode: "ai", level: "hard", first: "ai" });
    expect(readSetupChoice("caro", true)).toEqual({
      mode: "local",
      level: "easy",
      first: "random",
    });
  });

  it.each(["{not json", "null", '"ai"', '{"mode":"ai","level":"insane","first":"ai"}', "{}"])(
    "gives nothing for corrupt data %j",
    (raw) => {
      window.localStorage.setItem(`${SETUP_CHOICE_KEY_PREFIX}tictactoe`, raw);

      expect(readSetupChoice("tictactoe", true)).toBeUndefined();
    },
  );

  it("gives nothing, and does not throw, when storage cannot be used", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    expect(() => {
      writeSetupChoice("tictactoe", { mode: "ai", level: "hard", first: "ai" });
    }).not.toThrow();
    expect(readSetupChoice("tictactoe", true)).toBeUndefined();
  });

  it("gives nothing when even reaching localStorage throws", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(readSetupChoice("tictactoe", true)).toBeUndefined();
  });

  it("falls back to the same-device mode for a game that cannot be played against the AI", () => {
    writeSetupChoice("chess", { mode: "ai", level: "hard", first: "ai" });

    expect(readSetupChoice("chess", false)).toEqual({ mode: "local", level: "hard", first: "ai" });
  });
});
