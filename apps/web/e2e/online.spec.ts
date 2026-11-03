import { type Browser, type BrowserContext, expect, type Page, test } from "@playwright/test";

import { board, cell, choose, play, status } from "./helpers";

// Two players means two browsers: the test's own page is the one who creates the room, and each
// friend gets a context of their own (their own localStorage, so their own player id). The
// realtime server runs next to the app, rooms in memory (playwright.config.ts).

const ROOM_URL = /\/room\/[2-9A-HJKMNP-Z]{6}$/;

const players = (page: Page) =>
  page.getByRole("region", { name: "Người chơi" }).getByRole("listitem");
const nameField = (page: Page) => page.getByRole("textbox", { name: "Tên của bạn" });
const button = (page: Page, name: string) => page.getByRole("button", { name });
const heading = (page: Page, name: string) => page.getByRole("heading", { name });

/** Creates a Tic-tac-toe room from the setup screen as `name`; returns the room's address. */
async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/play/tictactoe");
  await choose(page, "Chế độ", "Online");
  await nameField(page).fill(name);
  await button(page, "Tạo phòng").click();
  await expect(page).toHaveURL(ROOM_URL);
  await expect(players(page)).toHaveText([`${name} (bạn)`, "Đang chờ…"]);
  return page.url();
}

interface Friend {
  readonly context: BrowserContext;
  readonly page: Page;
}

/** Someone who has never played online opens `url` in their own browser and gives their name. */
async function openAsNewPlayer(browser: Browser, url: string, name: string): Promise<Friend> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await expect(heading(page, "Chọn tên để vào phòng")).toBeVisible();
  await nameField(page).fill(name);
  await button(page, "Tiếp tục").click();
  return { context, page };
}

/** Minh creates a room, Lan opens the invite link and joins: both see the board. */
async function startOnlineGame(page: Page, browser: Browser) {
  const url = await createRoom(page, "Minh");
  const lan = await openAsNewPlayer(browser, url, "Lan");
  await button(lan.page, "Vào chơi").click();
  await expect(board(page)).toBeVisible();
  await expect(board(lan.page)).toBeVisible();
  return { url, lan };
}

