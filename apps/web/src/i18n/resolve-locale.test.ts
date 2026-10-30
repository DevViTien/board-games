import { describe, expect, it } from "vitest";

import { resolveLocale } from "./resolve-locale";

describe("resolveLocale", () => {
  it("prefers the saved locale over the browser's languages", () => {
    expect(resolveLocale("ja", "en-US,en;q=0.9")).toBe("ja");
  });

  it("ignores a saved value that is not a supported locale", () => {
    expect(resolveLocale("fr", "en-US")).toBe("en");
  });

  it("matches a regional tag to its base language", () => {
    expect(resolveLocale(undefined, "ja-JP")).toBe("ja");
  });

  it("follows quality values rather than header order", () => {
    expect(resolveLocale(undefined, "en;q=0.5, ja;q=0.8")).toBe("ja");
  });

  it("skips unsupported languages until one is supported", () => {
    expect(resolveLocale(undefined, "fr-FR, de;q=0.9, en;q=0.8")).toBe("en");
  });

  it("ignores languages the browser marks as unacceptable", () => {
    expect(resolveLocale(undefined, "en;q=0, ja;q=0.1")).toBe("ja");
  });

  it("falls back to Vietnamese", () => {
    expect(resolveLocale(undefined, null)).toBe("vi");
    expect(resolveLocale(undefined, "fr, de")).toBe("vi");
    expect(resolveLocale(undefined, "*")).toBe("vi");
  });
});
