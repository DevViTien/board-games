import { expect, type Page, test } from "@playwright/test";

import {
  PAGE_WITHOUT_STORAGE,
  pickLanguage,
  pickTheme,
  savedLudoGame,
  writeSaved,
} from "./helpers";

// Spec accessibility "Màu thanh trình duyệt theo nền trang": `theme-color` follows the background
// on screen, a game's own on its play screen, in the theme picked even against the system's.

/** Cờ cá ngựa's page in the dark (games/ludo/theme.css), and the menu's in the light. */
const LUDO_DARK = "rgb(31, 26, 18)";
const MENU_LIGHT = "rgb(246, 245, 241)";
const MENU_DARK = "rgb(18, 19, 34)";

/** The colour the browser's bar takes: the first `theme-color` whose media matches. */
function themeColour(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    const meta = metas.find((tag) => tag.media === "" || window.matchMedia(tag.media).matches);
    return meta?.content ?? null;
  });
}

async function openLudo(page: Page): Promise<void> {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "ludo:local", savedLudoGame(2, []));
  await page.goto("/play/ludo/local");
  await expect(page.locator("[data-ply]")).toBeVisible();
}

/** Gom thạch's page in the dark (puzzles/jelly-gather/theme.css). */
const JELLY_DARK = "rgb(21, 22, 42)";

test.describe("on a light system", () => {
  test.use({ colorScheme: "light" });

  test("Gom thạch ở giao diện tối: a level's bar takes the puzzle's dark tray page", async ({
    page,
  }) => {
    await page.goto("/");
    await pickTheme(page, "Tối");
    await page.goto("/puzzles/jelly-gather/1-1");
    await expect(page.getByRole("heading", { level: 1, name: "Màn 1-1" })).toBeVisible();
    await expect.poll(() => themeColour(page)).toBe(JELLY_DARK);
  });

  test("Màn hình chơi Cờ cá ngựa ở giao diện tối: the bar takes Cờ cá ngựa's dark paper", async ({
    page,
  }) => {
    await page.goto("/");
    await pickTheme(page, "Tối");

    await openLudo(page);

    await expect.poll(() => themeColour(page)).toBe(LUDO_DARK);
  });

  test("Về menu: back on the menu in the light theme, the bar takes the menu's light paper", async ({
    page,
  }) => {
    await openLudo(page);
    await page.getByRole("link", { name: "Về menu" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect.poll(() => themeColour(page)).toBe(MENU_LIGHT);
  });

  test("follows the theme picked while the page is open", async ({ page }) => {
    await openLudo(page);
    await pickTheme(page, "Tối");

    await expect.poll(() => themeColour(page)).toBe(LUDO_DARK);
  });

  test("a theme picked, then a new language: the bar keeps the game's colour", async ({ page }) => {
    await openLudo(page);
    await pickTheme(page, "Tối");
    await expect.poll(() => themeColour(page)).toBe(LUDO_DARK);

    // The server re-renders the page's head, its tags with the shared colour again.
    await pickLanguage(page, "English");

    await expect.poll(() => themeColour(page)).toBe(LUDO_DARK);
    await page.waitForTimeout(500);
    expect(await themeColour(page)).toBe(LUDO_DARK);
  });

  test("a theme picked, then another page: the bar takes that page's colour in that theme", async ({
    page,
  }) => {
    await openLudo(page);
    await pickTheme(page, "Tối");
    await expect.poll(() => themeColour(page)).toBe(LUDO_DARK);

    await page.getByRole("link", { name: "Về menu" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect.poll(() => themeColour(page)).toBe(MENU_DARK);

    await page.goto("/rules/ludo");
    await expect.poll(() => themeColour(page)).toBe(LUDO_DARK);
  });

  test("the server's HTML already has the shared paper, one per colour scheme", async ({
    page,
  }) => {
    const html = await (await page.request.get("/")).text();
    expect(html).toContain(
      '<meta name="theme-color" content="#f6f5f1" media="(prefers-color-scheme: light)"/>',
    );
    expect(html).toContain(
      '<meta name="theme-color" content="#121322" media="(prefers-color-scheme: dark)"/>',
    );
    expect(html).toMatch(
      /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"\/>/u,
    );
  });
});
