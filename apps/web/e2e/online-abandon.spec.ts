import { type Browser, expect, type Page, test } from "@playwright/test";

import {
  choose,
  nameField,
  openAsNewPlayer,
  play,
  players,
  rollButton,
  ROOM_URL,
  status,
} from "./helpers";

// Resigning and a player gone too long, with two (or three) browsers (change
// `add-resign-and-abandon`). The realtime server of the tests lets a turn be claimed after 3 s
// (`REALTIME_ABANDON_AFTER_MS`, playwright.config.ts); the browsers move only their clocks, with
// `page.clock.setSystemTime`: never `fastForward` or `runFor`, which would run the connection's
// 45 s silence timer and reconnect, bringing the turn's real duration back.

/** Longer than the 3 s the test server waits before a turn can be claimed. */
const SERVER_ABANDON_WAIT_MS = 3500;
const FIVE_MINUTES = 5 * 60_000;

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const dialog = (page: Page) => page.getByRole("dialog");
const seat = (page: Page, index: number) =>
  page.getByRole("list", { name: "Người chơi" }).getByRole("listitem").nth(index);

/** Creates a room of `gameId` from its setup screen as Minh; returns its address. */
async function createRoom(page: Page, gameId: string, count?: 2 | 3): Promise<string> {
  await page.goto(`/play/${gameId}`);
  await choose(page, "Chế độ", "Online");
  if (count !== undefined) await choose(page, "Số người chơi", `${String(count)} người`);
  await nameField(page).fill("Minh");
  await button(page, "Tạo phòng").click();
  await expect(page).toHaveURL(ROOM_URL);
  return page.url();
}

/** Minh creates a room of two, Lan joins: both see the game. */
async function startGame(page: Page, browser: Browser, gameId: string, count?: 2) {
  const url = await createRoom(page, gameId, count);
  const lan = await openAsNewPlayer(browser, url, "Lan");
  await button(lan.page, "Vào chơi").click();
  // Every board: the game shows, with its resign button.
  await expect(button(page, "Đầu hàng")).toBeVisible();
  await expect(button(lan.page, "Đầu hàng")).toBeVisible();
  return lan;
}

/** Five minutes later on this browser only; the page's timers keep their real pace. */
async function fiveMinutesLater(page: Page): Promise<void> {
  await page.clock.setSystemTime(Date.now() + FIVE_MINUTES + 5000);
}

test("Đầu hàng Cờ caro: asks first, ends the game for both, then they play again", async ({
  page,
  browser,
}) => {
  const lan = await startGame(page, browser, "caro");

  await button(page, "Đầu hàng").click();
  await expect(dialog(page)).toContainText("Lan sẽ thắng ván này.");
  await button(page, "Chơi tiếp").click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(button(page, "Đầu hàng")).toBeFocused();

  await button(page, "Đầu hàng").click();
  await dialog(page).getByRole("button", { name: "Đầu hàng" }).click();

  await expect(status(page)).toHaveText("Lan thắng!");
  await expect(page.getByText("Bạn đã đầu hàng.")).toBeVisible();
  await expect(status(lan.page)).toHaveText("Bạn thắng!");
  await expect(lan.page.getByText("Minh đã đầu hàng.")).toBeVisible();
  await expect(button(page, "Đầu hàng")).toHaveCount(0);

  await button(lan.page, "Chơi lại").click();
  await expect(status(lan.page)).toHaveText("Ván mới: bạn cầm X và đi trước");
  await expect(button(page, "Đầu hàng")).toBeVisible();

  await lan.context.close();
});

