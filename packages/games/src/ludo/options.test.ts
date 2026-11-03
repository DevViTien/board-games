import { createSession, currentState, parseGameOptions } from "@board-games/engine";
import { describe, expect, it } from "vitest";

import { LUDO_DEFAULT_OPTIONS, parseAnyLudoOptions, parseLudoOptions } from "./options";
import { ludo } from "./rules";

const VARIANTS = [
  { exitRoll: "one-or-six" },
  { extraRoll: "none" },
  { passing: "free" },
  { oneJump: false },
] as const;

describe("Tuỳ chọn luật của Cờ cá ngựa", () => {
  it("Tuỳ chọn mặc định: exit on 6, roll again on 6, no passing, jump on 1", () => {
    expect(LUDO_DEFAULT_OPTIONS).toEqual({
      exitRoll: "six",
      extraRoll: "six",
      passing: "blocked",
      oneJump: true,
    });
    const created = createSession(ludo, { playerCount: 4, options: ludo.defaultOptions });
    expect(created.ok && currentState(created.value).options).toEqual(LUDO_DEFAULT_OPTIONS);
  });

  it("Thiếu khoá dùng mặc định: an empty object gives the defaults", () => {
    expect(parseLudoOptions({})).toEqual(LUDO_DEFAULT_OPTIONS);
    expect(parseLudoOptions({ oneJump: true })).toEqual(LUDO_DEFAULT_OPTIONS);
    const parsed = parseGameOptions(ludo, {});
    expect(parsed.ok && parsed.value).toEqual(LUDO_DEFAULT_OPTIONS);
  });

  it("accepts the full set of defaults", () => {
    expect(parseLudoOptions({ ...LUDO_DEFAULT_OPTIONS })).toEqual(LUDO_DEFAULT_OPTIONS);
  });

  it.each(VARIANTS)("Biến thể bị từ chối: refuses the variant %o", (variant) => {
    expect(parseLudoOptions(variant)).toBeNull();
    expect(parseGameOptions(ludo, { ...LUDO_DEFAULT_OPTIONS, ...variant })).toEqual({
      ok: false,
      error: "invalid-options",
    });
  });

  it.each([
    ["Giá trị lạ bị từ chối: exit on 5", { exitRoll: "5" }],
    ["a boolean written as text", { oneJump: "true" }],
    ["an unknown key", { twoDice: true }],
  ])("refuses %s", (_what, raw) => {
    expect(parseLudoOptions(raw)).toBeNull();
    expect(parseAnyLudoOptions(raw)).toBeNull();
    expect(parseGameOptions(ludo, raw)).toEqual({ ok: false, error: "invalid-options" });
  });

  it.each([
    ["null", null],
    ["a number", 6],
    ["a string", "six"],
    ["an array", ["six"]],
    ["a class instance", new Date(0)],
  ])("refuses %s, which is not a plain object", (_what, raw) => {
    expect(parseLudoOptions(raw)).toBeNull();
    expect(parseAnyLudoOptions(raw)).toBeNull();
  });

  it.each(VARIANTS)("parseAnyLudoOptions accepts the variant %o", (variant) => {
    expect(parseAnyLudoOptions(variant)).toEqual({ ...LUDO_DEFAULT_OPTIONS, ...variant });
  });

  it("parseAnyLudoOptions accepts every variant at once", () => {
    const all = { exitRoll: "one-or-six", extraRoll: "none", passing: "free", oneJump: false };
    expect(parseAnyLudoOptions(all)).toEqual(all);
  });
});
