import { type Browser, expect, type Page, test } from "@playwright/test";

import {
  board,
  cell,
  choose,
  continueSection,
  countMarks,
  PAGE_WITHOUT_STORAGE,
  play,
  pressStart,
  savedMoveCount,
  status,
  writeSaved,
} from "./helpers";

// Cờ caro with the default options: a 15×15 board and the blocked-ends rule. The browser language
// is pinned to Vietnamese in playwright.config.ts.

/** From the menu's Cờ caro card, through the setup screen in `mode`, to the new game's board. */
async function startCaro(page: Page, mode: "Cùng máy" | "Đấu với máy"): Promise<void> {
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Cờ caro" }) })
    .getByRole("link", { name: "Chơi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/play\/caro$/);
  await choose(page, "Chế độ", mode);
  await pressStart(page);
  await expect(page).toHaveURL(mode === "Cùng máy" ? /\/play\/caro\/local$/ : /\/play\/caro\/ai$/);
  await expect(board(page)).toBeVisible();
}

/** Whether the page scrolls sideways. */
function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

test("plays a game on one device until X makes five in a row", async ({ page }) => {
  await startCaro(page, "Cùng máy");
  await expect(page).toHaveTitle("Cờ caro · Board Games Hub");
  await expect(status(page)).toHaveText("Đến lượt X");
  await expect(board(page).getByRole("button")).toHaveCount(225);

  await play(page, [8, 4], [10, 4], [8, 5], [10, 5], [8, 6], [10, 6], [8, 7], [10, 7], [8, 8]);

  await expect(status(page)).toHaveText("X thắng!");
  for (const col of [4, 5, 6, 7]) {
    await expect(cell(page, 8, col)).toHaveAccessibleDescription("Thuộc hàng thắng");
  }
  await expect(cell(page, 8, 8)).toHaveAccessibleDescription("Nước vừa đi Thuộc hàng thắng");
  await expect(cell(page, 10, 8)).toHaveAttribute("aria-disabled", "true");
});

test("plays a move with the arrow keys and Enter", async ({ page }) => {
  await startCaro(page, "Cùng máy");

  await cell(page, 8, 8).click();
  await expect(cell(page, 8, 8)).toHaveAccessibleName("Hàng 8, cột 8, X");
  await page.keyboard.press("ArrowRight");
  await expect(cell(page, 8, 9)).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(cell(page, 8, 9)).toHaveAccessibleName("Hàng 8, cột 9, O");
  await expect(cell(page, 8, 9)).toBeFocused();
  await expect(status(page)).toHaveText("Đến lượt X");
});

test.describe("on a phone 360 px wide", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("shows all 15 columns without scrolling sideways", async ({ page }) => {
    await startCaro(page, "Cùng máy");

    for (const row of [1, 8, 15]) {
      await expect(cell(page, row, 1)).toBeInViewport();
      const box = await cell(page, row, 15).boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? Infinity) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    }
    expect(await scrollsSideways(page)).toBe(false);
  });

  test("places a stone with a second tap on cells this small", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "Taps need a touch screen");
    await startCaro(page, "Cùng máy");

    await cell(page, 10, 10).tap();
    await expect(page.getByText("Chạm lần nữa để đặt quân")).toBeVisible();
    await expect(cell(page, 10, 10)).toHaveAccessibleName("Hàng 10, cột 10, trống");

    await cell(page, 10, 10).tap();
    await expect(cell(page, 10, 10)).toHaveAccessibleName("Hàng 10, cột 10, X");
    await expect(page.getByText("Chạm lần nữa để đặt quân")).toHaveCount(0);
  });
});

/**
 * A Cờ caro game against Medium where the player holds X and is to move: X has three in a row on
 * row 8, columns 11–13, blocked by O on column 10. Once X adds the fourth stone on column 14, the
 * AI's only move that does not lose is column 15: the line reaches the edge of the board, which
 * does not block, so there is no cell beyond it where O could kill the five.
 */
const MEDIUM_MUST_BLOCK = {
  version: 2,
  savedAt: "2026-11-03T08:00:00.000Z",
  inProgress: true,
  mode: { kind: "ai", first: "human", seats: [{ kind: "human" }, { kind: "ai", level: "medium" }] },
  record: {
    version: 1,
    gameId: "caro",
    playerCount: 2,
    options: { size: 15, rule: "blocked-ends" },
    // Row 8 column 11 is cell 115, and so on; O plays (8, 10), (3, 3) and (13, 5).
    entries: [115, 114, 116, 32, 117, 184].map((cell) => ({ move: { cell } })),
  },
};

