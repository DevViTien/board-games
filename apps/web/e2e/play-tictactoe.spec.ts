import { expect, type Page, test } from "@playwright/test";

import {
  board,
  cell,
  choose,
  continueSection,
  openSetupFromMenu,
  PAGE_WITHOUT_STORAGE,
  play,
  pressStart,
  readSaved,
  savedMoveCount,
  SLOT,
  startLocalGame,
  status,
  writeSaved,
} from "./helpers";

// The browser language is pinned to Vietnamese in playwright.config.ts.

const X_WINS_TOP_ROW = [
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
  [1, 3],
] as const;

/** Waits until the browser has rendered two frames, so focus fix-ups have run. */
function afterRendering(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
}

/** From the menu, through the setup screen ("Cùng máy"), to a new game on this device. */
const openFromMenu = startLocalGame;

test("plays from the menu to a win, then undoes the winning move", async ({ page }) => {
  await openFromMenu(page);
  await expect(page).toHaveTitle("Tic-tac-toe · Board Games Hub");
  await expect(status(page)).toHaveText("Đến lượt X");
  // Same device: no mode label next to the game's name.
  await expect(page.getByText("Với máy")).toHaveCount(0);
  await expect(cell(page, 3, 3)).toHaveCSS("border-top-style", "solid");

  await play(page, ...X_WINS_TOP_ROW);
  await expect(status(page)).toHaveText("X thắng!");
  await expect(cell(page, 3, 3)).toHaveAttribute("aria-disabled", "true");
  // Empty cells no longer look playable, without relying on hover (touch screens).
  await expect(cell(page, 3, 3)).toHaveCSS("border-top-style", "dashed");
  await expect(cell(page, 1, 1)).toHaveCSS("border-top-style", "solid");

  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(status(page)).toHaveText("Đến lượt X");
  await expect(cell(page, 1, 3)).toHaveAccessibleName("Hàng 1, cột 3, trống");
});

test("opens the same-device play screen straight from its address", async ({ page }) => {
  await page.goto("/play/tictactoe/local");

  await expect(board(page)).toBeVisible();
  await expect(status(page)).toHaveText("Đến lượt X");
});

test("keeps a game in progress across a reload and offers to continue it", async ({ page }) => {
  await openFromMenu(page);
  await play(page, [1, 1], [2, 2], [3, 3], [1, 3]);
  // Saving is asynchronous; reload only once the last move has reached IndexedDB.
  await expect.poll(() => savedMoveCount(page, SLOT.local)).toBe(4);

  await page.reload();
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O");
  await expect(cell(page, 1, 3)).toHaveAccessibleName("Hàng 1, cột 3, O");
  await expect(status(page)).toHaveText("Đến lượt X");
  await expect(page.getByRole("button", { name: "Hoàn tác" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );

  await page.getByRole("link", { name: "Về menu" }).click();
  const continueLink = continueSection(page).getByRole("link", { name: "Tic-tac-toe · Cùng máy" });
  await expect(continueLink).toBeVisible();
  await continueLink.click();
  await expect(page).toHaveURL(/\/play\/tictactoe\/local$/);
  await expect(cell(page, 3, 3)).toHaveAccessibleName("Hàng 3, cột 3, X");
});

test("does not keep a finished game", async ({ page }) => {
  await openFromMenu(page);
  await play(page, ...X_WINS_TOP_ROW);
  await expect(status(page)).toHaveText("X thắng!");
  await expect.poll(() => readSaved(page, SLOT.local)).toBeNull();

  await page.getByRole("link", { name: "Về menu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
  await page.goto("/play/tictactoe/local");
  await expect(status(page)).toHaveText("Đến lượt X");
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
});

test("asks before discarding a game in progress; Esc keeps the game", async ({ page }) => {
  await openFromMenu(page);
  await play(page, [1, 1], [2, 2], [3, 3]);

  await page.getByRole("button", { name: "Ván mới" }).click();
  const dialog = page.getByRole("dialog", { name: "Bắt đầu ván mới?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Chơi tiếp" })).toBeFocused();

  // showModal() makes the page behind the dialog inert. Chromium still lets Tab leave the dialog
  // for the browser's own UI (the page then reports focus on <body>) and come back, so "focus
  // stays in the dialog" means: Tab never reaches the page outside it and cycles through both
  // buttons.
  const reached = new Set<string>();
  for (let press = 0; press < 6; press += 1) {
    await page.keyboard.press("Tab");
    reached.add(
      await page.evaluate(() => {
        const focused = document.activeElement;
        if (focused === null || focused === document.body) return "browser";
        const where = focused.closest("dialog") === null ? "page" : "dialog";
        return `${where}: ${focused.textContent}`;
      }),
    );
  }
  expect([...reached].filter((where) => where.startsWith("page"))).toEqual([]);
  expect(reached).toContain("dialog: Chơi tiếp");
  expect(reached).toContain("dialog: Ván mới");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");

  await page.getByRole("button", { name: "Ván mới" }).click();
  await dialog.getByRole("button", { name: "Ván mới" }).click();
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
});

test("plays with the keyboard and keeps focus on the board", async ({ page }) => {
  await openFromMenu(page);

  await cell(page, 2, 1).focus();
  await page.keyboard.press("Tab");
  await expect(cell(page, 2, 2)).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, X");
  await expect(cell(page, 2, 2)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cell(page, 2, 3)).toBeFocused();
});

test("keeps every cell the same square size whatever marks are on the board", async ({ page }) => {
  await openFromMenu(page);

  // One mark in the middle row used to stretch that row and squeeze the others.
  await play(page, [2, 2], [1, 3]);

  const boxes = await board(page)
    .getByRole("button")
    .evaluateAll((cells) =>
      cells.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { width, height };
      }),
    );
  expect(boxes).toHaveLength(9);
  const [first] = boxes;
  for (const box of boxes) {
    expect(box.width).toBeCloseTo(first?.width ?? 0, 0);
    expect(box.height).toBeCloseTo(first?.width ?? 0, 0);
  }
});

test("keeps keyboard focus on undo and redo when nothing is left to undo or redo", async ({
  page,
}) => {
  await openFromMenu(page);
  await play(page, [1, 1], [2, 2]);
  const undo = page.getByRole("button", { name: "Hoàn tác" });
  const redo = page.getByRole("button", { name: "Làm lại" });

  await undo.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(undo).toBeDisabled();
  // Chromium moves focus off a button that became `disabled` at its next rendering update, so
  // checking right away would pass either way.
  await afterRendering(page);
  await expect(undo).toBeFocused();
  // Pressed again with nothing to undo: ignored.
  await page.keyboard.press("Enter");
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");

  await page.keyboard.press("Tab");
  await expect(redo).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(redo).toBeDisabled();
  await afterRendering(page);
  await expect(redo).toBeFocused();
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O");
});

test("reads the saved game without creating the database before the app does", async ({ page }) => {
  await page.goto(PAGE_WITHOUT_STORAGE);
  expect(await savedMoveCount(page, SLOT.local)).toBe(0);

  await page.goto("/play/tictactoe/local");
  await play(page, [2, 2]);
  await expect.poll(() => savedMoveCount(page, SLOT.local)).toBe(1);
});

test("drops unreadable saved data and starts a new game without an error", async ({ page }) => {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, SLOT.local, "garbage");

  await page.goto("/play/tictactoe/local");

  await expect(status(page)).toHaveText("Đến lượt X");
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
  // Next.js keeps an empty route announcer with role="alert"; no message may appear in any alert.
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
  await expect.poll(() => readSaved(page, SLOT.local)).toBeNull();
});

