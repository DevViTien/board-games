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

describe("cn with the scales of styles.css", () => {
  it("tells a type size from a text colour", () => {
    expect(cn("text-display", "text-fg")).toBe("text-display text-fg");
    expect(cn("text-title", "text-display")).toBe("text-display");
    expect(cn("text-caption text-fg-muted", "text-small")).toBe("text-fg-muted text-small");
  });

  it("merges the shadows, and keeps a ring beside a shadow", () => {
    expect(cn("shadow-card", "shadow-press")).toBe("shadow-press");
    expect(cn("shadow-press", "ring-2")).toBe("shadow-press ring-2");
  });

  it("merges the radii", () => {
    expect(cn("rounded-control", "rounded-card")).toBe("rounded-card");
    expect(cn("rounded-control", "rounded-full")).toBe("rounded-full");
  });
});