test("plays a whole game with a friend through the invite link, then plays again", async ({
  page,
  browser,
}) => {
  const url = await createRoom(page, "Minh");
  await expect(page).toHaveTitle(/^Phòng [2-9A-HJKMNP-Z]{6} · Board Games Hub$/);

  // Opening the link takes no seat: the friend sees the lobby, the creator still waits.
  const lan = await openAsNewPlayer(browser, url, "Lan");
  await expect(players(lan.page)).toHaveText(["Minh", "Đang chờ…"]);
  await expect(nameField(lan.page)).toHaveValue("Lan");
  await expect(players(page)).toHaveText(["Minh (bạn)", "Đang chờ…"]);

  await button(lan.page, "Vào chơi").click();

  await expect(status(page)).toHaveText("Ván mới: bạn cầm X và đi trước");
  await expect(status(lan.page)).toHaveText("Ván mới: bạn cầm O, Minh đi trước");
  await expect(page.getByText("Online", { exact: true })).toBeVisible();
  await expect(button(page, "Hoàn tác")).toHaveCount(0);

  // One move shows on both boards, and the turn passes.
  await play(page, [1, 1]);
  await expect(cell(lan.page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
  await expect(status(lan.page)).toHaveText("Minh vừa đánh hàng 1, cột 1. Đến lượt bạn (O)");
  await expect(status(page)).toHaveText("Đang chờ Lan…");

  await play(lan.page, [2, 1]);
  await play(page, [1, 2]);
  await play(lan.page, [2, 2]);
  await play(page, [1, 3]);

  await expect(status(page)).toHaveText("Bạn thắng!");
  await expect(status(lan.page)).toHaveText("Minh thắng");

  // The new game swaps who moves first.
  await button(lan.page, "Chơi lại").click();
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
  await expect(status(lan.page)).toHaveText("Ván mới: bạn cầm X và đi trước");
  await expect(status(page)).toHaveText("Ván mới: bạn cầm O, Lan đi trước");

  await lan.context.close();
});

test("catches up with the opponent's move once the network is back", async ({ page, browser }) => {
  const { lan } = await startOnlineGame(page, browser);
  await play(page, [1, 1]);
  await expect(status(lan.page)).toHaveText(/Đến lượt bạn \(O\)$/);

  await page.context().setOffline(true);
  await expect(page.getByText("Đang kết nối lại…")).toBeVisible();
  await play(lan.page, [2, 2]);
  // The server has recorded Lan's move before the network comes back.
  await expect(status(lan.page)).toHaveText("Đang chờ Minh…");
  await page.context().setOffline(false);

  // The browser's "online" event reconnects at once, even while an attempt made offline still
  // hangs: no waiting for the retry delays (up to 10 s), longer than this expectation's timeout.
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O", { timeout: 5000 });
  await expect(status(page)).toHaveText("Lan vừa đánh hàng 2, cột 2. Đến lượt bạn (X)");
  await expect(page.getByText("Đang kết nối lại…")).toHaveCount(0);

  await lan.context.close();
});

test("shows the same game, on the same side, after a reload", async ({ page, browser }) => {
  const { lan } = await startOnlineGame(page, browser);
  await play(page, [1, 1]);
  await play(lan.page, [2, 2]);
  await play(page, [3, 3]);

  await lan.page.reload();

  await expect(cell(lan.page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
  await expect(cell(lan.page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O");
  await expect(cell(lan.page, 3, 3)).toHaveAccessibleName("Hàng 3, cột 3, X");
  await expect(status(lan.page)).toHaveText(/Đến lượt bạn \(O\)$/);

  await lan.context.close();
});

test("keeps the seat under a name changed on the setup screen", async ({ page, browser }) => {
  const { url, lan } = await startOnlineGame(page, browser);
  await play(page, [1, 1]);
  await expect(status(page)).toHaveText("Đang chờ Lan…");

  await lan.page.goto("/play/tictactoe");
  await choose(lan.page, "Chế độ", "Online");
  await expect(nameField(lan.page)).toHaveValue("Lan");
  await nameField(lan.page).fill("Lan Anh");
  await nameField(lan.page).press("Tab");
  await lan.page.goto(url);

  await expect(cell(lan.page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, X");
  await expect(status(lan.page)).toHaveText(/Đến lượt bạn \(O\)$/);
  await expect(status(page)).toHaveText("Đang chờ Lan Anh…");

  await lan.context.close();
});

test("tells a third player that the room is full", async ({ page, browser }) => {
  const { url, lan } = await startOnlineGame(page, browser);

  const khoa = await openAsNewPlayer(browser, url, "Khoa");

  await expect(heading(khoa.page, "Phòng đã đủ người")).toBeVisible();
  await expect(khoa.page.getByRole("link", { name: "Về menu" })).toBeVisible();

  await Promise.all([lan.context.close(), khoa.context.close()]);
});

test("tells that a room does not exist", async ({ browser }) => {
  const visitor = await openAsNewPlayer(browser, "/room/ZZZZZZ", "Khoa");

  await expect(heading(visitor.page, "Không tìm thấy phòng")).toBeVisible();
  await expect(visitor.page.getByRole("link", { name: "Về menu" })).toBeVisible();

  await visitor.context.close();
});

test("opens a room by a code typed on the menu, and refuses a code that cannot be one", async ({
  page,
}) => {
  const field = page.getByRole("textbox", { name: "Mã phòng" });
  await page.goto("/");

  await field.fill("12");
  await button(page, "Vào phòng").click();
  await expect(field).toHaveAccessibleDescription(
    "Mã phòng gồm 6 chữ cái và chữ số, ví dụ ABC234.",
  );
  await expect(page).toHaveURL(/\/$/);

  await field.fill("  abc234 ");
  await button(page, "Vào phòng").click();
  await expect(page).toHaveURL(/\/room\/ABC234$/);
});

test("sends a room code in lower case to its canonical address", async ({ page }) => {
  await page.goto("/room/abc234");

  await expect(page).toHaveURL(/\/room\/ABC234$/);
});
