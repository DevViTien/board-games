import { expect, type Page } from "@playwright/test";

// Shared by the E2E specs. The browser language is pinned to Vietnamese in playwright.config.ts.

export const cell = (page: Page, row: number, col: number) =>
  page.getByRole("button", { name: new RegExp(`^Hàng ${row}, cột ${col},`) });
export const status = (page: Page) => page.getByRole("status");
export const board = (page: Page) => page.getByRole("group", { name: "Bàn cờ" });

export async function play(page: Page, ...cells: readonly (readonly [number, number])[]) {
  for (const [row, col] of cells) await cell(page, row, col).click();
}

/** The accessible name of every cell, row by row: what a screen reader hears of the board. */
export function boardCells(page: Page): Promise<string[]> {
  return board(page)
    .getByRole("button")
    .evaluateAll((cells) => cells.map((element) => element.getAttribute("aria-label") ?? ""));
}

/** How many cells hold `mark` ("X", "O"). */
export async function countMarks(page: Page, mark: string): Promise<number> {
  return (await boardCells(page)).filter((name) => name.endsWith(`, ${mark}`)).length;
}

/** Clicks the first empty cell, row by row. */
export async function playFirstEmptyCell(page: Page): Promise<void> {
  await board(page)
    .getByRole("button", { name: /, trống$/ })
    .first()
    .click();
}

/** The status line once the AI has moved: where it played, then the player's turn as `mark`. */
export const afterAiMove = (mark: "X" | "O") =>
  new RegExp(`^Máy đánh hàng \\d, cột \\d\\. Đến lượt bạn \\(${mark}\\)$`);

/**
 * Against the AI: plays the first empty cell as `mark` and waits until the AI has answered and it
 * is the player's turn again.
 */
export async function playAndWaitForAi(page: Page, mark: "X" | "O"): Promise<void> {
  const aiMark = mark === "X" ? "O" : "X";
  const aiMoves = await countMarks(page, aiMark);
  await playFirstEmptyCell(page);
  await expect.poll(() => countMarks(page, aiMark)).toBe(aiMoves + 1);
  await expect(status(page)).toHaveText(afterAiMove(mark));
}

/** The mode label next to the game's name on the play screen, e.g. "Với máy · Khó". */
export const modeLabel = (page: Page, label: string) =>
  page.getByRole("main").getByText(label, { exact: true });

// Names from src/config/storage-keys.ts.
const SAVED_GAMES_DB = "board-games-saved-games";
const SAVED_GAMES_STORE = "saved-games";

/** Keys of the saved games (src/transport/saved-game.ts `slotKey`, and M1's bare game id). */
export const SLOT = {
  local: "tictactoe:local",
  ai: "tictactoe:ai",
  legacy: "tictactoe",
} as const;

/** A page of the app that does not touch IndexedDB, to prepare storage before the game opens. */
export const PAGE_WITHOUT_STORAGE = "/play/khong-co-game-nay";

/**
 * The value stored under `key` in the saved games' IndexedDB, or `null` when there is none. It
 * never creates the database: opening a missing one would create it empty, and idb-keyval only
 * creates its store when it creates the database, so the app could never save again. The upgrade
 * is aborted instead.
 */
export function readSaved(page: Page, key: string): Promise<unknown> {
  return page.evaluate(
    ([dbName, storeName, slot]) =>
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
          const read = database.transaction(storeName, "readonly").objectStore(storeName).get(slot);
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
    [SAVED_GAMES_DB, SAVED_GAMES_STORE, key] as const,
  );
}

interface SavedShape {
  readonly inProgress?: boolean;
  readonly mode?: { readonly kind?: string; readonly seats?: readonly { kind?: string }[] };
  readonly record?: { readonly entries?: readonly unknown[] };
}

/** The saved game under `key` as far as the tests look at it, or `null` when there is none. */
export async function readSavedGame(page: Page, key: string): Promise<SavedShape | null> {
  return (await readSaved(page, key)) as SavedShape | null;
}

/** Number of moves of the game saved under `key` (0 when none is saved). */
export async function savedMoveCount(page: Page, key: string): Promise<number> {
  return (await readSavedGame(page, key))?.record?.entries?.length ?? 0;
}

/** Stores `value` under `key`, creating the database the way idb-keyval does. */
export function writeSaved(page: Page, key: string, value: unknown): Promise<void> {
  return page.evaluate(
    ([dbName, storeName, slot, saved]) =>
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
          write.objectStore(storeName).put(saved, slot);
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
    [SAVED_GAMES_DB, SAVED_GAMES_STORE, key, value] as const,
  );
}

/** Opens the Tic-tac-toe setup screen from the menu's card. */
export async function openSetupFromMenu(page: Page): Promise<void> {
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Tic-tac-toe" }) })
    .getByRole("link", { name: "Chơi" })
    .click();
  await expect(page).toHaveURL(/\/play\/tictactoe$/);
}

const startButton = (page: Page) => page.getByRole("button", { name: "Bắt đầu" });

/** Picks `option` in the setup screen's group named `group` ("Chế độ", "Mức độ", "Ai đi trước"). */
export async function choose(page: Page, group: string, option: string): Promise<void> {
  const options = page.getByRole("group", { name: group });
  // The radios are visually hidden: a player clicks the option's label, which shows the choice.
  await options
    .locator("label")
    .filter({ hasText: new RegExp(`^${option}$`) })
    .click();
  await expect(options.getByRole("radio", { name: option })).toBeChecked();
}

/**
 * Presses "Start" once the setup screen knows the games in progress ("Start" is not pressable
 * before), so a press is never ignored.
 */
export async function pressStart(page: Page): Promise<void> {
  await expect(startButton(page)).toHaveAttribute("aria-disabled", "false");
  await startButton(page).click();
}

/** From the menu, starts a new Tic-tac-toe game on this device and waits for its board. */
export async function startLocalGame(page: Page): Promise<void> {
  await openSetupFromMenu(page);
  await choose(page, "Chế độ", "Cùng máy");
  await pressStart(page);
  // The start request is removed from the address once read.
  await expect(page).toHaveURL(/\/play\/tictactoe\/local$/);
  await expect(board(page)).toBeVisible();
}

/** From the menu, starts a new Tic-tac-toe game against the AI and waits for its board. */
export async function startAiGame(
  page: Page,
  { level = "Vừa", first = "Tôi" }: { readonly level?: string; readonly first?: string } = {},
): Promise<void> {
  await openSetupFromMenu(page);
  await choose(page, "Chế độ", "Đấu với máy");
  await choose(page, "Mức độ", level);
  await choose(page, "Ai đi trước", first);
  await pressStart(page);
  await expect(page).toHaveURL(/\/play\/tictactoe\/ai$/);
  await expect(board(page)).toBeVisible();
}

/** The "Continue a game" section of the menu. */
export const continueSection = (page: Page) =>
  page.getByRole("region", { name: "Tiếp tục ván dở" });
