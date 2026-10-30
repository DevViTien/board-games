import { describe, expect, it } from "vitest";

import { defaultMoveKey, stableStringify } from "./move-key";

describe("stableStringify", () => {
  it("gives the same string whatever the key order", () => {
    expect(stableStringify({ row: 1, col: 2 })).toBe(stableStringify({ col: 2, row: 1 }));
  });

  it("sorts keys of nested objects", () => {
    expect(stableStringify({ b: { y: 1, x: [{ q: 1, p: 2 }] }, a: 0 })).toBe(
      '{"a":0,"b":{"x":[{"p":2,"q":1}],"y":1}}',
    );
  });

  it("keeps array order", () => {
    expect(stableStringify([3, 1, 2])).toBe("[3,1,2]");
  });

  it("matches JSON for primitives and skips undefined object values", () => {
    expect(stableStringify("e2e4")).toBe('"e2e4"');
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(stableStringify([undefined])).toBe("[null]");
  });

  it("throws on values JSON cannot represent", () => {
    expect(() => stableStringify(undefined)).toThrow(TypeError);
    expect(() => stableStringify({ run: () => 1 })).toThrow(TypeError);
  });

  it("writes array holes as null, so a sparse array neither matches [] nor gives invalid JSON", () => {
    // eslint-disable-next-line no-sparse-arrays -- holes are the point of the test
    expect(stableStringify([,])).toBe("[null]");
    // eslint-disable-next-line no-sparse-arrays -- holes are the point of the test
    expect(stableStringify([1, , 2])).toBe("[1,null,2]");
  });

  it("throws on objects that are not plain instead of writing them as {}", () => {
    expect(() => stableStringify({ at: new Date(0) })).toThrow(TypeError);
    expect(() => stableStringify(new Map([[1, 2]]))).toThrow(TypeError);
    expect(stableStringify(Object.assign(Object.create(null) as object, { a: 1 }))).toBe('{"a":1}');
  });
});

describe("defaultMoveKey", () => {
  it("is the stable JSON of the move", () => {
    expect(defaultMoveKey({ to: 4, from: 0 })).toBe('{"from":0,"to":4}');
  });
});
