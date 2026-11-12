import { expect, type Page, test } from "@playwright/test";

import {
  choose,
  horseChoices,
  languageButton,
  LUDO_FOUR_CHOICES,
  nameField,
  PAGE_WITHOUT_STORAGE,
  rollButton,
  ROOM_URL,
  savedLudoGame,
  status,
  themeButton,
  writeSaved,
} from "./helpers";

// Spec accessibility "Thanh trên cùng luôn thấy": every page's top bar stays at the top of the
// screen as it scrolls, solid, and never hides the focused element.

const bar = (page: Page) => page.getByRole("banner");

async function scrollToEnd(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

/** The bar at the very top of the screen, with its way back and both settings on screen. */
async function expectBarAtTop(page: Page, { back = true } = {}): Promise<void> {
  // Once the scroll has settled (a page still laying out may be a pixel off for a frame).
  await expect
    .poll(async () => Math.abs((await bar(page).boundingBox())?.y ?? Infinity))
    .toBeLessThan(1);
  if (back) await expect(bar(page).getByRole("link", { name: "Về menu" })).toBeInViewport();
  await expect(themeButton(page)).toBeInViewport({ ratio: 1 });
  await expect(languageButton(page)).toBeInViewport({ ratio: 1 });
  // Solid: nothing scrolled under it shows through.
  const background = await bar(page).evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(background).toMatch(/^rgb\(/u);
}

test.describe("at 390 × 844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Cuộn trang luật: the bar stays at the top with Về menu, Giao diện and Ngôn ngữ", async ({
    page,
  }) => {
    await page.goto("/rules/chess");
    await scrollToEnd(page);

    await expectBarAtTop(page);
  });
});

test.describe("on a short screen, where every page scrolls", () => {
  test.use({ viewport: { width: 390, height: 560 } });

  test("the bar stays at the top of the menu, the setup screen, the lobby and the rules", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollToEnd(page);
    await expectBarAtTop(page, { back: false });

    await page.goto("/play/ludo");
    await scrollToEnd(page);
    await expectBarAtTop(page);

    await choose(page, "Chế độ", "Online");
    await choose(page, "Số người chơi", "4 người");
    await nameField(page).fill("Minh");
    await page.getByRole("button", { name: "Tạo phòng" }).click();
    await expect(page).toHaveURL(ROOM_URL);
    // The lobby itself, not the "joining" screen before it.
    await expect(page.getByRole("region", { name: "Người chơi" })).toBeVisible();
    await scrollToEnd(page);
    await expectBarAtTop(page);

    await page.goto("/rules/ludo");
    await scrollToEnd(page);
    await expectBarAtTop(page);
  });
});

test.describe("at 360 × 740", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("Cuộn menu bằng Tab: the menu's last link comes into view whole, under the bar", async ({
    page,
  }) => {
    await page.goto("/");
    const licences = page.getByRole("link", { name: "Giấy phép bên thứ ba" });

    for (let presses = 0; presses < 80; presses += 1) {
      await page.keyboard.press("Tab");
      if (await licences.evaluate((link) => link === document.activeElement)) break;
    }

    await expect(licences).toBeFocused();
    await expect(licences).toBeInViewport({ ratio: 1 });
    const link = await licences.boundingBox();
    const top = await bar(page).boundingBox();
    const barBottom = (top?.y ?? 0) + (top?.height ?? 0);
    expect(link?.y ?? 0).toBeGreaterThanOrEqual(barBottom);

    // Back up with Shift+Tab to the first card's "Chơi": scrolled to below the bar, not under it.
    const firstPlay = page.getByRole("link", { name: "Chơi", exact: true }).first();
    for (let presses = 0; presses < 80; presses += 1) {
      await page.keyboard.press("Shift+Tab");
      if (await firstPlay.evaluate((element) => element === document.activeElement)) break;
    }
    await expect(firstPlay).toBeFocused();
    expect((await firstPlay.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(barBottom);
  });
});

test.describe("on a laptop of 1280 × 800", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "a laptop's layout");
  });

  test("Màn hình chơi vẫn không cần cuộn: Cờ cá ngựa for four, the bar too", async ({ page }) => {
    await page.goto(PAGE_WITHOUT_STORAGE);
    await writeSaved(page, "ludo:local", savedLudoGame(4, LUDO_FOUR_CHOICES));
    await page.goto("/play/ludo/local");
    await expect(horseChoices(page)).toHaveCount(4);

    for (const part of [
      bar(page),
      page.locator("[data-ply]"),
      status(page),
      page.getByRole("list", { name: "Người chơi" }),
      rollButton(page),
      page.getByRole("button", { name: "Ván mới" }),
    ]) {
      await expect(part).toBeInViewport({ ratio: 1 });
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
      ),
    ).toBe(false);
  });
});