test("leaves a game saved by a newer version of the app alone", async ({ page }) => {
  const newer = { version: 3, savedAt: "2027-01-01T00:00:00.000Z", future: "format" };
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, SLOT.local, newer);

  await page.goto("/play/tictactoe/local");
  await expect(status(page)).toHaveText("Đến lượt X");
  await play(page, [2, 2]);
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, X");

  // A write for that move would already be queued on the same store, so this read comes after it.
  expect(await readSaved(page, SLOT.local)).toEqual(newer);
});

test("loads the game again from the error page when its code failed to load", async ({ page }) => {
  // Offline for the code of Tic-tac-toe's board, as in a tab left open across a deploy. Chunk
  // names are made up by the bundler, so the board's code is told by a class only its board uses.
  let offline = true;
  let failedLoads = 0;
  await page.route(/\/_next\/static\/chunks\/.+\.js$/, async (route) => {
    const response = await route.fetch();
    if (offline && (await response.text()).includes("size-3/5 text-accent")) {
      failedLoads += 1;
      await route.abort();
    } else {
      await route.fulfill({ response });
    }
  });
  await openSetupFromMenu(page);
  await choose(page, "Chế độ", "Cùng máy");
  await pressStart(page);
  await expect(page.getByRole("heading", { name: "Không tải được game" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Về menu" })).toBeVisible();
  expect(failedLoads).toBeGreaterThan(0);

  // Back online: retrying renders the route again in place, without reloading the page.
  offline = false;
  await page.evaluate(() => {
    (window as unknown as { notReloaded?: boolean }).notReloaded = true;
  });
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(board(page)).toBeVisible();
  await expect(status(page)).toHaveText("Đến lượt X");
  expect(
    await page.evaluate(() => (window as unknown as { notReloaded?: boolean }).notReloaded),
  ).toBe(true);
});

test("shows a not-found page with a way back for an unknown game", async ({ page }) => {
  const response = await page.goto("/play/khong-co-game-nay");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Không tìm thấy game" })).toBeVisible();
  await page.getByRole("link", { name: "Về menu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
});

for (const address of ["/play/khong-co-game-nay/local", "/play/tictactoe/khong-co-che-do-nay"]) {
  test(`shows a not-found page with a way back for ${address}`, async ({ page }) => {
    const response = await page.goto(address);

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Không tìm thấy trang chơi này" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Về menu" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
  });
}

test("shows a translated not-found page with a way back for any unknown URL", async ({ page }) => {
  const response = await page.goto("/play");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  await page.getByRole("link", { name: "Về menu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
});
