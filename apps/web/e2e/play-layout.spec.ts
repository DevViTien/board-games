import { expect, type Page, test } from "@playwright/test";

import {
  board,
  choose,
  die,
  horseChoices,
  LUDO_FOUR_CHOICES,
  ludoRecord,
  openFakeRoom,
  PAGE_WITHOUT_STORAGE,
  pressStart,
  rollButton,
  savedLudoGame,
  startLocalGame,
  status,
  writeSaved,
} from "./helpers";

// Bố cục màn hình chơi (spec local-play): on a laptop of 1280 × 800 the board, the turn line and
// every button are on screen without scrolling; at 360 px wide, nothing scrolls sideways.

const button = (page: Page, name: string) => page.getByRole("button", { name });
const playersPanel = (page: Page) => page.getByRole("list", { name: "Người chơi" });

/** Whether `locator`'s whole box is inside the viewport, the page not scrolled. */
async function expectFullyOnScreen(...locators: ReturnType<Page["locator"]>[]): Promise<void> {
  for (const locator of locators) await expect(locator).toBeInViewport({ ratio: 1 });
}

function scrolls(page: Page): Promise<{ down: boolean; sideways: boolean }> {
  return page.evaluate(() => ({
    down: document.documentElement.scrollHeight > document.documentElement.clientHeight,
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
}

/** The board on the left and the turn line in the column beside it, not stacked. */
async function expectSideBySide(page: Page): Promise<void> {
  const boardBox = await page.locator("[data-ply]").or(board(page)).first().boundingBox();
  const turn = await status(page).boundingBox();
  expect((boardBox?.x ?? Infinity) + (boardBox?.width ?? 0)).toBeLessThanOrEqual(turn?.x ?? 0);
}

// The "desktop" project of playwright.config.ts is this laptop.
test.describe("on a laptop of 1280 × 800", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "a laptop's layout");
  });

  test("Cờ caro 19×19 trên máy tính: board, turn and buttons without scrolling", async ({
    page,
  }) => {
    await page.goto("/play/caro");
    await choose(page, "Chế độ", "Cùng máy");
    await choose(page, "Bàn cờ", "19×19");
    await pressStart(page);
    await expect(board(page)).toBeVisible();

    await expectFullyOnScreen(
      board(page),
      status(page),
      button(page, "Hoàn tác"),
      button(page, "Làm lại"),
      button(page, "Ván mới"),
    );
    expect(await scrolls(page)).toEqual({ down: false, sideways: false });
    await expectSideBySide(page);
  });

  test("Cờ cá ngựa trên máy tính: board, die and both choices after a 6 without scrolling", async ({
    page,
  }) => {
    // Four players; Red has a horse on the track and one on its start square, and has rolled a 6.
    await page.goto(PAGE_WITHOUT_STORAGE);
    await writeSaved(
      page,
      "ludo:local",
      savedLudoGame(4, [
        { roll: 6 },
        { horse: 0 },
        { roll: 6 },
        { horse: 0 },
        { roll: 3 },
        { horse: 0 },
        { roll: 2 },
        { roll: 2 },
        { roll: 2 },
        { roll: 6 },
        { horse: 1 },
        { roll: 6 },
      ]),
    );
    await page.goto("/play/ludo/local");
    await expect(horseChoices(page)).toHaveCount(2);

    await expectFullyOnScreen(
      page.locator("[data-ply]"),
      status(page),
      die(page),
      rollButton(page),
      horseChoices(page).first(),
      horseChoices(page).last(),
      button(page, "Hoàn tác"),
      button(page, "Làm lại"),
      button(page, "Ván mới"),
    );
    expect(await scrolls(page)).toEqual({ down: false, sideways: false });
    await expectSideBySide(page);
  });
});