test("blocks a four against the edge at Medium", async ({ page }) => {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "caro:ai", MEDIUM_MUST_BLOCK);
  await page.goto("/play/caro/ai");
  await expect(cell(page, 8, 13)).toHaveAccessibleName("Hàng 8, cột 13, X");
  // The saved game's last move was the AI's.
  await expect(status(page)).toHaveText("Máy đánh hàng 13, cột 5. Đến lượt bạn (X)");
  // When the AI's stone shows, measured in the page from the press that played the fourth X.
  await page.evaluate(() => {
    const timing = { pressedAt: 0, answeredAt: 0 };
    (window as unknown as { timing: typeof timing }).timing = timing;
    document.addEventListener("pointerdown", () => (timing.pressedAt = performance.now()), {
      capture: true,
    });
    const target = document.querySelector('[data-cell="119"]');
    if (target === null) throw new Error("no cell 119");
    new MutationObserver(() => {
      if (target.getAttribute("aria-label")?.endsWith(", O") === true && timing.answeredAt === 0) {
        timing.answeredAt = performance.now();
      }
    }).observe(target, { attributes: true });
  });

  await cell(page, 8, 14).click();

  await expect(cell(page, 8, 15)).toHaveAccessibleName("Hàng 8, cột 15, O");
  await expect(status(page)).toHaveText("Máy đánh hàng 8, cột 15. Đến lượt bạn (X)");
  expect(await countMarks(page, "O")).toBe(4);
  const { pressedAt, answeredAt } = await page.evaluate(
    () => (window as unknown as { timing: { pressedAt: number; answeredAt: number } }).timing,
  );
  expect(pressedAt).toBeGreaterThan(0);
  expect(answeredAt).toBeGreaterThan(pressedAt);
  const answeredInMs = Math.round(answeredAt - pressedAt);
  test.info().annotations.push({ type: "ai-answer-ms", description: String(answeredInMs) });
  expect(answeredInMs).toBeLessThan(2000);
});

// Online: two browsers, as in online.spec.ts.

const ROOM_URL = /\/room\/[2-9A-HJKMNP-Z]{6}$/;
const nameField = (page: Page) => page.getByRole("textbox", { name: "Tên của bạn" });
const button = (page: Page, name: string) => page.getByRole("button", { name });

async function createCaroRoom(page: Page, name: string): Promise<string> {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Online");
  await nameField(page).fill(name);
  await button(page, "Tạo phòng").click();
  await expect(page).toHaveURL(ROOM_URL);
  return page.url();
}

async function joinAs(browser: Browser, url: string, name: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await nameField(page).fill(name);
  await button(page, "Vào chơi").click();
  return { context, page };
}

test("plays a game of Cờ caro online through the invite link, then plays again", async ({
  page,
  browser,
}) => {
  const url = await createCaroRoom(page, "Minh");
  const lan = await joinAs(browser, url, "Lan");
  await expect(board(page)).toBeVisible();
  await expect(board(lan.page)).toBeVisible();
  await expect(status(page)).toHaveText("Ván mới: bạn cầm X và đi trước");
  await expect(status(lan.page)).toHaveText("Ván mới: bạn cầm O, Minh đi trước");

  await play(page, [8, 8]);
  await expect(cell(lan.page, 8, 8)).toHaveAccessibleName("Hàng 8, cột 8, X");
  await expect(status(lan.page)).toHaveText("Minh vừa đánh hàng 8, cột 8. Đến lượt bạn (O)");
  // Minh fills row 8 from column 8, Lan answers on row 10; Minh's fifth stone wins.
  for (const col of [9, 10, 11, 12]) {
    await play(lan.page, [10, col - 1]);
    await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/);
    await play(page, [8, col]);
    if (col < 12) await expect(status(lan.page)).toHaveText(/Đến lượt bạn \(O\)$/);
  }

  await expect(status(page)).toHaveText("Bạn thắng!");
  await expect(status(lan.page)).toHaveText("Minh thắng!");
  await expect(cell(lan.page, 8, 12)).toHaveAccessibleDescription("Nước vừa đi Thuộc hàng thắng");

  await button(lan.page, "Chơi lại").click();
  await expect(cell(page, 8, 8)).toHaveAccessibleName("Hàng 8, cột 8, trống");
  await expect(status(lan.page)).toHaveText("Ván mới: bạn cầm X và đi trước");
  await expect(status(page)).toHaveText("Ván mới: bạn cầm O, Lan đi trước");

  await lan.context.close();
});

