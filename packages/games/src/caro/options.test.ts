import { describe, expect, it } from "vitest";

import { CARO_DEFAULT_OPTIONS, parseCaroOptions } from "./options";

describe("caro options", () => {
  it("default to a 15×15 board with the blocked-ends rule", () => {
    expect(CARO_DEFAULT_OPTIONS).toEqual({ size: 15, rule: "blocked-ends" });
  });

  it.each([
    [{ size: 15, rule: "blocked-ends" }],
    [{ size: 19, rule: "blocked-ends" }],
    [{ size: 15, rule: "free" }],
    [{ size: 19, rule: "free" }],
    [{ size: "infinite", rule: "blocked-ends" }],
    [{ size: "infinite", rule: "free" }],
  ])("accept %o", (options) => {
    expect(parseCaroOptions(options)).toEqual(options);
  });

  it("fill a missing key with its default", () => {
    expect(parseCaroOptions({ size: 19 })).toEqual({ size: 19, rule: "blocked-ends" });
    expect(parseCaroOptions({ rule: "free" })).toEqual({ size: 15, rule: "free" });
    expect(parseCaroOptions({})).toEqual(CARO_DEFAULT_OPTIONS);
  });

  it.each([
    ["an unsupported board size", { size: 17 }],
    ["a size written as text", { size: "15" }],
    ["another word for the board that grows", { size: "unlimited" }],
    ["an unknown rule", { rule: "exactly-five" }],
    ["an unknown key", { size: 15, renju: true }],
  ])("refuse %s", (_what, options) => {
    expect(parseCaroOptions(options)).toBeNull();
  });

  it.each([
    ["null", null],
    ["a number", 15],
    ["a string", "15"],
    ["an array", [15]],
    ["a class instance", new Date(0)],
  ])("refuse %s, which is not a plain object", (_what, raw) => {
    expect(parseCaroOptions(raw)).toBeNull();
  });
});
