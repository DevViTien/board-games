import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins class names and skips falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("supports conditional objects", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });

  it("lets later classes override conflicting earlier ones", () => {
    expect(cn("px-4 py-2", "px-6")).toBe("py-2 px-6");
  });

  it("resolves conflicts between design-token utilities", () => {
    expect(cn("bg-surface text-fg", "bg-accent")).toBe("text-fg bg-accent");
    expect(cn("text-sm text-fg-muted", "text-fg")).toBe("text-sm text-fg");
  });
});