// Rule options: a 19×19 board and the free rule, chosen on the setup screen.

/** From the menu's Cờ caro card to its setup screen. */
async function openCaroSetup(page: Page): Promise<void> {
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Cờ caro" }) })
    .getByRole("link", { name: "Chơi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/play\/caro$/);
}

/** Starts a same-device game on a 19×19 board with the free rule from the setup screen. */
async function startBigFreeGame(page: Page): Promise<void> {
  await openCaroSetup(page);
  await choose(page, "Chế độ", "Cùng máy");
  await choose(page, "Bàn cờ", "19×19");
  await choose(page, "Luật thắng", "Tự do");
  await pressStart(page);
  await expect(page).toHaveURL(/\/play\/caro\/local$/);
  await expect(board(page)).toBeVisible();
}

/** The rules shown next to the game's name on the play screen. */
const rulesLabel = (page: Page, label: string) =>
  page.getByRole("main").getByText(label, { exact: true });

const radio = (page: Page, group: string, option: string) =>
  page.getByRole("group", { name: group }).getByRole("radio", { name: option });

test("plays on a 19×19 board with the free rule, kept across a reload and a new game", async ({
  page,
}) => {
  await startBigFreeGame(page);
  await expect(board(page).getByRole("button")).toHaveCount(361);
  await expect(rulesLabel(page, "19×19 · Tự do")).toBeVisible();

  await play(page, [1, 1], [2, 2], [19, 19], [3, 3], [18, 18]);
  // The game is saved after each move: reload only once the last one is in.
  await expect.poll(() => savedMoveCount(page, "caro:local")).toBe(5);
  await page.reload();
  await expect(board(page).getByRole("button")).toHaveCount(361);
  await expect(cell(page, 19, 19)).toHaveAccessibleName("Hàng 19, cột 19, X");
  expect((await countMarks(page, "X")) + (await countMarks(page, "O"))).toBe(5);
  await expect(rulesLabel(page, "19×19 · Tự do")).toBeVisible();

  // The menu names the rules of the game in progress, and continues it.
  await page.goto("/");
  await continueSection(page)
    .getByRole("link", { name: "Cờ caro · Cùng máy · 19×19 · Tự do" })
    .click();
  await expect(page).toHaveURL(/\/play\/caro\/local$/);
  await expect(cell(page, 19, 19)).toHaveAccessibleName("Hàng 19, cột 19, X");

  // A new game keeps the board and the rule.
  await page.getByRole("button", { name: "Ván mới" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ván mới" }).click();
  await expect(cell(page, 19, 19)).toHaveAccessibleName("Hàng 19, cột 19, trống");
  await expect(board(page).getByRole("button")).toHaveCount(361);
  await expect(rulesLabel(page, "19×19 · Tự do")).toBeVisible();
  // The empty board keeps its rules across a reload, and is not listed as in progress.
  await expect.poll(() => savedMoveCount(page, "caro:local")).toBe(0);
  await page.reload();
  await expect(board(page).getByRole("button")).toHaveCount(361);
  await expect(rulesLabel(page, "19×19 · Tự do")).toBeVisible();
  // Five in a row between two O stones wins under the free rule.
  await play(page, [5, 2], [5, 1], [5, 3], [5, 7], [5, 4], [10, 10], [5, 5], [10, 11], [5, 6]);
  await expect(status(page)).toHaveText("X thắng!");

  // The setup screen remembers the rule options.
  await openCaroSetup(page);
  await expect(radio(page, "Bàn cờ", "19×19")).toBeChecked();
  await expect(radio(page, "Luật thắng", "Tự do")).toBeChecked();
});

test.describe("on a phone 360 px wide, on a 19×19 board", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("shows all 19 columns without scrolling sideways, and places a stone with two taps", async ({
    page,
    hasTouch,
  }) => {
    await startBigFreeGame(page);

    for (const row of [1, 10, 19]) {
      await expect(cell(page, row, 1)).toBeInViewport();
      const box = await cell(page, row, 19).boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? Infinity) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    }
    expect(await scrollsSideways(page)).toBe(false);

    test.skip(!hasTouch, "Taps need a touch screen");
    await cell(page, 19, 19).tap();
    await expect(page.getByText("Chạm lần nữa để đặt quân")).toBeVisible();
    await expect(cell(page, 19, 19)).toHaveAccessibleName("Hàng 19, cột 19, trống");
    await cell(page, 19, 19).tap();
    await expect(cell(page, 19, 19)).toHaveAccessibleName("Hàng 19, cột 19, X");
  });
});

/**
 * A 19×19 game against Hard after 30 moves, X (the player) to move. No five cells in a line hold
 * more than two stones of one side, so the AI cannot win within the two moves measured, and each
 * of its moves is a real search, not a forced reply.
 */
const HARD_BIG_BOARD = {
  version: 2,
  savedAt: "2026-11-03T08:00:00.000Z",
  inProgress: true,
  mode: { kind: "ai", first: "human", seats: [{ kind: "human" }, { kind: "ai", level: "hard" }] },
  record: {
    version: 1,
    gameId: "caro",
    playerCount: 2,
    options: { size: 19, rule: "blocked-ends" },
    entries: [
      127, 103, 106, 220, 276, 138, 213, 200, 251, 217, 146, 104, 80, 90, 204, 143, 88, 144, 221,
      156, 202, 271, 128, 157, 273, 258, 238, 272, 101, 87,
    ].map((cell) => ({ move: { cell } })),
  },
};

/**
 * Starts timing in the page: from the next press on the board to the moment one more O stone
 * shows. Read the result with `readAnswerTime`.
 */
async function timeNextAnswer(page: Page): Promise<void> {
  await page.evaluate(() => {
    const countO = () =>
      [...document.querySelectorAll("[data-cell]")].filter((element) =>
        element.getAttribute("aria-label")?.endsWith(", O"),
      ).length;
    const timing = { pressedAt: 0, answeredAt: 0, before: countO() };
    (window as unknown as { timing: typeof timing }).timing = timing;
    document.addEventListener(
      "pointerdown",
      () => {
        if (timing.pressedAt === 0) timing.pressedAt = performance.now();
      },
      { capture: true },
    );
    const grid = document.querySelector('[role="grid"]');
    if (grid === null) throw new Error("no board");
    new MutationObserver(() => {
      if (timing.answeredAt === 0 && countO() > timing.before) {
        timing.answeredAt = performance.now();
      }
    }).observe(grid, { attributes: true, subtree: true });
  });
}

async function readAnswerTime(page: Page): Promise<number> {
  const { pressedAt, answeredAt } = await page.evaluate(
    () => (window as unknown as { timing: { pressedAt: number; answeredAt: number } }).timing,
  );
  expect(pressedAt).toBeGreaterThan(0);
  expect(answeredAt).toBeGreaterThan(pressedAt);
  return Math.round(answeredAt - pressedAt);
}

test.describe("Hard on a 19×19 board", () => {
  // Serial only within this group: with `fullyParallel`, other files still run in other workers,
  // so the numbers include a busy machine (design §8 records them alone and with the whole suite).
  test.describe.configure({ mode: "serial" });

  test("answers within 2 seconds once it has played a move since the page opened", async ({
    page,
  }, testInfo) => {
    await page.goto(PAGE_WITHOUT_STORAGE);
    await writeSaved(page, "caro:ai", HARD_BIG_BOARD);
    await page.goto("/play/caro/ai");
    await expect(rulesLabel(page, "19×19 · Chặn hai đầu")).toBeVisible();
    await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/);

    // The first answer also starts the AI's Worker: measured, only bounded loosely.
    await timeNextAnswer(page);
    await cell(page, 1, 1).click();
    await expect.poll(() => countMarks(page, "O"), { timeout: 5000 }).toBe(16);
    await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/);
    const firstMs = await readAnswerTime(page);
    expect(firstMs).toBeLessThan(5000);

    await timeNextAnswer(page);
    await cell(page, 19, 19).click();
    await expect.poll(() => countMarks(page, "O"), { timeout: 5000 }).toBe(17);
    await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/);
    const secondMs = await readAnswerTime(page);

    const project = testInfo.project.name;
    testInfo.annotations.push(
      { type: "ai-hard-19-first-ms", description: `${project}: ${firstMs}` },
      { type: "ai-hard-19-next-ms", description: `${project}: ${secondMs}` },
    );
    console.log(`[${project}] Hard on 19×19: first answer ${firstMs} ms, next ${secondMs} ms`);
    expect(secondMs).toBeLessThanOrEqual(2000);
  });
});

