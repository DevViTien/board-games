import { expect, type Page, test } from "@playwright/test";

import {
  afterAiMove,
  board,
  choose,
  countMarks,
  modeLabel,
  openSetupFromMenu,
  playAndWaitForAi,
  pressStart,
  readSavedGame,
  savedMoveCount,
  SLOT,
  startAiGame,
  status,
} from "./helpers";

// The browser language is pinned to Vietnamese in playwright.config.ts.

const radio = (page: Page, group: string, option: string) =>
  page.getByRole("group", { name: group }).getByRole("radio", { name: option });

test("starts a game against the AI from the menu with the default choices", async ({ page }) => {
  await openSetupFromMenu(page);
  await expect(page).toHaveTitle("Tic-tac-toe · Board Games Hub");
  await expect(radio(page, "Chế độ", "Đấu với máy")).toBeChecked();
  await expect(radio(page, "Mức độ", "Vừa")).toBeChecked();
  await expect(radio(page, "Ai đi trước", "Tôi")).toBeChecked();

  await pressStart(page);

  // The start request is read once and removed from the address.
  await expect(page).toHaveURL(/\/play\/tictactoe\/ai$/);
  await expect(modeLabel(page, "Với máy · Vừa")).toBeVisible();
  await expect(status(page)).toHaveText("Đến lượt bạn (X)");
  expect(await countMarks(page, "X")).toBe(0);
});

test("starts a Hard game where the AI moves first, and remembers the choice", async ({ page }) => {
  await startAiGame(page, { level: "Khó", first: "Máy" });

  await expect(modeLabel(page, "Với máy · Khó")).toBeVisible();
  // The AI plays the first move by itself; the player answers as O.
  await expect.poll(() => countMarks(page, "X")).toBe(1);
  await expect(status(page)).toHaveText(afterAiMove("O"));
  await expect(page.getByRole("button", { name: "Hoàn tác" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  await openSetupFromMenu(page);
  await expect(radio(page, "Chế độ", "Đấu với máy")).toBeChecked();
  await expect(radio(page, "Mức độ", "Khó")).toBeChecked();
  await expect(radio(page, "Ai đi trước", "Máy")).toBeChecked();
});

test("keeps who moves first, drawn at random, across a reload", async ({ page }) => {
  await startAiGame(page, { first: "Ngẫu nhiên" });

  // "New game" draws again; play until the draw makes the AI move first.
  for (let draw = 0; ; draw += 1) {
    expect(draw, "the AI never moved first in 30 draws").toBeLessThan(30);
    // The player moving first is told their turn; the AI moving first is told where it played.
    await expect(status(page)).toHaveText(
      new RegExp(`^Đến lượt bạn \\(X\\)$|${afterAiMove("O").source}`),
    );
    if ((await status(page).textContent())?.endsWith("Đến lượt bạn (O)") === true) break;
    await page.getByRole("button", { name: "Ván mới" }).click();
  }
  const aiMove = await board(page).getByRole("button", { name: /, X$/ }).getAttribute("aria-label");
  await expect
    .poll(async () => {
      const saved = await readSavedGame(page, SLOT.ai);
      return [saved?.record?.entries?.length, saved?.mode?.seats?.[0]?.kind];
    })
    .toEqual([1, "ai"]);

  await page.reload();

  await expect(status(page)).toHaveText(afterAiMove("O"));
  await expect(board(page).getByRole("button", { name: /, X$/ })).toHaveAccessibleName(
    aiMove ?? "",
  );
});

test("asks before dropping a game in progress of the same mode", async ({ page }) => {
  await startAiGame(page);
  await playAndWaitForAi(page, "X");
  await expect.poll(() => savedMoveCount(page, SLOT.ai)).toBe(2);

  await openSetupFromMenu(page);
  const continueLink = page.getByRole("link", { name: "Tiếp tục: Với máy · Vừa" });
  await expect(continueLink).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Bỏ ván đang dở?" });

  // Cancelling keeps the game and stays here.
  await pressStart(page);
  await dialog.getByRole("button", { name: "Giữ ván dở" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/play\/tictactoe$/);
  await expect(continueLink).toBeVisible();
  expect(await savedMoveCount(page, SLOT.ai)).toBe(2);

  // Agreeing starts a new game with the new choice.
  await choose(page, "Mức độ", "Khó");
  await pressStart(page);
  await dialog.getByRole("button", { name: "Bắt đầu ván mới" }).click();
  await expect(page).toHaveURL(/\/play\/tictactoe\/ai$/);
  await expect(modeLabel(page, "Với máy · Khó")).toBeVisible();
  await expect(status(page)).toHaveText("Đến lượt bạn (X)");
  expect(await countMarks(page, "X")).toBe(0);
});
