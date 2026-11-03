import { type Browser, expect, type Page, test } from "@playwright/test";

import {
  board,
  chessSquare,
  choose,
  nameField,
  openAsNewPlayer,
  playChess,
  ROOM_URL,
  status,
} from "./helpers";

// Cờ vua online (spec chess "Cờ vua online"): Lan creates the room and plays White, Minh opens the
// invite link in a browser of his own and plays Black. Each board shows its player's side at the
// bottom; the server checks every move with the rules.

const button = (page: Page, name: string) => page.getByRole("button", { name });
const bar = (page: Page, name: string) => page.getByRole("group", { name });

/** The square at the bottom left of `page`'s board. */
const bottomLeft = (page: Page) => board(page).getByRole("row").last().getByRole("button").first();

async function startRoom(page: Page, browser: Browser) {
  await page.goto("/play/chess");
  await choose(page, "Chế độ", "Online");
  await nameField(page).fill("Lan");
  await button(page, "Tạo phòng").click();
  await expect(page).toHaveURL(ROOM_URL);
  const minh = await openAsNewPlayer(browser, page.url(), "Minh");
  await button(minh.page, "Vào chơi").click();
  await expect(board(page)).toBeVisible();
  await expect(board(minh.page)).toBeVisible();
  return minh;
}

/**
 * Plays `moves` (UCI) in turn, Lan first unless `blackFirst`: each player waits until the move
 * before shows on their board, the room sends it to them.
 */
async function alternate(lan: Page, minh: Page, moves: readonly string[], blackFirst = false) {
  for (const [index, move] of moves.entries()) {
    const white = (index % 2 === 0) !== blackFirst;
    const mover = white ? lan : minh;
    await expect(chessSquare(mover, move.slice(0, 2))).not.toHaveAttribute("aria-disabled");
    await playChess(mover, move);
  }
}

test("Hai người chơi qua link mời: each sees their side at the bottom; a mate, then a rematch swaps the colours", async ({
  page,
  browser,
}) => {
  const minh = await startRoom(page, browser);

  // Lan: White at the bottom, to move. Minh: Black at the bottom, waiting.
  await expect(status(page)).toHaveText("Ván mới: bạn cầm Trắng và đi trước");
  await expect(status(minh.page)).toHaveText("Ván mới: bạn cầm Đen, Lan đi trước");
  await expect(bottomLeft(page)).toHaveAttribute("data-square", "a1");
  await expect(bottomLeft(minh.page)).toHaveAttribute("data-square", "h8");
  await expect(bar(page, "Bạn · Trắng")).toContainText("Đã kết nối");
  await expect(bar(minh.page, "Bạn · Đen")).toBeVisible();
  await expect(bar(minh.page, "Lan · Trắng")).toBeVisible();

  // The opponent's move is told by its piece and squares.
  await playChess(page, "f2f3");
  await expect(status(minh.page)).toHaveText("Lan vừa đi Tốt f2 tới f3. Đến lượt bạn (Đen)");
  await alternate(page, minh.page, ["e7e5", "g2g4", "d8h4"], true);

  await expect(status(minh.page)).toHaveText("Bạn thắng!");
  await expect(status(page)).toHaveText("Minh thắng!");
  await expect(page.getByText("Chiếu hết", { exact: true })).toBeVisible();

  // Lan had flipped her board; the rematch gives her Black and her board turns back to her side.
  await button(page, "Lật bàn").click();
  await expect(bottomLeft(page)).toHaveAttribute("data-square", "h8");
  await button(minh.page, "Chơi lại").click();

  await expect(status(page)).toHaveText("Ván mới: bạn cầm Đen, Minh đi trước");
  await expect(status(minh.page)).toHaveText("Ván mới: bạn cầm Trắng và đi trước");
  await expect(bottomLeft(page)).toHaveAttribute("data-square", "h8");
  await expect(button(page, "Lật bàn")).toHaveAttribute("aria-pressed", "false");
  await expect(bottomLeft(minh.page)).toHaveAttribute("data-square", "a1");

  await minh.context.close();
});

test("Phong cấp online: Lan promotes to a knight, both boards show it", async ({
  page,
  browser,
}) => {
  const minh = await startRoom(page, browser);

  // 1. a4 b5 2. axb5 a6 3. bxa6 Bb7 4. axb7 Nc6 5. b8=N
  await alternate(page, minh.page, [
    "a2a4",
    "b7b5",
    "a4b5",
    "a7a6",
    "b5a6",
    "c8b7",
    "a6b7",
    "b8c6",
  ]);
  await expect(chessSquare(page, "b7")).not.toHaveAttribute("aria-disabled");
  await playChess(page, "b7b8");
  await page
    .getByRole("dialog", { name: "Tốt b7 → b8" })
    .getByRole("button", { name: "Mã" })
    .click();

  await expect(chessSquare(page, "b8")).toHaveAccessibleName("Mã trắng ở b8");
  await expect(chessSquare(minh.page, "b8")).toHaveAccessibleName("Mã trắng ở b8");
  await expect(status(minh.page)).toHaveText(
    "Lan vừa đi Tốt b7 tới b8, phong Mã. Đến lượt bạn (Đen)",
  );

  await minh.context.close();
});

test("Đòi hoà online: Lan claims after the third repetition, both see a draw", async ({
  page,
  browser,
}) => {
  const minh = await startRoom(page, browser);

  await alternate(page, minh.page, [
    "g1f3",
    "g8f6",
    "f3g1",
    "f6g8",
    "g1f3",
    "g8f6",
    "f3g1",
    "f6g8",
  ]);
  await expect(button(page, "Đòi hoà")).toBeVisible();
  // Only the side to move may claim: Minh's screen has no button.
  await expect(button(minh.page, "Đòi hoà")).toHaveCount(0);
  await button(page, "Đòi hoà").click();

  await expect(status(page)).toHaveText("Hoà!");
  await expect(status(minh.page)).toHaveText("Hoà!");
  await expect(minh.page.getByText("Trắng đòi hoà: thế cờ lặp lại ba lần")).toBeVisible();

  await minh.context.close();
});
