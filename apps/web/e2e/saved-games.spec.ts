import { expect, type Page, test } from "@playwright/test";

import {
  cell,
  choose,
  continueSection,
  openSetupFromMenu,
  PAGE_WITHOUT_STORAGE,
  play,
  pressStart,
  readSaved,
  readSavedGame,
  SLOT,
  status,
  writeSaved,
} from "./helpers";

// Games saved by the first version of the app (M1): one same-device game per game, under the bare
// game id, in envelope version 1 (see src/transport/migrate-legacy-saves.ts).

/** X in the top-left corner, O in the centre: X to move. */
const LEGACY_GAME = {
  version: 1,
  savedAt: "2026-10-01T08:00:00.000Z",
  mode: { kind: "local" },
  record: {
    version: 1,
    gameId: "tictactoe",
    playerCount: 2,
    options: {},
    entries: [{ move: { cell: 0 } }, { move: { cell: 4 } }],
  },
};

/** Leaves the M1 game in IndexedDB the way M1 did, before the app of this version opens. */
async function storeLegacyGame(page: Page): Promise<void> {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, SLOT.legacy, LEGACY_GAME);
}

test("lists a game saved by the previous version on the menu", async ({ page }) => {
  await storeLegacyGame(page);

  await page.goto("/");

  const continueLink = continueSection(page).getByRole("link", { name: "Tic-tac-toe · Cùng máy" });
  await expect(continueLink).toBeVisible();
  // Moved to its slot, once.
  await expect.poll(() => readSaved(page, SLOT.legacy)).toBeNull();
  expect(await readSavedGame(page, SLOT.local)).toMatchObject({
    version: 2,
    savedAt: LEGACY_GAME.savedAt,
    inProgress: true,
    mode: { kind: "local" },
  });

  await continueLink.click();
  await expect(page).toHaveURL(/\/play\/tictactoe\/local$/);
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
});

test("resumes a same-device game saved by the previous version", async ({ page }) => {
  await storeLegacyGame(page);

  await page.goto("/play/tictactoe/local");

  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O");
  await expect(status(page)).toHaveText("Đến lượt X");
});

test("never brings back a game saved by the previous version once it was replaced", async ({
  page,
}) => {
  await storeLegacyGame(page);

  // The setup screen knows the old game is in progress, so it asks before dropping it.
  await openSetupFromMenu(page);
  await expect(page.getByRole("link", { name: "Tiếp tục: Cùng máy" })).toBeVisible();
  await choose(page, "Chế độ", "Cùng máy");
  await pressStart(page);
  const dialog = page.getByRole("dialog", { name: "Bỏ ván đang dở?" });
  await dialog.getByRole("button", { name: "Bắt đầu ván mới" }).click();

  await expect(page).toHaveURL(/\/play\/tictactoe\/local$/);
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
  await play(page, [1, 1], [2, 1], [1, 2], [2, 2], [1, 3]);
  await expect(status(page)).toHaveText("X thắng!");
  // The finished game is dropped, and the old one is not left behind under either key.
  await expect.poll(() => readSaved(page, SLOT.local)).toBeNull();
  expect(await readSaved(page, SLOT.legacy)).toBeNull();

  await page.getByRole("link", { name: "Về menu" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tic-tac-toe · Cùng máy" })).toHaveCount(0);
  // Nor on a later visit.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tic-tac-toe · Cùng máy" })).toHaveCount(0);
});