// --- The board that grows (change `add-caro-infinite-board`) ---------------------------------------

/** Starts a game on the board that grows from the setup screen, in `mode`. */
async function startInfinite(page: Page, mode: "Cùng máy" | "Đấu với máy"): Promise<void> {
  await openCaroSetup(page);
  await choose(page, "Chế độ", mode);
  await choose(page, "Bàn cờ", "Vô hạn");
  await pressStart(page);
  await expect(page).toHaveURL(mode === "Cùng máy" ? /\/play\/caro\/local$/ : /\/play\/caro\/ai$/);
  await expect(board(page)).toBeVisible();
}

/** The scrolling frame of the board that grows. */
const frame = (page: Page) => page.locator("[data-caro-frame]");

/** How far the frame scrolls, and how far it could. */
function frameScroll(page: Page) {
  return frame(page).evaluate((element) => ({
    left: element.scrollLeft,
    top: element.scrollTop,
    wide: element.scrollWidth > element.clientWidth + 1,
    tall: element.scrollHeight > element.clientHeight + 1,
  }));
}

test.describe("on the board that grows", () => {
  test("starts like a 15×15 board, grows near its edge without the board jumping, and goes back to the last move", async ({
    page,
  }) => {
    await startInfinite(page, "Cùng máy");
    await expect(rulesLabel(page, "Vô hạn · Chặn hai đầu")).toBeVisible();
    await expect(board(page).getByRole("button")).toHaveCount(225);
    expect(await frameScroll(page)).toMatchObject({ wide: false, tall: false });

    // A stone on the top row of the area: five more rows above it.
    const before = await cell(page, 24, 31).boundingBox();
    await cell(page, 24, 31).click();
    await expect(board(page).getByRole("button")).toHaveCount(20 * 15);
    const after = await cell(page, 24, 31).boundingBox();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
    expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(2);
    expect((await frameScroll(page)).tall).toBe(true);
    await expect(cell(page, 19, 31)).not.toBeInViewport();

    // O far below, then X further up: the last move is then off the view once scrolled down.
    await cell(page, 38, 38).click();
    await cell(page, 19, 31).click();
    await expect(cell(page, 19, 31)).toHaveAccessibleName("Hàng 19, cột 31, X");
    await frame(page).evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(cell(page, 19, 31)).not.toBeInViewport();
    await page.getByRole("button", { name: "Về nước vừa đi" }).click();
    await expect(cell(page, 19, 31)).toBeInViewport();
  });

  test("zooms out and in, and drags with the mouse without placing a stone", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "A mouse");
    await startInfinite(page, "Cùng máy");
    const width = async () => (await cell(page, 31, 31).boundingBox())?.width ?? 0;
    const start = await width();

    await page.getByRole("button", { name: "Thu nhỏ bàn" }).click();
    expect((await width()) / start).toBeCloseTo(15 / 19, 1);
    await page.getByRole("button", { name: "Phóng to bàn" }).click();
    await page.getByRole("button", { name: "Phóng to bàn" }).click();
    expect((await width()) / start).toBeCloseTo(15 / 11, 1);
    const scrolled = await frameScroll(page);
    expect(scrolled.wide).toBe(true);

    const box = await cell(page, 31, 31).boundingBox();
    if (box === null) throw new Error("No cell");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 6 });
    await page.mouse.up();
    const dragged = await frameScroll(page);
    expect(dragged.left).toBeLessThan(scrolled.left);
    expect(dragged.top).toBeLessThan(scrolled.top);
    expect((await countMarks(page, "X")) + (await countMarks(page, "O"))).toBe(0);

    await cell(page, 31, 31).click();
    await expect(cell(page, 31, 31)).toHaveAccessibleName("Hàng 31, cột 31, X");
  });

  test("scrolls to the AI's move when it is out of view", async ({ page }) => {
    await startInfinite(page, "Đấu với máy");
    // Zoomed in, the frame shows part of the area; the player plays its top left corner.
    await page.getByRole("button", { name: "Phóng to bàn" }).click();
    await frame(page).evaluate((element) => {
      element.scrollLeft = 0;
      element.scrollTop = 0;
    });
    await cell(page, 24, 24).click();
    await expect(status(page)).toHaveText(/^Máy đánh hàng \d+, cột \d+\. Đến lượt bạn \(X\)$/u, {
      timeout: 10_000,
    });
    const last = board(page).getByRole("button", { description: "Nước vừa đi" });
    await expect(last).toHaveCount(1);
    await expect(last).toBeInViewport();
  });

  test.describe("on a phone 360 px wide", () => {
    test.use({ viewport: { width: 360, height: 740 } });

    test("fits the screen, scrolls inside the board once it has grown, and places with two taps", async ({
      page,
      hasTouch,
    }) => {
      await startInfinite(page, "Cùng máy");
      expect(await scrollsSideways(page)).toBe(false);
      const box = await frame(page).boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? Infinity)).toBeLessThanOrEqual(360);
      for (const name of ["Thu nhỏ bàn", "Phóng to bàn", "Về nước vừa đi"]) {
        const control = await page.getByRole("button", { name }).boundingBox();
        expect(control?.height ?? 0).toBeGreaterThanOrEqual(44);
      }

      // Grown sideways: the board scrolls, the page still does not, and dragging sideways at the
      // end of the board never reaches the page.
      await cell(page, 31, 38).click();
      await expect(board(page).getByRole("button")).toHaveCount(15 * 20);
      expect((await frameScroll(page)).wide).toBe(true);
      expect(await scrollsSideways(page)).toBe(false);
      expect(
        await frame(page).evaluate((element) => getComputedStyle(element).overscrollBehaviorX),
      ).toBe("contain");

      test.skip(!hasTouch, "Taps need a touch screen");
      await cell(page, 30, 31).tap();
      await expect(page.getByText("Chạm lần nữa để đặt quân")).toBeVisible();
      await cell(page, 30, 31).tap();
      await expect(cell(page, 30, 31)).toHaveAccessibleName("Hàng 30, cột 31, O");
    });
  });
});

