import { type Browser, expect, type Page, test } from "@playwright/test";

import {
  choose,
  giveNameInLobby,
  horseChoices,
  horsePositions,
  lastRolledFace,
  ludoPly,
  nameField,
  openAsNewPlayer,
  players,
  rollButton,
  ROOM_URL,
  status,
  tapHorse,
} from "./helpers";

// The 2D die, which shows each roll at once: the throw of the 3D die is `ludo-throw.spec.ts`'s.
test.use({ reducedMotion: "reduce" });

// Cờ cá ngựa rooms for three or four, with seats the host gives to the computer: the server plays
// them (change `add-room-ai-seats`). Real dice decide the game, so these tests only check what
// holds whatever is rolled.

const button = (page: Page, name: string) => page.getByRole("button", { name });

/** The AI seats may roll several 6s in a row, each shown for a while: a turn can take seconds. */
const AI_TURNS_TIMEOUT = 45_000;

/** Creates a Cờ cá ngựa room for `count` players from the setup screen as Minh. */
async function createLudoRoom(page: Page, count: 3 | 4): Promise<string> {
  await page.goto("/play/ludo");
  await choose(page, "Chế độ", "Online");
  await choose(page, "Số người chơi", `${count} người`);
  await nameField(page).fill("Minh");
  await button(page, "Tạo phòng").click();
  await expect(page).toHaveURL(ROOM_URL);
  await expect(players(page)).toHaveCount(count);
  return page.url();
}

/**
 * Plays this player's whole turn once it comes: rolls, moves the first horse offered, and rolls
 * again after a 6.
 */
async function playOnlineTurn(page: Page): Promise<void> {
  for (;;) {
    await expect(rollButton(page)).toHaveAttribute("aria-disabled", "false", {
      timeout: AI_TURNS_TIMEOUT,
    });
    const before = await ludoPly(page);
    await rollButton(page).click();
    await expect.poll(() => ludoPly(page)).toBeGreaterThan(before);
    const face = await lastRolledFace(page);
    if ((await horseChoices(page).count()) > 0) {
      const rolled = await ludoPly(page);
      await tapHorse(page, horseChoices(page).first());
      await expect.poll(() => ludoPly(page)).toBeGreaterThan(rolled);
    }
    if (face !== 6) return;
  }
}

test("Chủ phòng cho máy chơi ghế còn lại: two friends and the computer play a room for three", async ({
  page,
  browser,
}) => {
  const url = await createLudoRoom(page, 3);
  const lan = await openAsNewPlayer(browser, url, "Lan");
  // Only the host may give seats to the computer.
  await expect(players(lan.page)).toHaveText(["MinhChủ phòng", "Đang chờ…", "Đang chờ…"]);
  await expect(lan.page.getByRole("button", { name: /Cho máy chơi/ })).toHaveCount(0);
  await button(lan.page, "Vào chơi").click();
  await expect(players(page)).toHaveText(["Minh (bạn)Chủ phòng", "Lan", "Đang chờ…Cho máy chơi"]);

  await button(page, "Cho máy chơi ghế 3 và bắt đầu ván").click();

  for (const player of [page, lan.page]) {
    await expect(rollButton(player)).toBeVisible();
    await expect(horsePositions(player)).toHaveCount(12);
    await expect(player.getByText("Online", { exact: true })).toBeVisible();
  }
  await expect(status(page)).toHaveText("Ván mới: bạn cầm Đỏ và đi trước");
  await expect(status(lan.page)).toHaveText("Ván mới: bạn cầm Xanh dương, Minh đi trước");

  for (let round = 0; round < 2; round += 1) {
    await playOnlineTurn(page);
    await playOnlineTurn(lan.page);
    // The computer plays by itself, each of its moves told, then it is Minh's turn again.
    await expect(status(page)).toHaveText(/^Máy .+\. Đến lượt bạn \(Đỏ\)$/, {
      timeout: AI_TURNS_TIMEOUT,
    });
    await expect(status(lan.page)).toHaveText(/^Máy .+\. Đang chờ Minh…$/, {
      timeout: AI_TURNS_TIMEOUT,
    });
    // Both browsers end on the same horses.
    await expect(horsePositions(lan.page)).toHaveText(await horsePositions(page).allTextContents());
  }

  // A reload shows the latest state at once, nothing played again.
  const positions = await horsePositions(lan.page).allTextContents();
  const said = (await status(lan.page).textContent()) ?? "";
  await lan.page.reload();
  await expect(horsePositions(lan.page)).toHaveText(positions);
  await expect(status(lan.page)).toHaveText(said);

  await lan.context.close();
});

/** Creates a Cờ cá ngựa room for three as Minh, in a browser of its own. */
async function createLudoRoomElsewhere(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await createLudoRoom(page, 3);
  return { context, page };
}

