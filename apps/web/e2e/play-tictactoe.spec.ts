import { expect, type Page, test } from "@playwright/test";

// The browser language is pinned to Vietnamese in playwright.config.ts.

const cell = (page: Page, row: number, col: number) =>
  page.getByRole("button", { name: new RegExp(`^Hàng ${row}, cột ${col},`) });
const status = (page: Page) => page.getByRole("status");

async function play(page: Page, ...cells: readonly (readonly [number, number])[]) {
  for (const [row, col] of cells) await cell(page, row, col).click();
}

const X_WINS_TOP_ROW = [
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
  [1, 3],
] as const;

// Names from src/config/storage-keys.ts.
const SAVED_GAMES_DB = "board-games-saved-games";
const SAVED_GAMES_STORE = "saved-games";

/** A page of the app that does not touch IndexedDB, to prepare storage before the game opens. */
const PAGE_WITHOUT_STORAGE = "/play/khong-co-game-nay";

/**
 * The value saved for Tic-tac-toe in IndexedDB, or `null` when there is none. It never creates the
 * database: opening a missing one would create it empty, and idb-keyval only creates its store when
 * it creates the database, so the app could never save again. The upgrade is aborted instead.
 */
function readSaved(page: Page): Promise<unknown> {
  return page.evaluate(
    ([dbName, storeName]) =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onupgradeneeded = () => {
          request.transaction?.abort();
        };
        request.onerror = () => {
          if (request.error?.name === "AbortError") resolve(null);
          else reject(new Error(`cannot open ${dbName}: ${String(request.error)}`));
        };
        request.onsuccess = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(storeName)) {
            database.close();
            resolve(null);
            return;
          }
          const read = database
            .transaction(storeName, "readonly")
            .objectStore(storeName)
            .get("tictactoe");
          read.onsuccess = () => {
            database.close();
            resolve(read.result ?? null);
          };
          read.onerror = () => {
            database.close();
            reject(new Error("cannot read the saved game"));
          };
        };
      }),
    [SAVED_GAMES_DB, SAVED_GAMES_STORE] as const,
  );
}

/** Number of moves of the Tic-tac-toe game saved in IndexedDB (0 when none is saved). */
async function savedMoveCount(page: Page): Promise<number> {
  const saved = (await readSaved(page)) as { record?: { entries?: unknown[] } } | null;
  return saved?.record?.entries?.length ?? 0;
}

/** Stores `value` as the saved Tic-tac-toe game, creating the database the way idb-keyval does. */
function writeSaved(page: Page, value: unknown): Promise<void> {
  return page.evaluate(
    ([dbName, storeName, saved]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(storeName);
        };
        request.onerror = () => {
          reject(new Error(`cannot open ${dbName}`));
        };
        request.onsuccess = () => {
          const database = request.result;
          const write = database.transaction(storeName, "readwrite");
          write.objectStore(storeName).put(saved, "tictactoe");
          write.oncomplete = () => {
            database.close();
            resolve();
          };
          write.onerror = () => {
            database.close();
            reject(new Error("cannot write the saved game"));
          };
        };
      }),
    [SAVED_GAMES_DB, SAVED_GAMES_STORE, value] as const,
  );
}

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

async function openFromMenu(page: Page) {
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Tic-tac-toe" }) })
    .getByRole("link", { name: "Chơi" })
    .click();
  await expect(page).toHaveURL(/\/play\/tictactoe$/);
  await expect(page.getByRole("group", { name: "Bàn cờ" })).toBeVisible();
}

test("plays from the menu to a win, then undoes the winning move", async ({ page }) => {
  await openFromMenu(page);
  await expect(page).toHaveTitle("Tic-tac-toe · Board Games Hub");
  await expect(status(page)).toHaveText("Đến lượt X");
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

test("keeps a game in progress across a reload and offers to continue it", async ({ page }) => {
  await openFromMenu(page);
  await play(page, [1, 1], [2, 2], [3, 3], [1, 3]);
  // Saving is asynchronous; reload only once the last move has reached IndexedDB.
  await expect.poll(() => savedMoveCount(page)).toBe(4);

  await page.reload();
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O");
  await expect(cell(page, 1, 3)).toHaveAccessibleName("Hàng 1, cột 3, O");
  await expect(status(page)).toHaveText("Đến lượt X");
  await expect(page.getByRole("button", { name: "Hoàn tác" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );

  await page.getByRole("link", { name: "Về menu" }).click();
  const continueLink = page.getByRole("link", { name: "Tiếp tục" });
  await expect(continueLink).toBeVisible();
  await continueLink.click();
  await expect(cell(page, 3, 3)).toHaveAccessibleName("Hàng 3, cột 3, X");
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

  const boxes = await page
    .getByRole("group", { name: "Bàn cờ" })
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
  expect(await savedMoveCount(page)).toBe(0);

  await page.goto("/play/tictactoe");
  await play(page, [2, 2]);
  await expect.poll(() => savedMoveCount(page)).toBe(1);
});

test("drops unreadable saved data and starts a new game without an error", async ({ page }) => {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "garbage");

  await page.goto("/play/tictactoe");

  await expect(status(page)).toHaveText("Đến lượt X");
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
  // Next.js keeps an empty route announcer with role="alert"; no message may appear in any alert.
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
  await expect.poll(() => readSaved(page)).toBeNull();
});

test("leaves a game saved by a newer version of the app alone", async ({ page }) => {
  const newer = { version: 2, savedAt: "2027-01-01T00:00:00.000Z", future: "format" };
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, newer);

  await page.goto("/play/tictactoe");
  await expect(status(page)).toHaveText("Đến lượt X");
  await play(page, [2, 2]);
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, X");

  // A write for that move would already be queued on the same store, so this read comes after it.
  expect(await readSaved(page)).toEqual(newer);
});

test("shows a not-found page with a way back for an unknown game", async ({ page }) => {
  await page.goto("/play/khong-co-game-nay");

  await expect(page.getByRole("heading", { name: "Không tìm thấy game" })).toBeVisible();
  await page.getByRole("link", { name: "Về menu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
});

test("shows a translated not-found page with a way back for any unknown URL", async ({ page }) => {
  const response = await page.goto("/play");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  await page.getByRole("link", { name: "Về menu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
});
