import { expect, test } from "@playwright/test";

import {
  board,
  cell,
  choose,
  continueSection,
  countMarks,
  horseChoices,
  LUDO_FOUR_CHOICES,
  ludoRecord,
  MENU_HEADING,
  nameField,
  openFakeRoom,
  PAGE_WITHOUT_STORAGE,
  play,
  players,
  playFirstEmptyCell,
  pressStart,
  rollButton,
  ROOM_URL,
  savedLudoGame,
  startAiGame,
  startLocalGame,
  status,
  writeSaved,
} from "../e2e/helpers";
import { shoot } from "./shoot";

// The key screens, each in every project of playwright.shots.config.ts (phone and desktop, light
// and dark). The numbers keep the files in the order a player meets the screens.

test("menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: MENU_HEADING })).toBeVisible();
  await shoot(page, "01-menu");
});

test("menu with a game in progress, and at 360 px", async ({ page }) => {
  await startLocalGame(page);
  await play(page, [2, 2]);
  await page.goto("/");
  await expect(continueSection(page)).toBeVisible();
  await shoot(page, "01b-menu-continue");

  await page.setViewportSize({ width: 360, height: 780 });
  await shoot(page, "01c-menu-360");
});

for (const locale of ["en", "ja"] as const) {
  test(`menu in ${locale} at 360 px`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL ?? "" }]);
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await shoot(page, `01e-menu-360-${locale}`);
  });
}

test("menu with the dark theme picked on a light system", async ({ page, context, baseURL }) => {
  // Both dark blocks of styles.css must match: this one is chosen by the player, not the system.
  await context.addCookies([{ name: "theme", value: "dark", url: baseURL ?? "" }]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await shoot(page, "01d-menu-theme-dark");
});

test("setup screens", async ({ page }) => {
  await page.goto("/play/tictactoe");
  await expect(page.getByRole("group", { name: "Chế độ" })).toBeVisible();
  await shoot(page, "02-setup-tictactoe");

  await page.goto("/play/caro");
  await expect(page.getByRole("group", { name: "Chế độ" })).toBeVisible();
  await shoot(page, "03-setup-caro");

  await page.goto("/play/ludo");
  await choose(page, "Số người chơi", "4 người");
  await shoot(page, "04-setup-ludo");

  // The menu's "Online": the mode chosen by the address.
  await page.goto("/play/caro?mode=online");
  await expect(page.getByRole("button", { name: "Tạo phòng" })).toBeVisible();
  await shoot(page, "04b-setup-caro-online");
});

test("loading, joining and not found screens", async ({ page }) => {
  // Saved games that never answer: the play screen stays on "loading" (until the store times out).
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      value: { open: () => ({}) },
      configurable: true,
    });
  });
  await page.goto("/play/tictactoe/local");
  await expect(status(page)).toHaveText("Đang tải…");
  await shoot(page, "14-play-loading");

  await page.goto("/play/khong-co");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shoot(page, "15-game-not-found");

  await page.goto("/khong-co-trang-nay");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shoot(page, "16-page-not-found");
});

test("a room whose server cannot be reached", async ({ page }) => {
  // The realtime server never answers: "joining", then after 10 s "still trying".
  await page.routeWebSocket("**/api/realtime", () => {
    // Never connected to the server, nor answered.
  });
  await page.goto("/room/ABC234");
  await expect(status(page)).toHaveText("Đang vào phòng…");
  await shoot(page, "17-room-joining");

  await expect(status(page)).toHaveText(/Chưa kết nối được máy chủ/, { timeout: 15_000 });
  await shoot(page, "18-room-slow");
});

test("tic-tac-toe on one device, in progress then won", async ({ page }) => {
  await startLocalGame(page);
  await play(page, [1, 1], [2, 1], [1, 2], [2, 2]);
  await expect(status(page)).toHaveText("Đến lượt X");
  await shoot(page, "05-tictactoe-playing");

  await play(page, [1, 3]);
  await expect(status(page)).toHaveText("X thắng!");
  await shoot(page, "06-tictactoe-won");
});

