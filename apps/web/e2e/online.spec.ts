import { type Browser, expect, type Page, test } from "@playwright/test";

import {
  board,
  cell,
  choose,
  nameField,
  openAsNewPlayer,
  openAsStranger,
  play,
  players,
  ROOM_URL,
  status,
} from "./helpers";

// Two players means two browsers: the test's own page is the one who creates the room, and each
// friend gets a context of their own (their own localStorage, so their own player id). The
// realtime server runs next to the app, rooms in memory (playwright.config.ts).

const button = (page: Page, name: string) => page.getByRole("button", { name });
const heading = (page: Page, name: string) => page.getByRole("heading", { name });
/** A seat of the play screen's players' panel, in the order of play. */
const seat = (page: Page, index: number) =>
  page.getByRole("list", { name: "Người chơi" }).getByRole("listitem").nth(index);

/** Creates a Tic-tac-toe room from the setup screen as `name`; returns the room's address. */
async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/play/tictactoe");
  await choose(page, "Chế độ", "Online");
  await nameField(page).fill(name);
  await button(page, "Tạo phòng").click();
  await expect(page).toHaveURL(ROOM_URL);
  // The creator is the host; a room for two has no seat for the computer.
  await expect(players(page)).toHaveText([`${name} (bạn)Chủ phòng`, "Đang chờ…"]);
  return page.url();
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
  await expect(players(lan.page)).toHaveText(["MinhChủ phòng", "Đang chờ…"]);
  await expect(nameField(lan.page)).toHaveValue("Lan");
  await expect(players(page)).toHaveText(["Minh (bạn)Chủ phòng", "Đang chờ…"]);

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
  await expect(status(lan.page)).toHaveText("Minh thắng!");

  // The new game swaps who moves first.
  await button(lan.page, "Chơi lại").click();
  await expect(cell(page, 1, 1)).toHaveAccessibleName("Hàng 1, cột 1, trống");
  await expect(status(lan.page)).toHaveText("Ván mới: bạn cầm X và đi trước");
  await expect(status(page)).toHaveText("Ván mới: bạn cầm O, Lan đi trước");

  await lan.context.close();
});

test("catches up with the opponent's move once the network is back", async ({ page, browser }) => {
  const { lan } = await startOnlineGame(page, browser);
  // Bảng người chơi khi chơi online: you, connected, and the friend by name.
  const you = seat(page, 0);
  await expect(you).toContainText("Bạn · X");
  await expect(you).toContainText("Đã kết nối");
  await expect(seat(page, 1)).toContainText("Lan · O");
  await expect(seat(lan.page, 0)).toContainText("Minh · X");
  await expect(seat(lan.page, 1)).toContainText("Bạn · O");
  await play(page, [1, 1]);
  await expect(status(lan.page)).toHaveText(/Đến lượt bạn \(O\)$/);

  await page.context().setOffline(true);
  await expect(page.getByText("Đang kết nối lại…")).toBeVisible();
  // Mất kết nối: the seat says so too, in other words than the connection line.
  await expect(you).toContainText("Mất kết nối");
  await play(lan.page, [2, 2]);
  // The server has recorded Lan's move before the network comes back.
  await expect(status(lan.page)).toHaveText("Đang chờ Minh…");
  await page.context().setOffline(false);

  // The browser's "online" event reconnects at once, even while an attempt made offline still
  // hangs: no waiting for the retry delays (up to 10 s), longer than this expectation's timeout.
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, O", { timeout: 5000 });
  await expect(status(page)).toHaveText("Lan vừa đánh hàng 2, cột 2. Đến lượt bạn (X)");
  await expect(page.getByText("Đang kết nối lại…")).toHaveCount(0);
  await expect(you).toContainText("Đã kết nối");

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

test("tells a stranger at once that the room is full, without asking for a name", async ({
  page,
  browser,
}) => {
  const { url, lan } = await startOnlineGame(page, browser);

  const khoa = await openAsStranger(browser, url);

  await expect(heading(khoa.page, "Phòng đã đủ người")).toBeVisible();
  await expect(khoa.page.getByRole("main").getByRole("link", { name: "Về menu" })).toBeVisible();
  await expect(nameField(khoa.page)).toHaveCount(0);

  await Promise.all([lan.context.close(), khoa.context.close()]);
});

test("tells a stranger at once that a room does not exist, without asking for a name", async ({
  browser,
}) => {
  const visitor = await openAsStranger(browser, "/room/ZZZZZZ");

  await expect(heading(visitor.page, "Không tìm thấy phòng")).toBeVisible();
  await expect(visitor.page.getByRole("main").getByRole("link", { name: "Về menu" })).toBeVisible();
  await expect(nameField(visitor.page)).toHaveCount(0);

  await visitor.context.close();
});

test("refuses an empty name in the lobby, at the field, and takes no seat", async ({
  page,
  browser,
}) => {
  const url = await createRoom(page, "Minh");
  const lan = await openAsStranger(browser, url);
  await expect(nameField(lan.page)).toBeFocused();

  await button(lan.page, "Vào chơi").click();

  await expect(nameField(lan.page)).toBeFocused();
  await expect(nameField(lan.page)).toHaveAccessibleDescription(
    "Mọi người trong phòng sẽ thấy tên này. Tên cần có từ 1 đến 24 ký tự.",
  );
  await expect(players(page)).toHaveText(["Minh (bạn)Chủ phòng", "Đang chờ…"]);

  await lan.context.close();
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

test("plays a Cờ caro room on a 19×19 board with the free rule, named in the lobby", async ({
  page,
  browser,
}) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Online");
  await choose(page, "Bàn cờ", "19×19");
  await choose(page, "Luật thắng", "Tự do");
  await nameField(page).fill("Minh");
  await button(page, "Tạo phòng").click();
  await expect(page).toHaveURL(ROOM_URL);
  await expect(page.getByText("Luật: 19×19 · Tự do")).toBeVisible();

  // The friend reads the rules before joining.
  const lan = await openAsNewPlayer(browser, page.url(), "Lan");
  await expect(lan.page.getByText("Luật: 19×19 · Tự do")).toBeVisible();
  await button(lan.page, "Vào chơi").click();

  for (const player of [page, lan.page]) {
    await expect(board(player).getByRole("button")).toHaveCount(361);
    await expect(
      player.getByRole("main").getByText("19×19 · Tự do", { exact: true }),
    ).toBeVisible();
  }

  await expect(status(page)).toHaveText("Ván mới: bạn cầm X và đi trước");
  // Minh (X) makes five on row 19 between two of Lan's stones: a win under the free rule.
  const lanMoves: readonly (readonly [number, number])[] = [
    [19, 1],
    [19, 7],
    [10, 4],
    [10, 5],
  ];
  for (const [index, col] of [2, 3, 4, 5, 6].entries()) {
    await play(page, [19, col]);
    const answer = lanMoves[index];
    if (answer === undefined) break;
    await expect(status(lan.page)).toHaveText(/Đến lượt bạn \(O\)$/);
    await play(lan.page, answer);
    await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/);
  }
  await expect(status(page)).toHaveText("Bạn thắng!");
  await expect(status(lan.page)).toHaveText("Minh thắng!");

  await button(lan.page, "Chơi lại").click();
  for (const player of [page, lan.page]) {
    await expect(cell(player, 19, 19)).toHaveAccessibleName("Hàng 19, cột 19, trống");
    await expect(board(player).getByRole("button")).toHaveCount(361);
    await expect(
      player.getByRole("main").getByText("19×19 · Tự do", { exact: true }),
    ).toBeVisible();
  }

  await lan.context.close();
});
