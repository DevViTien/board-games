import { describe, expect, it } from "vitest";

import { deepEqual, findNonPlainData } from "./plain-data";

describe("findNonPlainData", () => {
  it("accepts JSON data", () => {
    expect(findNonPlainData({ board: [[0, null, "x"]], turn: 1, over: false })).toBeNull();
  });

  it.each([
    ["a class instance", { at: new Date(0) }, "$.at"],
    ["undefined", { at: undefined }, "$.at"],
    ["a non-finite number", [1, Number.NaN], "$[1]"],
    ["negative zero, which JSON turns into 0", { score: -0 }, "$.score"],
    // eslint-disable-next-line no-sparse-arrays -- the hole is the point of the test
    ["an array hole, which JSON turns into null", [1, , 2], "$"],
    ["a symbol key, which JSON drops", { [Symbol("tag")]: 1 }, "$"],
    [
      "a non-enumerable property, which JSON drops",
      Object.defineProperty({}, "hidden", { value: 1 }),
      "$",
    ],
  ])("reports %s", (_label, value, path) => {
    expect(findNonPlainData(value)).toBe(path);
  });
});

describe("deepEqual", () => {
  it("compares plain data structurally", () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("does not skip array holes", () => {
    // eslint-disable-next-line no-sparse-arrays -- the hole is the point of the test
    expect(deepEqual([, 1], [2, 1])).toBe(false);
  });
});
