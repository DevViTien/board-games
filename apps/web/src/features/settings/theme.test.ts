import { afterEach, describe, expect, it } from "vitest";

import { applyTheme, currentTheme, parseTheme, themeAttribute } from "./theme";

function cookieValue(): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("theme="))
    ?.slice("theme=".length);
}

afterEach(() => {
  applyTheme("system");
});

describe("parseTheme", () => {
  it("reads a picked theme", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it.each([undefined, "", "system", "khong-hop-le", "DARK", "dark;"])(
    "Lựa chọn đã nhớ hỏng: %j follows the system, without an error",
    (raw) => {
      expect(parseTheme(raw)).toBe("system");
    },
  );
});

describe("themeAttribute", () => {
  it("sets data-theme for a picked theme, none for the system", () => {
    expect(themeAttribute("dark")).toBe("dark");
    expect(themeAttribute("light")).toBe("light");
    expect(themeAttribute("system")).toBeUndefined();
  });
});

describe("applyTheme", () => {
  it("shows a picked theme at once and remembers it in a cookie", () => {
    applyTheme("dark");

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(cookieValue()).toBe("dark");
    expect(currentTheme()).toBe("dark");
  });

  it("forgets both for the system", () => {
    applyTheme("light");
    applyTheme("system");

    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(cookieValue()).toBeUndefined();
    expect(currentTheme()).toBe("system");
  });
});