test("tic-tac-toe: a draw, and a win with reduced motion", async ({ page }) => {
  await startLocalGame(page);
  // X O X / X O O / O X X
  await play(page, [1, 1], [1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]);
  await expect(status(page)).toHaveText("Hoà!");
  await shoot(page, "06b-tictactoe-draw");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Ván mới" }).click();
  await play(page, [1, 1], [2, 1], [1, 2], [2, 2], [1, 3]);
  await expect(status(page)).toHaveText("X thắng!");
  await shoot(page, "06d-tictactoe-won-reduced-motion");
});

for (const [name, cells] of [
  [
    "06e-tictactoe-won-column",
    [
      [1, 2],
      [1, 1],
      [2, 2],
      [2, 1],
      [3, 2],
    ],
  ],
  [
    "06f-tictactoe-won-diagonal",
    [
      [1, 1],
      [1, 2],
      [2, 2],
      [1, 3],
      [3, 3],
    ],
  ],
  [
    "06g-tictactoe-won-anti-diagonal",
    [
      [1, 1],
      [1, 3],
      [1, 2],
      [2, 2],
      [3, 3],
      [3, 1],
    ],
  ],
  [
    "06h-tictactoe-won-two-lines",
    [
      [1, 1],
      [1, 2],
      [1, 3],
      [2, 1],
      [3, 1],
      [2, 3],
      [3, 3],
      [3, 2],
      [2, 2],
    ],
  ],
] as const) {
  test(`tic-tac-toe won: ${name}`, async ({ page }) => {
    await startLocalGame(page);
    await play(page, ...cells);
    await expect(status(page)).toHaveText(/thắng!$/);
    await shoot(page, name);
  });
}

test("tic-tac-toe against the AI, played to its end", async ({ page }) => {
  await startAiGame(page, { level: "Khó", first: "Máy" });
  await expect.poll(() => countMarks(page, "X")).toBe(1);
  for (let turn = 0; turn < 4; turn += 1) {
    const moves = await countMarks(page, "O");
    await playFirstEmptyCell(page);
    await expect.poll(() => countMarks(page, "O")).toBe(moves + 1);
    await expect(status(page)).toHaveText(/Đến lượt bạn \(O\)$|^(Bạn thắng!|Máy thắng!|Hoà!)$/);
    if ((await status(page).textContent())?.endsWith("(O)") !== true) break;
  }
  await expect(status(page)).toHaveText(/^(Bạn thắng!|Máy thắng!|Hoà!)$/);
  await shoot(page, "06c-tictactoe-ai-over");
});

test("Cờ caro against the AI, while it thinks", async ({ page }) => {
  // The page's clock is held once the player has moved, so the AI's answer never shows.
  await page.clock.install();
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Đấu với máy");
  await pressStart(page);
  await expect(status(page)).toHaveText("Đến lượt bạn (X)");
  await expect(page).toHaveURL(/\/play\/caro\/ai$/);
  await page.clock.pauseAt(Date.now() + 1000);
  await play(page, [8, 8]);
  await expect(status(page)).toHaveText("Máy đang nghĩ…");
  await shoot(page, "07e-caro-ai-thinking");
});

test("Cờ caro on one device, in progress then won", async ({ page }) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Cùng máy");
  await pressStart(page);
  await expect(board(page)).toBeVisible();
  await play(page, [8, 4], [10, 4], [8, 5], [10, 5], [8, 6], [10, 6], [8, 7], [10, 7]);
  await expect(status(page)).toHaveText("Đến lượt X");
  await shoot(page, "07-caro-playing");

  // The focus ring by keyboard, on a corner cell (drawn outside the frame) and in the middle.
  await cell(page, 1, 2).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(cell(page, 1, 1)).toBeFocused();
  await shoot(page, "07b-caro-focus-corner");
  await cell(page, 8, 9).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(cell(page, 8, 8)).toBeFocused();
  await shoot(page, "07c-caro-focus-middle");

  // The last move's dashed circle with the focus ring around its cell.
  await cell(page, 10, 8).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(cell(page, 10, 7)).toBeFocused();
  await shoot(page, "07d-caro-focus-last-move");

  await play(page, [8, 8]);
  await expect(status(page)).toHaveText("X thắng!");
  await shoot(page, "08-caro-won");
});