// Changing the rules from the result card (change `add-new-game-options`).

test("changes the board for the next game from the result card, kept across a reload", async ({
  page,
}) => {
  await startCaro(page, "Cùng máy");
  await play(page, [8, 4], [10, 4], [8, 5], [10, 5], [8, 6], [10, 6], [8, 7], [10, 7], [8, 8]);
  await expect(status(page)).toHaveText("X thắng!");

  await page.getByRole("button", { name: "Đổi bàn, luật" }).click();
  const dialog = page.getByRole("dialog", { name: "Đổi bàn, luật" });
  await expect(dialog.getByRole("radio", { name: "15×15" })).toBeChecked();
  await dialog.getByText("19×19", { exact: true }).click();
  await dialog.getByRole("button", { name: "Bắt đầu ván mới" }).click();

  await expect(dialog).toBeHidden();
  await expect(board(page).getByRole("button")).toHaveCount(361);
  await expect(rulesLabel(page, "19×19 · Chặn hai đầu")).toBeVisible();
  await expect.poll(() => savedMoveCount(page, "caro:local")).toBe(0);
  await page.reload();
  await expect(board(page).getByRole("button")).toHaveCount(361);
  await expect(rulesLabel(page, "19×19 · Chặn hai đầu")).toBeVisible();

  // The setup screen remembers the board chosen on the result card.
  await openCaroSetup(page);
  await expect(radio(page, "Bàn cờ", "19×19")).toBeChecked();
});

test("changes the board of an online room for everyone from the result card", async ({
  page,
  browser,
}) => {
  const url = await createCaroRoom(page, "Minh");
  const lan = await joinAs(browser, url, "Lan");
  await expect(status(page)).toHaveText("Ván mới: bạn cầm X và đi trước");
  await play(page, [8, 8]);
  for (const col of [9, 10, 11, 12]) {
    await play(lan.page, [10, col - 1]);
    await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/);
    await play(page, [8, col]);
  }
  await expect(status(lan.page)).toHaveText("Minh thắng!");

  await button(lan.page, "Đổi bàn, luật").click();
  const dialog = lan.page.getByRole("dialog", { name: "Đổi bàn, luật" });
  await dialog.getByText("19×19", { exact: true }).click();
  await dialog.getByRole("button", { name: "Bắt đầu ván mới" }).click();

  await expect(board(page).getByRole("button")).toHaveCount(361);
  await expect(board(lan.page).getByRole("button")).toHaveCount(361);
  await expect(status(page)).toHaveText("Ván mới: bạn cầm O, Lan đi trước · 19×19 · Chặn hai đầu");
  await expect(rulesLabel(page, "19×19 · Chặn hai đầu")).toBeVisible();

  await lan.context.close();
});