test.describe("the toolbox's pages", () => {
  test.use({ viewport: { width: 390, height: 560 } });

  test("Trang con của Hộp công cụ: each has the way back to the one above it", async ({ page }) => {
    const back = (name: string) => bar(page).getByRole("link", { name });
    const settled = async () => {
      await expect(themeButton(page)).toBeInViewport({ ratio: 1 });
      await expect(languageButton(page)).toBeInViewport({ ratio: 1 });
    };

    await page.goto("/tools");
    await expect(back("Về menu")).toHaveAttribute("href", "/");
    await settled();

    await page.goto("/tools/card-score");
    await expect(back("Hộp công cụ")).toHaveAttribute("href", "/tools");
    await settled();

    await page.goto("/tools/card-score/new");
    await expect(back("Các nhóm")).toHaveAttribute("href", "/tools/card-score");
    await settled();
    await page.getByRole("textbox", { name: "Người chơi 1" }).fill("Lan");
    await page.getByRole("textbox", { name: "Người chơi 2" }).fill("Minh");
    await page.getByRole("button", { name: "Tạo nhóm" }).click();

    await expect(back("Các nhóm")).toHaveAttribute("href", "/tools/card-score");
    await settled();
    await scrollToEnd(page);
    await expect(bar(page)).toBeInViewport();
    await page.getByRole("link", { name: "Sửa nhóm" }).click();
    await expect(back("Bảng điểm")).toHaveAttribute("href", /\/tools\/card-score\/[^/]+$/);
    await settled();

    // A group not here: the state screen's way back goes up too.
    await page.goto("/tools/card-score/khong-co/edit");
    await expect(back("Các nhóm")).toHaveAttribute("href", "/tools/card-score");
  });
});

test.describe("Gom thạch's pages", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Màn chơi của trò giải đố: the level list goes back to the menu, a level to the list", async ({
    page,
  }) => {
    const back = (name: string) => bar(page).getByRole("link", { name });
    await page.goto("/puzzles/jelly-gather");
    await expect(back("Về menu")).toHaveAttribute("href", "/");
    await expect(themeButton(page)).toBeInViewport({ ratio: 1 });

    await page.goto("/puzzles/jelly-gather/1-2");
    await expect(back("Danh sách màn")).toHaveAttribute("href", "/puzzles/jelly-gather");
    await expect(themeButton(page)).toBeInViewport({ ratio: 1 });
    await expect(languageButton(page)).toBeInViewport({ ratio: 1 });

    // No such level: the state screen's way back goes to the list too.
    await page.goto("/puzzles/jelly-gather/9-9");
    await expect(back("Danh sách màn")).toHaveAttribute("href", "/puzzles/jelly-gather");
  });
});

test("a dialog opens above the bar", async ({ page }) => {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "ludo:local", savedLudoGame(2, []));
  await page.goto("/play/ludo/local");
  await page.getByRole("button", { name: "Luật chơi" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Whatever is at the bar's place now belongs to the dialog (or its backdrop), not to the bar.
  const above = await page.evaluate(
    () => document.elementFromPoint(20, 20)?.closest("dialog") != null,
  );
  expect(above).toBe(true);
});