for (const [name, xs] of [
  [
    "08d-caro-won-corner",
    [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ],
  ],
  [
    "08e-caro-won-top-row",
    [
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
      [1, 7],
    ],
  ],
] as const) {
  test(`Cờ caro won along an edge: ${name}`, async ({ page }) => {
    // The loop around the winning line runs past the grid onto the frame, not cut off.
    await page.goto("/play/caro");
    await choose(page, "Chế độ", "Cùng máy");
    await pressStart(page);
    await expect(board(page)).toBeVisible();
    for (const [index, x] of xs.entries()) {
      await play(page, x);
      if (index < xs.length - 1) await play(page, [10, 1 + 2 * index]);
    }
    await expect(status(page)).toHaveText("X thắng!");
    await shoot(page, name);
  });
}

test("Cờ caro 19×19 on one device, and its stone preview at 360 px", async ({ page }) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Cùng máy");
  await choose(page, "Bàn cờ", "19×19");
  await pressStart(page);
  await expect(board(page)).toBeVisible();
  await play(page, [10, 10], [10, 11], [9, 10], [11, 9]);
  await shoot(page, "08b-caro-19-playing");

  // A finger on cells under 24 px: the first tap shows the stone it would place, dashed.
  test.skip(test.info().project.use.hasTouch !== true, "a tap needs a touch screen");
  await page.setViewportSize({ width: 360, height: 780 });
  await cell(page, 8, 8).tap();
  await expect(page.getByText("Chạm lần nữa để đặt quân")).toBeVisible();
  await shoot(page, "08c-caro-19-preview-360");
});

test("Cờ cá ngựa for four on one device, a choice of horses to make", async ({ page }) => {
  // Every colour has a horse out, and Red has just rolled a 6: a list of choices on the board.
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(
    page,
    "ludo:local",
    savedLudoGame(4, [
      { roll: 6 },
      { horse: 0 },
      { roll: 4 },
      { horse: 0 },
      { roll: 6 },
      { horse: 0 },
      { roll: 5 },
      { horse: 0 },
      { roll: 6 },
      { horse: 0 },
      { roll: 3 },
      { horse: 0 },
      { roll: 6 },
      { horse: 0 },
      { roll: 2 },
      { horse: 0 },
      { roll: 6 },
    ]),
  );
  await page.goto("/play/ludo/local");
  await expect(rollButton(page)).toBeVisible();
  await expect(horseChoices(page).first()).toBeVisible();
  // Choosing a horse after a 6: the die shows it in Red, the roll button is locked.
  await shoot(page, "09-ludo-playing");

  await page.setViewportSize({ width: 360, height: 780 });
  await shoot(page, "09c-ludo-choosing-360");
});

test("Cờ cá ngựa for four, waiting for the next player's roll", async ({ page }) => {
  // Red has just moved after a 4: Blue is to roll, the roll before shown beside the die.
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(
    page,
    "ludo:local",
    savedLudoGame(4, [
      { roll: 6 },
      { horse: 0 },
      { roll: 6 },
      { horse: 0 },
      { roll: 4 },
      { horse: 0 },
    ]),
  );
  await page.goto("/play/ludo/local");
  await expect(page.getByRole("img", { name: "Xúc xắc: Xanh dương sắp gieo" })).toBeVisible();
  await shoot(page, "09b-ludo-next-to-roll");
});

test("Cờ cá ngựa for four, four horses to choose from", async ({ page }) => {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "ludo:local", savedLudoGame(4, LUDO_FOUR_CHOICES));
  await page.goto("/play/ludo/local");
  await expect(horseChoices(page)).toHaveCount(4);
  await shoot(page, "09d-ludo-four-choices");
});