test.describe("Cờ cá ngựa for four on a laptop of 1280 × 800, four horses to choose from", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "a laptop's layout");
  });

  test("Cờ cá ngựa 4 người vừa màn hình máy tính", async ({ page }) => {
    await page.goto(PAGE_WITHOUT_STORAGE);
    await writeSaved(page, "ludo:local", savedLudoGame(4, LUDO_FOUR_CHOICES));
    await page.goto("/play/ludo/local");
    await expect(horseChoices(page)).toHaveCount(4);
    await expect(playersPanel(page).getByRole("listitem")).toHaveCount(4);

    await expectFullyOnScreen(
      page.locator("[data-ply]"),
      status(page),
      playersPanel(page),
      die(page),
      rollButton(page),
      ...[0, 1, 2, 3].map((index) => horseChoices(page).nth(index)),
      button(page, "Hoàn tác"),
      button(page, "Làm lại"),
      button(page, "Ván mới"),
    );
    expect(await scrolls(page)).toEqual({ down: false, sideways: false });
    await expectSideBySide(page);
  });

  test("Cờ cá ngựa online vừa màn hình máy tính", async ({ page }) => {
    const room = await openFakeRoom(page, {
      gameId: "ludo",
      seats: [
        { kind: "human", name: "Lan" },
        { kind: "human", name: "Minh" },
        { kind: "ai" },
        { kind: "ai" },
      ],
      record: ludoRecord(4, LUDO_FOUR_CHOICES),
    });
    await expect(horseChoices(page)).toHaveCount(4);
    await expect(playersPanel(page).getByRole("listitem")).toHaveCount(4);
    await expect(playersPanel(page).getByRole("listitem").first()).toContainText("Đã kết nối");

    await expectFullyOnScreen(
      page.locator("[data-ply]"),
      status(page),
      playersPanel(page),
      die(page),
      rollButton(page),
      ...[0, 1, 2, 3].map((index) => horseChoices(page).nth(index)),
    );
    expect(await scrolls(page)).toEqual({ down: false, sideways: false });
    await expectSideBySide(page);

    // The connection line has its room kept: once it speaks, nothing is pushed off the screen.
    await room.loseConnection();
    await expect(page.getByText("Đang kết nối lại…")).toBeVisible();
    await expect(playersPanel(page).getByRole("listitem").first()).toContainText("Mất kết nối");
    await expectFullyOnScreen(
      page.getByText("Đang kết nối lại…"),
      status(page),
      playersPanel(page),
      die(page),
      rollButton(page),
    );
    expect(await scrolls(page)).toEqual({ down: false, sideways: false });
  });
});

test.describe("on a phone 360 px wide", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("Điện thoại hẹp: Tic-tac-toe in one column, nothing scrolling sideways", async ({
    page,
  }) => {
    await startLocalGame(page);

    expect((await scrolls(page)).sideways).toBe(false);
    // One column: the turn above the board, the buttons below it.
    const turn = await status(page).boundingBox();
    const cells = await board(page).boundingBox();
    const undo = await button(page, "Hoàn tác").boundingBox();
    expect((turn?.y ?? 0) + (turn?.height ?? 0)).toBeLessThanOrEqual(cells?.y ?? 0);
    expect((cells?.y ?? 0) + (cells?.height ?? 0)).toBeLessThanOrEqual(undo?.y ?? 0);
    for (const box of [turn, cells, undo]) {
      expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 0) <= 360).toBe(true);
    }
  });

  test("keeps the header of Cờ caro on screen, its rules under its name", async ({ page }) => {
    await page.goto("/play/caro");
    await choose(page, "Chế độ", "Cùng máy");
    await pressStart(page);
    await expect(board(page)).toBeVisible();

    expect((await scrolls(page)).sideways).toBe(false);
    await expectFullyOnScreen(
      page.getByRole("link", { name: "Về menu" }),
      page.getByRole("heading", { level: 1, name: "Cờ caro" }),
      page.getByRole("main").getByText("15×15 · Chặn hai đầu", { exact: true }),
    );
  });
});