test("Hai tab chưa có tên cùng vào một phòng: each tab keeps its own seat after the network comes back and a reload", async ({
  page,
  browser,
}) => {
  const minh = await createLudoRoomElsewhere(browser);
  // Two tabs of one browser that never played online: one storage, two room pages.
  const first = page;
  const second = await page.context().newPage();
  for (const tab of [first, second]) {
    await tab.goto(minh.page.url());
    await expect(players(tab)).toHaveText(["MinhChủ phòng", "Đang chờ…", "Đang chờ…"]);
  }

  await giveNameInLobby(first, "Lan");
  await button(first, "Vào chơi").click();
  await expect(players(first)).toHaveText(["MinhChủ phòng", "Lan (bạn)", "Đang chờ…"]);
  // The second tab was asked before the first one chose: its field is still empty.
  await giveNameInLobby(second, "An");
  await button(second, "Vào chơi").click();

  for (const tab of [first, second, minh.page]) await expect(rollButton(tab)).toBeVisible();
  const panel = (tab: Page) => tab.getByRole("list", { name: "Người chơi" }).getByRole("listitem");
  /** Each tab sits in its own seat, and Minh sees both names. */
  async function expectOwnSeats() {
    await expect(panel(first).nth(1)).toContainText("Bạn ·");
    await expect(panel(first).nth(2)).toContainText("An ·");
    await expect(panel(second).nth(1)).toContainText("Lan ·");
    await expect(panel(second).nth(2)).toContainText("Bạn ·");
    await expect(panel(minh.page).nth(1)).toContainText("Lan ·");
    await expect(panel(minh.page).nth(2)).toContainText("An ·");
  }
  await expectOwnSeats();

  // Both tabs lose the network, then reconnect: each greets as itself, not as the remembered one.
  await page.context().setOffline(true);
  for (const tab of [first, second]) await expect(tab.getByText("Đang kết nối lại…")).toBeVisible();
  await page.context().setOffline(false);
  for (const tab of [first, second]) {
    await expect(tab.getByText("Đang kết nối lại…")).toHaveCount(0, { timeout: 15_000 });
  }

  await expectOwnSeats();
  await expect(status(first)).toHaveText(/^Ván mới: bạn cầm .+, Minh đi trước$/);
  await expect(status(second)).toHaveText(/^Ván mới: bạn cầm .+, Minh đi trước$/);

  // The second tab reloads: the browser remembers Lan, but the tab still is An, in An's seat.
  await second.reload();
  await expect(rollButton(second)).toBeVisible();
  await expectOwnSeats();

  await minh.context.close();
});

test("Một người với ba máy: plays a room for four alone with three computers", async ({ page }) => {
  await createLudoRoom(page, 4);

  await button(page, "Cho máy chơi ghế 2").click();
  await expect(button(page, "Bỏ máy ở ghế 2")).toBeVisible();
  await button(page, "Cho máy chơi ghế 3").click();
  await expect(button(page, "Bỏ máy ở ghế 3")).toBeVisible();
  await expect(players(page)).toHaveText([
    "Minh (bạn)Chủ phòng",
    "MáyBỏ máy",
    "MáyBỏ máy",
    "Đang chờ…Cho máy chơi",
  ]);
  await button(page, "Cho máy chơi ghế 4 và bắt đầu ván").click();

  await expect(rollButton(page)).toBeVisible();
  await expect(page.getByText("Online", { exact: true })).toBeVisible();
  await expect(page.getByText(/Với máy/)).toHaveCount(0);
  await expect(button(page, "Hoàn tác")).toHaveCount(0);
  await expect(status(page)).toHaveText("Ván mới: bạn cầm Đỏ và đi trước");

  for (let round = 0; round < 2; round += 1) {
    await playOnlineTurn(page);
    await expect(status(page)).toHaveText(/^Máy \(Xanh lá\) .+\. Đến lượt bạn \(Đỏ\)$/, {
      timeout: AI_TURNS_TIMEOUT,
    });
  }
});

test("tells a tab older than the server that the app was updated, and does not reload by itself", async ({
  page,
}) => {
  // The tab greets with the protocol before AI seats, as one left open across the deploy would.
  let sockets = 0;
  await page.routeWebSocket(/\/api\/realtime$/, (socket) => {
    sockets += 1;
    const server = socket.connectToServer();
    socket.onMessage((message) => {
      const data = JSON.parse(String(message)) as { type?: string };
      server.send(JSON.stringify(data.type === "join" ? { ...data, protocol: 1 } : data));
    });
  });
  let loads = 0;
  page.on("load", () => {
    loads += 1;
  });
  // The page's timers run on a clock the test moves, so a minute passes at once.
  await page.clock.install();

  // A stranger: the page greets at once, without a name.
  await page.goto("/room/ABC234");

  await expect(page.getByRole("heading", { name: "Ứng dụng vừa được cập nhật" })).toBeVisible();
  await expect(button(page, "Tải lại trang")).toBeVisible();
  // A minute later nothing has reloaded the page nor reconnected: only the button would.
  await page.clock.runFor(60_000);
  expect(sockets).toBe(1);
  expect(loads).toBe(1);
  await expect(page.getByRole("heading", { name: "Ứng dụng vừa được cập nhật" })).toBeVisible();
});
