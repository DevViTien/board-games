import { describe, expect, it } from "vitest";

import { deepFreeze } from "./deep-freeze";

describe("deepFreeze", () => {
  it("freezes nested objects and arrays", () => {
    const value = deepFreeze({ board: [[0, 1]], meta: { turn: 0 } });

    expect(Object.isFrozen(value.board[0])).toBe(true);
    expect(Object.isFrozen(value.meta)).toBe(true);
  });

  it("freezes the children of an object that was only frozen shallowly", () => {
    const value = deepFreeze(Object.freeze({ log: [1] }));

    expect(Object.isFrozen(value.log)).toBe(true);
  });

  it("handles cycles and skips typed arrays, which cannot be frozen", () => {
    const value: { self?: unknown; bytes: Uint8Array } = { bytes: new Uint8Array(2) };
    value.self = value;

    expect(() => deepFreeze(value)).not.toThrow();
    expect(Object.isFrozen(value)).toBe(true);
  });
});