test("Xử thắng Tic-tac-toe: after five minutes the waiting player claims the win", async ({
  page,
  browser,
}) => {
  const lan = await startGame(page, browser, "tictactoe");
  await play(page, [2, 2]);
  await expect(status(page)).toHaveText("Đang chờ Lan…");
  await expect(button(page, "Xử thắng")).toHaveCount(0);

  await page.waitForTimeout(SERVER_ABANDON_WAIT_MS);
  await fiveMinutesLater(page);

  await expect(status(page)).toHaveText("Lan đã 5 phút chưa đi. Bạn có thể xử thắng.");
  await expect(page.getByText(/^Lan chưa đi · 5:0\d$/u)).toBeVisible();
  await button(page, "Xử thắng").click();
  await expect(dialog(page)).toContainText("Xử Lan thua vì bỏ ván?");
  await dialog(page).getByRole("button", { name: "Xử thắng" }).click();

  await expect(status(page)).toHaveText("Bạn thắng!");
  await expect(page.getByText("Lan bỏ ván: quá 5 phút không đi.")).toBeVisible();
  await expect(status(lan.page)).toHaveText("Minh thắng!");
  await expect(lan.page.getByText("Bạn bỏ ván: quá 5 phút không đi.")).toBeVisible();

  await lan.context.close();
});

test("Cho máy chơi thay ở Cờ cá ngựa: the AI takes the seat, and a new game gives it back", async ({
  page,
  browser,
}) => {
  const url = await createRoom(page, "ludo", 3);
  const lan = await openAsNewPlayer(browser, url, "Lan");
  await button(lan.page, "Vào chơi").click();
  await expect(players(page)).toHaveCount(3);
  await button(page, "Cho máy chơi ghế 3 và bắt đầu ván").click();
  await expect(rollButton(lan.page)).toBeVisible();
  await expect(status(lan.page)).toHaveText("Ván mới: bạn cầm Xanh dương, Minh đi trước");

  // Minh never rolls: five minutes later, Lan hands his seat to the computer.
  await lan.page.waitForTimeout(SERVER_ABANDON_WAIT_MS);
  await fiveMinutesLater(lan.page);
  await button(lan.page, "Cho máy chơi thay").click();
  await expect(dialog(lan.page)).toContainText("Cho máy chơi thay Minh?");
  await dialog(lan.page).getByRole("button", { name: "Cho máy chơi thay" }).click();

  for (const [player, name] of [
    [page, "Bạn · Đỏ"],
    [lan.page, "Minh · Đỏ"],
  ] as const) {
    await expect(seat(player, 0)).toContainText(name);
    await expect(seat(player, 0)).toContainText("Máy chơi thay");
  }
  await expect(button(page, "Đầu hàng")).toHaveCount(0);
  await expect(rollButton(page)).toHaveAttribute("aria-disabled", "true");

  // Lan, the last person playing, resigns: the game ends.
  await expect(button(lan.page, "Đầu hàng")).toBeVisible({ timeout: 45_000 });
  await button(lan.page, "Đầu hàng").click();
  await expect(dialog(lan.page)).toContainText("Máy sẽ thắng ván này.");
  await dialog(lan.page).getByRole("button", { name: "Đầu hàng" }).click();
  await expect(lan.page.getByText("Bạn đã đầu hàng.")).toBeVisible();
  await expect(page.getByText("Lan đã đầu hàng.")).toBeVisible();

  // A new game: Minh plays his own seat again.
  await button(page, "Chơi lại").click();
  await expect(page.getByRole("list", { name: "Người chơi" })).not.toContainText("Máy chơi thay");
  await expect(button(page, "Đầu hàng")).toBeVisible();

  await lan.context.close();
});

test("Phòng Cờ cá ngựa hai ghế: resigning ends the game", async ({ page, browser }) => {
  const lan = await startGame(page, browser, "ludo", 2);

  await button(lan.page, "Đầu hàng").click();
  await expect(dialog(lan.page)).toContainText("Minh sẽ thắng ván này.");
  await expect(dialog(lan.page)).not.toContainText("Máy");
  await dialog(lan.page).getByRole("button", { name: "Đầu hàng" }).click();

  await expect(status(lan.page)).toHaveText("Minh thắng!");
  await expect(status(page)).toHaveText("Bạn thắng!");
  await expect(page.getByText("Lan đã đầu hàng.")).toBeVisible();

  await lan.context.close();
});
