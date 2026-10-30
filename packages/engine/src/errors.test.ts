import { describe, expect, it } from "vitest";

import { ENGINE_ERROR, err, ok, type Result } from "./errors";

describe("ENGINE_ERROR", () => {
  it("has distinct kebab-case codes", () => {
    const codes = Object.values(ENGINE_ERROR);

    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });
});

describe("Result", () => {
  function describeResult(result: Result<number>): string {
    return result.ok ? `value ${result.value}` : `error ${result.error}`;
  }

  it("is narrowed by `ok`", () => {
    expect(describeResult(ok(3))).toBe("value 3");
    expect(describeResult(err(ENGINE_ERROR.IllegalMove))).toBe("error illegal-move");
  });
});
