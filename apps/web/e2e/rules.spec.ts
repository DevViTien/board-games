import { expect, type Page, test } from "@playwright/test";

import {
  board,
  cell,
  choose,
  nameField,
  openAsNewPlayer,
  play,
  pressStart,
  ROOM_URL,
  status,
} from "./helpers";

// The rules pages (`/rules/<id>`), the ways to them (the menu's cards, the setup screen) and the
// rules dialog of the play screen, on one device and online (change `add-rules-pages`).

const rulesButton = (page: Page) => page.getByRole("button", { name: "Luật chơi" });
const rulesDialog = (page: Page, game: string) =>
  page.getByRole("dialog", { name: `Luật chơi ${game}` });

/** Whether the page scrolls sideways. */
function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

test("Từ menu: the rules link of Cờ cá ngựa opens its rules, which lead to its setup screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Luật chơi Cờ cá ngựa" }).click();

  await expect(page).toHaveURL(/\/rules\/ludo$/);
  await expect(page).toHaveTitle("Luật chơi Cờ cá ngựa · Board Games Hub");
  await expect(page.getByRole("heading", { level: 1, name: "Luật chơi Cờ cá ngựa" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Gieo 1: nhảy tới chân chuồng" }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /^Bàn chữ thập/ })).toBeVisible();

  await page.getByRole("link", { name: "Chơi Cờ cá ngựa" }).first().click();
  await expect(page).toHaveURL(/\/play\/ludo$/);
  await expect(page.getByRole("heading", { level: 1, name: "Cờ cá ngựa" })).toBeVisible();
});

test("Từ màn hình bắt đầu ván: the setup screen of Cờ vua links its rules", async ({ page }) => {
  await page.goto("/play/chess");
  await page.getByRole("link", { name: "Luật chơi" }).click();

  await expect(page).toHaveURL(/\/rules\/chess$/);
  await expect(page.getByRole("heading", { level: 1, name: "Luật chơi Cờ vua" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Giấy phép" })).toHaveAttribute(
    "href",
    "/third-party-licenses.txt",
  );
});

test("Game không tồn tại: an unknown game's rules page says so, with the way back", async ({
  page,
}) => {
  const response = await page.goto("/rules/khong-co-game-nay");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Không có luật chơi này" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Về menu" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("Điện thoại nhỏ: the rules of Cờ vua fit 360 px, every figure within the screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/rules/chess");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  expect(await scrollsSideways(page)).toBe(false);
  for (const figure of await page.getByRole("img").all()) {
    const box = await figure.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 0) <= 360).toBe(true);
  }
});

test("Trang luật bằng tiếng Nhật: the rules of Cờ cá ngựa in Japanese", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "ja", url: baseURL ?? "" }]);
  await page.goto("/rules/ludo");

  await expect(page.getByRole("heading", { level: 1, name: "ルドーのルール" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "勝ち" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^十字形の盤/ })).toBeVisible();
});

test("Đọc luật giữa ván: the rules dialog of a game of Cờ caro leaves the game as it was", async ({
  page,
}) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Cùng máy");
  await choose(page, "Bàn cờ", "19×19");
  await choose(page, "Luật thắng", "Tự do");
  await pressStart(page);
  await expect(board(page)).toBeVisible();
  await play(page, [10, 10], [10, 11]);

  await rulesButton(page).click();
  const dialog = rulesDialog(page, "Cờ caro");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Ván này: 19×19 · Tự do")).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 3, name: "Luật “tự do”" })).toBeVisible();
  await expect(dialog.getByRole("link")).toHaveCount(0);

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(rulesButton(page)).toBeFocused();
  await expect(cell(page, 10, 10)).toHaveAccessibleName(/^Hàng 10, cột 10, X/);
  await expect(cell(page, 10, 11)).toHaveAccessibleName(/^Hàng 10, cột 11, O/);
  await expect(page).toHaveURL(/\/play\/caro\/local$/);
});

test("Nút trên màn hình chơi ở điện thoại: the rules button is named and big enough to touch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/play/caro/local");
  await expect(board(page)).toBeVisible();

  const box = await rulesButton(page).boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await rulesButton(page).click();
  await expect(rulesDialog(page, "Cờ caro")).toBeVisible();
  expect(await scrollsSideways(page)).toBe(false);
  await page.getByRole("button", { name: "Đóng" }).click();
  await expect(rulesDialog(page, "Cờ caro")).toBeHidden();
});

test("Ván online vẫn chạy: the opponent's move arrives while the rules are open", async ({
  page,
  browser,
}) => {
  await page.goto("/play/tictactoe");
  await choose(page, "Chế độ", "Online");
  await nameField(page).fill("Minh");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  const url = page.url();
  const lan = await openAsNewPlayer(browser, url, "Lan");
  await lan.page.getByRole("button", { name: "Vào chơi" }).click();
  await expect(board(page)).toBeVisible();
  await expect(board(lan.page)).toBeVisible();

  // Lan reads the rules while Minh (X, first) moves.
  await rulesButton(lan.page).click();
  const dialog = rulesDialog(lan.page, "Tic-tac-toe");
  await expect(dialog.getByRole("heading", { level: 3, name: "Thắng" })).toBeVisible();
  await play(page, [1, 1]);
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
  await lan.page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(rulesButton(lan.page)).toBeFocused();
  await expect(cell(lan.page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
  await expect(lan.page).toHaveURL(url);
  await expect(status(lan.page)).toHaveText(/^Minh vừa đánh hàng 1, cột 1\. Đến lượt bạn \(O\)/);
  await lan.context.close();
});