test("an online Cờ cá ngựa game, then the connection lost", async ({ page }) => {
  const room = await openFakeRoom(page, {
    gameId: "ludo",
    seats: [
      { kind: "human", name: "Lan" },
      { kind: "human", name: "Minh" },
      { kind: "ai" },
      { kind: "ai" },
    ],
    record: ludoRecord(4, LUDO_FOUR_CHOICES),
  });
  await expect(horseChoices(page)).toHaveCount(4);
  await shoot(page, "19-online-ludo-playing");

  await room.loseConnection();
  await expect(page.getByText("Đang kết nối lại…")).toBeVisible();
  await shoot(page, "19b-online-ludo-connection-lost");
});

for (const locale of ["vi", "en", "ja"] as const) {
  test(`an online Cờ cá ngựa game on a narrow phone, in ${locale}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL ?? "" }]);
    const room = await openFakeRoom(page, {
      gameId: "ludo",
      seats: [
        { kind: "human", name: "Lan" },
        { kind: "human", name: "Minh" },
        { kind: "ai" },
        { kind: "ai" },
      ],
      record: ludoRecord(4, LUDO_FOUR_CHOICES),
    });
    await expect(page.locator("[data-ludo-choice]")).toHaveCount(4);
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 780 });
      await shoot(page, `19c-online-ludo-${width}-${locale}`);
    }
    await room.loseConnection();
    await expect(page.locator("[data-player='0']")).toContainText(
      { vi: "Mất kết nối", en: "Disconnected", ja: "接続切れ" }[locale],
    );
    await shoot(page, `19d-online-ludo-lost-${locale}`);
  });
}

test("the reason undo cannot be pressed, beside the board", async ({ page }) => {
  await startLocalGame(page);
  await page.getByRole("button", { name: "Hoàn tác" }).focus();
  await expect(page.getByText("Chưa có nước nào để hoàn tác")).toBeVisible();
  await shoot(page, "05b-tictactoe-undo-reason");
});

test("room lobby of a Cờ cá ngựa room for four", async ({ page }) => {
  await page.goto("/play/ludo");
  await choose(page, "Chế độ", "Online");
  await choose(page, "Số người chơi", "4 người");
  await nameField(page).fill("Minh");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  await expect(players(page)).toHaveCount(4);
  await shoot(page, "10-room-lobby");
});

test("room lobby asking a first-time visitor for a name", async ({ page, browser }) => {
  // Minh creates the room in a browser of his own; the shots are of the visitor opening the link,
  // who is asked for a name only now, in the lobby (change `ask-name-in-lobby`).
  const context = await browser.newContext();
  const host = await context.newPage();
  await host.goto("/play/tictactoe");
  await choose(host, "Chế độ", "Online");
  await nameField(host).fill("Minh");
  await host.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(host).toHaveURL(ROOM_URL);

  await page.goto(host.url());
  await expect(nameField(page)).toBeFocused();
  await shoot(page, "11-room-lobby-ask-name");

  await page.getByRole("button", { name: "Vào chơi" }).click();
  await expect(nameField(page)).toHaveAttribute("aria-invalid", "true");
  await shoot(page, "11b-room-lobby-name-refused");
  await context.close();
});

test("a room that does not exist, as a first-time visitor", async ({ page }) => {
  // Said at once: nothing is asked before.
  await page.goto("/room/ABC234");
  await expect(page.getByRole("heading", { name: "Không tìm thấy phòng" })).toBeVisible();
  await shoot(page, "12-room-not-found");
});

test("Cờ cá ngựa before the first roll", async ({ page }) => {
  // A new game: the die waits for its first roll.
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "ludo:local", savedLudoGame(4, []));
  await page.goto("/play/ludo/local");
  await expect(rollButton(page)).toBeVisible();
  await expect(page.getByRole("img", { name: "Xúc xắc: Đỏ sắp gieo" })).toBeVisible();
  await shoot(page, "13-ludo-first-roll");

  // A roll (random: with no horse out, any number but 6 loses the turn): the die tumbling in Red's
  // frame, then at rest waiting for the next player, the roll before beside it.
  await rollButton(page).click();
  await shoot(page, "13b-ludo-rolling");
  await expect(page.locator("[data-ludo-hint]")).toHaveText(/gieo được [1-6]/);
  await page.waitForTimeout(600);
  await shoot(page, "13c-ludo-after-roll");
});
