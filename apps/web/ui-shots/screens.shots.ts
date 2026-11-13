import {
  applyEntry,
  createSession,
  currentState,
  type GameRecord,
  sessionResult,
  toRecord,
} from "@board-games/engine";
import { type FenceRaceMove, ludo, LUDO_DEFAULT_OPTIONS } from "@board-games/games";
import type { JellyCrewMapId } from "@board-games/games/jelly-crew";
import type { ChatBody } from "@board-games/protocol";
import { expect, type Page, test } from "@playwright/test";

import {
  board,
  CARD_SCORE_LONG_NAMES,
  cell,
  chessRecord,
  chessSquare,
  choose,
  continueSection,
  countMarks,
  createCardGroup,
  crewBoard,
  enterRound,
  fenceCell,
  fenceFrame,
  fenceMode,
  fencePreview,
  fenceRaceRecord,
  horseChoices,
  JELLY_CREW_KITCHEN_TWO,
  jellyCrewRecord,
  longChessGame,
  LUDO_FOUR_CHOICES,
  ludoRecord,
  MENU_HEADING,
  nameField,
  openFakeRoom,
  PAGE_WITHOUT_STORAGE,
  play,
  playChess,
  players,
  playFirstEmptyCell,
  pressStart,
  rollButton,
  ROOM_URL,
  savedChessGame,
  savedFenceRaceGame,
  savedJellyCrewGame,
  savedLudoGame,
  startAiGame,
  startLocalGame,
  status,
  tryFenceAt,
  writeSaved,
} from "../e2e/helpers";
import { SOLUTIONS as JELLY_SOLUTIONS } from "../src/puzzles/jelly-gather/levels.solutions";
import { shoot, shootScreen } from "./shoot";

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

  await page.goto("/play/chess");
  await expect(page.getByRole("group", { name: "Chế độ" })).toBeVisible();
  await shoot(page, "03b-setup-chess");

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
  // From the page's own clock: Node's may already be behind it.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
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

  // The rules of the next game, changed from the result card (change `add-new-game-options`).
  await page.getByRole("button", { name: "Đổi bàn, luật" }).click();
  await page
    .getByRole("dialog", { name: "Đổi bàn, luật" })
    .getByText("19×19", { exact: true })
    .click();
  await shoot(page, "08k-caro-change-options");
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

// --- Cờ caro on the board that grows (change `add-caro-infinite-board`) ---------------------------

test("Cờ caro on the board that grows: start, grown, zoomed out, won, and its preview at 360 px", async ({
  page,
}) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Cùng máy");
  await choose(page, "Bàn cờ", "Vô hạn");
  await pressStart(page);
  await expect(page).toHaveURL(/\/play\/caro\/local$/u);
  await expect(board(page)).toBeVisible();
  await shoot(page, "08f-caro-infinite-start");

  // X climbs a diagonal to the top left: the area grows above and to the left of the start.
  await play(page, [31, 31], [31, 32], [30, 30], [32, 32], [29, 29], [31, 33], [28, 28], [30, 34]);
  await shoot(page, "08g-caro-infinite-grown");
  await page.getByRole("button", { name: "Thu nhỏ bàn" }).click();
  await page.getByRole("button", { name: "Thu nhỏ bàn" }).click();
  await shoot(page, "08h-caro-infinite-zoomed-out");
  await play(page, [27, 27]);
  await expect(status(page)).toHaveText("X thắng!");
  await shoot(page, "08i-caro-infinite-won");

  test.skip(test.info().project.use.hasTouch !== true, "a tap needs a touch screen");
  // The game is over: a new game starts at once, with the same board.
  await page.getByRole("button", { name: "Ván mới" }).first().click();
  await page.setViewportSize({ width: 360, height: 780 });
  await cell(page, 31, 31).tap();
  await expect(page.getByText("Chạm lần nữa để đặt quân")).toBeVisible();
  await shoot(page, "08j-caro-infinite-preview-360");
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
      { kind: "human", name: "Lan", standIn: false },
      { kind: "human", name: "Minh", standIn: false },
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
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
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

  // A roll (random: with no horse out, any number but 6 loses the turn), once its throw is over:
  // the die at rest, waiting for the next player, the roll before beside it.
  await rollButton(page).click();
  await expect(page.locator('[data-throw="3d"]')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator("[data-ludo-hint]")).toHaveText(/gieo được [1-6]/);
  await page.waitForTimeout(600);
  await shoot(page, "13c-ludo-after-roll");
});

test("Cờ cá ngựa: the throw of the 3D die, held, flying, at rest", async ({ page }) => {
  // Time stands still between the shots (`page.clock`): the die is where the throw has it.
  await page.clock.install();
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "ludo:local", savedLudoGame(4, []));
  await page.goto("/play/ludo/local");
  await expect(rollButton(page)).toBeVisible();
  // The 3D die loads while the page is idle.
  await expect(async () => {
    await page.clock.runFor(500);
    await expect(rollButton(page)).toHaveAttribute("data-dice", "3d", { timeout: 200 });
  }).toPass({ timeout: 20_000 });
  await page.clock.runFor(2000);

  const overlay = page.locator('[data-throw="3d"]');
  const box = await rollButton(page).boundingBox();
  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + 20);
  await page.mouse.down();
  await page.clock.runFor(900);
  await expect(overlay).toHaveAttribute("data-phase", "hold");
  await shootScreen(page, "13d-ludo-holding");

  await page.mouse.up();
  await page.clock.runFor(450);
  await expect(overlay).toHaveAttribute("data-phase", "fly");
  await shootScreen(page, "13e-ludo-flying");

  await expect(async () => {
    await page.clock.runFor(100);
    await expect(overlay).toHaveAttribute("data-phase", "rest", { timeout: 100 });
  }).toPass({ timeout: 10_000 });
  await shootScreen(page, "13f-ludo-result");
});

test("Cờ cá ngựa: a horse to choose previewed, its square and the horse it would kick", async ({
  page,
}) => {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "ludo:local", savedLudoGame(4, LUDO_FOUR_CHOICES));
  await page.goto("/play/ludo/local");
  await expect(horseChoices(page)).toHaveCount(4);
  // From the keyboard on every device: the first horse to choose, focused, previewed.
  await horseChoices(page).first().focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("[data-target]")).toHaveCount(1);
  await shoot(page, "09e-ludo-preview");

  await page.setViewportSize({ width: 360, height: 780 });
  await shoot(page, "09f-ludo-preview-360");
});

/** Opens a same-device Cờ vua game saved with `moves` (UCI). */
async function openChess(page: Page, moves: readonly string[]): Promise<void> {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "chess:local", savedChessGame(moves));
  await page.goto("/play/chess/local");
  await expect(board(page)).toBeVisible();
}

// 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+
const CHESS_CHECK = [
  "e2e4",
  "e7e5",
  "g1f3",
  "b8c6",
  "f1c4",
  "f8c5",
  "c2c3",
  "g8f6",
  "d2d4",
  "e5d4",
  "c3d4",
  "c5b4",
];

test("Cờ vua on one device: the start, a knight selected, a capture to make", async ({ page }) => {
  await openChess(page, []);
  await shoot(page, "20-chess-start");

  // 1. e4 d5: the pawn on e4 may take on d5 or go to e5; then the knight on g1.
  await openChess(page, ["e2e4", "d7d5", "g1f3", "a7a6"]);
  await chessSquare(page, "e4").click();
  await expect(page.getByText("Đã chọn Tốt e4: đi được e5, ăn d5")).toBeVisible();
  await shoot(page, "20b-chess-selected");
});

test("Cờ vua: White in check, then the promotion picker", async ({ page }) => {
  await openChess(page, CHESS_CHECK);
  await expect(page.getByText("Chiếu!")).toBeVisible();
  await shoot(page, "20c-chess-check");

  await openChess(page, ["a2a4", "b7b5", "a4b5", "a7a6", "b5a6", "c8b7", "a6b7", "b8c6"]);
  await playChess(page, "b7b8");
  await expect(page.getByRole("dialog", { name: "Tốt b7 → b8" })).toBeVisible();
  await shoot(page, "20d-chess-promotion");
});

test("Cờ vua: checkmate, a long score sheet, and the claim of a draw", async ({ page }) => {
  await openChess(page, ["f2f3", "e7e5", "g2g4"]);
  await playChess(page, "d8h4");
  await expect(status(page)).toHaveText("Đen thắng!");
  await shoot(page, "20e-chess-checkmate");

  await openChess(page, longChessGame(120));
  await shoot(page, "20f-chess-long-sheet");

  await openChess(page, ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"]);
  await expect(page.getByRole("button", { name: "Đòi hoà" })).toBeVisible();
  await shoot(page, "20i-chess-claim");
});

test("Cờ vua at 360 px, and the focus beside a selected square", async ({ page }) => {
  await openChess(page, ["e2e4", "e7e5"]);
  await page.setViewportSize({ width: 360, height: 780 });
  await shoot(page, "20g-chess-360");

  // The focus on a dark square next to the selected knight, then on the last move's square.
  await chessSquare(page, "g1").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowLeft");
  await expect(chessSquare(page, "f1")).toBeFocused();
  await shoot(page, "20h-chess-focus");
  await page.keyboard.press("Escape");
  await chessSquare(page, "e6").focus();
  await page.keyboard.press("ArrowDown");
  await expect(chessSquare(page, "e5")).toBeFocused();
  await shoot(page, "20h2-chess-focus-last-move");
});

test("an online Cờ vua game, holding Black", async ({ page }) => {
  await openFakeRoom(
    page,
    {
      gameId: "chess",
      seats: [
        { kind: "human", name: "Minh", standIn: false },
        { kind: "human", name: "Lan", standIn: false },
      ],
      record: chessRecord(["e2e4", "e7e5", "g1f3"]),
    },
    1,
  );
  await expect(board(page)).toBeVisible();
  await expect(page.getByRole("group", { name: "Bạn · Đen" })).toBeVisible();
  await shoot(page, "21-online-chess-black");
});

// --- Resigning and a player gone too long (change `add-resign-and-abandon`) ---------------------

const MINH_AND_LAN = [
  { kind: "human", name: "Lan", standIn: false },
  { kind: "human", name: "Minh", standIn: false },
] as const;

/** An online Cờ vua game seen by Lan (White), the turn running for `turnIdleMs`. */
async function openOnlineChess(page: Page, moves: readonly string[], turnIdleMs: number) {
  await openFakeRoom(page, {
    gameId: "chess",
    seats: [...MINH_AND_LAN],
    record: chessRecord(moves),
    turnIdleMs,
  });
  await expect(board(page)).toBeVisible();
}

/**
 * A Cờ cá ngựa game for three that the first seat wins, every die chosen: it rolls the face that
 * lets it move (a 6 first, so it plays again), the others roll a 1 and pass.
 */
function ludoWonByFirstSeat(): GameRecord {
  const created = createSession(ludo, { playerCount: 3, options: LUDO_DEFAULT_OPTIONS });
  if (!created.ok) throw new Error(created.error);
  let session = created.value;
  for (let step = 0; step < 3000 && sessionResult(ludo, session) === null; step += 1) {
    const state = currentState(session);
    const moves = ludo.legalMoves(state);
    const roll = moves.find((move) => move.type === "roll");
    let entry: unknown;
    if (roll === undefined) {
      entry = { move: moves.at(-1) };
    } else if (ludo.currentPlayer(state) !== 0) {
      entry = { move: roll, outcome: 1 };
    } else {
      const face = [6, 5, 4, 3, 2, 1].find((candidate) => {
        const rolled = applyEntry(ludo, session, { move: roll, outcome: candidate });
        return (
          rolled.ok && ludo.legalMoves(currentState(rolled.value)).some((m) => m.type !== "roll")
        );
      });
      entry = { move: roll, outcome: face ?? 1 };
    }
    const played = applyEntry(ludo, session, entry);
    if (!played.ok) throw new Error(`step ${String(step)}: ${played.error}`);
    session = played.value;
  }
  if (sessionResult(ludo, session) === null) throw new Error("the first seat never won");
  return JSON.parse(JSON.stringify(toRecord(session))) as GameRecord;
}

test("an online Cờ vua game: resigning, waiting for Minh, claiming the win", async ({ page }) => {
  await openOnlineChess(page, ["e2e4", "e7e5"], 0);
  await page.getByRole("button", { name: "Đầu hàng" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await shoot(page, "22-online-chess-resign-dialog");
});

test("an online Cờ vua game, Minh gone for 2 minutes", async ({ page }) => {
  await openOnlineChess(page, ["e2e4"], 2 * 60_000 + 13_000);
  await expect(page.getByText(/^Minh chưa đi · 2:1\d$/u)).toBeVisible();
  await shoot(page, "22b-online-chess-waiting");
});

test("an online Cờ vua game, Minh gone for 5 minutes", async ({ page }) => {
  await openOnlineChess(page, ["e2e4"], 5 * 60_000 + 4000);
  await expect(page.getByRole("button", { name: "Xử thắng" })).toBeVisible();
  await shoot(page, "22c-online-chess-claim");
  await page.getByRole("button", { name: "Xử thắng" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await shoot(page, "22c2-online-chess-claim-dialog");
});

test("an online Cờ vua game won as Minh left it", async ({ page }) => {
  await openFakeRoom(page, {
    gameId: "chess",
    seats: [...MINH_AND_LAN],
    record: { ...chessRecord(["e2e4"]), ending: { reason: "abandoned", player: 1 } },
  });
  await expect(status(page)).toHaveText("Bạn thắng!");
  await shoot(page, "22d-online-chess-abandoned");
});

test("an online Cờ cá ngựa game, the computer playing for Minh", async ({ page }) => {
  await openFakeRoom(
    page,
    {
      gameId: "ludo",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: true },
        { kind: "human", name: "An", standIn: false },
      ],
      record: ludoRecord(3, [{ roll: 3 }, { roll: 3 }]),
      turnIdleMs: 0,
    },
    2,
  );
  await expect(status(page)).toHaveText(/^Máy \(thay Minh\) gieo được 3/u);
  await shoot(page, "23-online-ludo-stand-in");
});

test("an online Cờ cá ngựa game, the player to move reminded", async ({ page }) => {
  await openFakeRoom(
    page,
    {
      gameId: "ludo",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
        { kind: "human", name: "An", standIn: false },
      ],
      record: ludoRecord(3, []),
      turnIdleMs: 4 * 60_000 + 18_000,
    },
    0,
  );
  await expect(page.getByText(/^Còn 0:4\d\./u)).toBeVisible();
  await shoot(page, "23b-online-ludo-mover-warning");
});

test("an online Cờ cá ngựa game the computer won for Lan", async ({ page }) => {
  await openFakeRoom(page, {
    gameId: "ludo",
    seats: [
      { kind: "human", name: "Lan", standIn: true },
      { kind: "human", name: "Minh", standIn: false },
      { kind: "human", name: "An", standIn: false },
    ],
    record: ludoWonByFirstSeat(),
  });
  await expect(status(page)).toHaveText("Máy (thay Lan) thắng!");
  await shoot(page, "23c-online-ludo-stand-in-won");
});

test("tic-tac-toe against the AI: resigning", async ({ page }) => {
  await startAiGame(page);
  await play(page, [2, 2]);
  await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/u);
  await page.getByRole("button", { name: "Đầu hàng" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await shoot(page, "24-ai-resign-dialog");
  await page.getByRole("dialog").getByRole("button", { name: "Đầu hàng" }).click();
  await expect(status(page)).toHaveText("Máy thắng!");
  await shoot(page, "24b-ai-resigned");
});

for (const [gameId, screen, title] of [
  ["tictactoe", "25-rules-tictactoe", "Luật chơi Tic-tac-toe"],
  ["caro", "25b-rules-caro", "Luật chơi Cờ caro"],
  ["ludo", "25c-rules-ludo", "Luật chơi Cờ cá ngựa"],
  ["chess", "25d-rules-chess", "Luật chơi Cờ vua"],
] as const) {
  test(`the rules page of ${gameId}`, async ({ page }) => {
    await page.goto(`/rules/${gameId}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await shoot(page, screen);
  });
}

test("the rules dialog of a game of Cờ caro 19×19", async ({ page }) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Cùng máy");
  await choose(page, "Bàn cờ", "19×19");
  await choose(page, "Luật thắng", "Tự do");
  await pressStart(page);
  await play(page, [10, 10], [10, 11]);
  await page.getByRole("button", { name: "Luật chơi" }).click();
  const dialog = page.getByRole("dialog", { name: "Luật chơi Cờ caro" });
  await expect(dialog.getByRole("heading", { level: 3, name: "Luật “tự do”" })).toBeVisible();
  await shoot(page, "25e-rules-dialog-caro");
});

test("the rules of Cờ vua at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/rules/chess");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shoot(page, "25f-rules-360");
});

for (const [locale, gameId, title] of [
  ["ja", "ludo", "ルドーのルール"],
  ["en", "caro", "How to play Gomoku"],
] as const) {
  test(`the rules of ${gameId} in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL ?? "" }]);
    await page.goto(`/rules/${gameId}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await shoot(page, `25g-rules-${gameId}-${locale}`);
  });
}

// --- Phones, the top bar, the settings menus, hover (change `polish-accessibility-and-mobile`) ----

/** Whether the running project is a phone's (390 × 844). */
const onPhone = () => test.info().project.name.startsWith("phone");

/** Opens a same-device game of `gameId`, saved with `saved`, or a new one from its setup screen. */
async function openLocalGame(page: Page, gameId: string, saved?: unknown): Promise<void> {
  if (saved === undefined) {
    await page.goto(`/play/${gameId}`);
    await choose(page, "Chế độ", "Cùng máy");
    await pressStart(page);
  } else {
    await page.goto(PAGE_WITHOUT_STORAGE);
    await writeSaved(page, `${gameId}:local`, saved);
    await page.goto(`/play/${gameId}/local`);
  }
  await expect(page.locator("[data-ply]").or(board(page)).first()).toBeVisible();
}

const PLAY_SCREENS = [
  ["tictactoe", undefined],
  ["caro", undefined],
  ["ludo", savedLudoGame(4, [])],
  ["chess", savedChessGame(["e2e4", "e7e5", "g1f3"])],
] as const;

for (const [gameId, saved] of PLAY_SCREENS) {
  test(`${gameId} on a phone turned sideways, 844 × 390`, async ({ page }) => {
    test.skip(!onPhone(), "a phone's layout");
    await page.setViewportSize({ width: 844, height: 390 });
    await openLocalGame(page, gameId, saved);
    await shootScreen(page, `26-landscape-${gameId}`);
  });

  test(`${gameId} on a phone of 360 × 740`, async ({ page }) => {
    test.skip(!onPhone(), "a phone's layout");
    await page.setViewportSize({ width: 360, height: 740 });
    await openLocalGame(page, gameId, saved);
    await shootScreen(page, `28-${gameId}-360`);
  });
}

test("Cờ cá ngựa sideways with Safari's address bar, 844 × 300", async ({ page }) => {
  test.skip(!onPhone(), "a phone's layout");
  await page.setViewportSize({ width: 844, height: 300 });
  await openLocalGame(page, "ludo", savedLudoGame(4, LUDO_FOUR_CHOICES));
  await shootScreen(page, "26b-landscape-ludo-300");
});

test("Cờ vua on a phone of 360 × 640, then scrolled to its end", async ({ page }) => {
  test.skip(!onPhone(), "a phone's layout");
  await page.setViewportSize({ width: 360, height: 640 });
  await openLocalGame(page, "chess", savedChessGame(["e2e4", "e7e5", "g1f3"]));
  await shootScreen(page, "28b-chess-360x640");
  await page.getByRole("button", { name: "Ván mới" }).scrollIntoViewIfNeeded();
  await shootScreen(page, "28c-chess-360x640-scrolled");
});

test("the menu's footer, and its top bar scrolled", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await shootScreen(page, "27-menu-footer");
  await page.evaluate(() => {
    window.scrollTo(0, 600);
  });
  await shootScreen(page, "30-top-bar-scrolled-menu");
});

test("the top bar scrolled, on the setup screen and the rules", async ({ page }) => {
  await page.goto("/play/ludo");
  await page.evaluate(() => {
    window.scrollTo(0, 400);
  });
  await shootScreen(page, "30b-top-bar-scrolled-setup");
  await page.goto("/rules/chess");
  await page.evaluate(() => {
    window.scrollTo(0, 1200);
  });
  await shootScreen(page, "30c-top-bar-scrolled-rules");
});

test("a game's card pointed at, and reached with Tab", async ({ page }) => {
  test.skip(onPhone(), "a device that hovers");
  await page.goto("/");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Cờ caro" }) });
  await card.hover();
  await page.waitForTimeout(300);
  await shootScreen(page, "29-menu-card-hover");
  await page.mouse.move(0, 0);
  await card.getByRole("link", { name: "Chơi", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await shootScreen(page, "29b-menu-card-focus");
});

test("the theme menu open, and the language menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Giao diện: / }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await shootScreen(page, "31-theme-menu-open");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Ngôn ngữ: / }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await shootScreen(page, "31b-language-menu-open");
});

for (const width of [360, 390, 1280] as const) {
  test(`the top bar of every kind of page at ${String(width)} px`, async ({ page }) => {
    test.skip(onPhone() === (width === 1280), "the project of that width");
    if (width === 360) await page.setViewportSize({ width: 360, height: 740 });

    await openLocalGame(page, "ludo", savedLudoGame(4, []));
    await shootScreen(page, `32-top-bar-play-ludo-${String(width)}`);

    await openFakeRoom(
      page,
      {
        gameId: "chess",
        seats: [
          { kind: "human", name: "Minh", standIn: false },
          { kind: "human", name: "Lan", standIn: false },
        ],
        record: chessRecord(["e2e4", "e7e5", "g1f3"]),
      },
      1,
    );
    await expect(board(page)).toBeVisible();
    await shootScreen(page, `32-top-bar-play-chess-online-${String(width)}`);

    await openFakeRoom(page, {
      gameId: "ludo",
      seats: [{ kind: "human", name: "Lan", standIn: false }, null, null],
      record: ludoRecord(3, []),
    });
    await expect(page.getByRole("region", { name: "Người chơi" })).toBeVisible();
    await shootScreen(page, `32-top-bar-room-lobby-${String(width)}`);

    await page.goto("/rules/caro");
    await shootScreen(page, `32-top-bar-rules-caro-${String(width)}`);

    await page.goto("/khong-co");
    await shootScreen(page, `32-top-bar-not-found-${String(width)}`);
  });
}

// --- Chat in a room (change `add-room-chat`) -------------------------------------------------------

const SAY_LONG =
  "Bạn ơi đi nhanh lên, mình sắp phải đi đón con rồi nên ván này cố xong sớm nha, nhờ bạn đó, cảm ơn nhiều lắm";

const CHAT_MESSAGES: readonly ChatBody[] = [
  { kind: "preset", preset: "hello" },
  { kind: "text", text: SAY_LONG },
  { kind: "reaction", reaction: "like" },
  { kind: "text", text: "Khai cuộc này mình mới học" },
  { kind: "text", text: "Xem ở https://example.com/khai-cuoc-italia nè" },
  { kind: "preset", preset: "nice-move" },
];

/** A room with an opponent: Cờ vua seen by Black, or Cờ cá ngựa for three. */
function openChatRoom(page: Page, gameId: "chess" | "ludo") {
  return gameId === "chess"
    ? openFakeRoom(
        page,
        {
          gameId: "chess",
          seats: [
            { kind: "human", name: "Minh", standIn: false },
            { kind: "human", name: "Lan", standIn: false },
          ],
          record: chessRecord(["e2e4", "e7e5", "g1f3"]),
        },
        1,
      )
    : openFakeRoom(page, {
        gameId: "ludo",
        seats: [
          { kind: "human", name: "Lan", standIn: false },
          { kind: "human", name: "Minh", standIn: false },
          { kind: "ai" },
          { kind: "ai" },
        ],
        record: ludoRecord(4, LUDO_FOUR_CHOICES),
      });
}

/**
 * A phone's own size, or one of `CHAT_SIZES`; a laptop of 1100 px, where the chat opens from its
 * button over the column beside the board: from 1280 px it is a column of its own (`44-*`).
 */
async function chatViewport(page: Page, viewport: { width: number; height: number } | null) {
  if (viewport !== null) await page.setViewportSize(viewport);
  else if (!onPhone()) await page.setViewportSize({ width: 1100, height: 800 });
}

const CHAT_SIZES = [
  { suffix: "", viewport: null },
  { suffix: "-360", viewport: { width: 360, height: 740 } },
  { suffix: "-land", viewport: { width: 844, height: 390 } },
] as const;

for (const { suffix, viewport } of CHAT_SIZES) {
  test(`the chat of a game, in every state${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && !onPhone(), "a phone's sizes");
    await chatViewport(page, viewport);

    const room = await openChatRoom(page, "chess");
    await expect(board(page)).toBeVisible();
    await shootScreen(page, `40-chat-chess-button${suffix}`);

    // Sent while the chat is closed: a bubble, then the count alone.
    room.receive({ kind: "text", text: "Chào, ván này mình cầm Trắng nhé" });
    room.receive({ kind: "text", text: SAY_LONG });
    await expect(page.locator("[data-chat-bubble]")).toBeVisible();
    await shootScreen(page, `40a-chat-chess-bubble${suffix}`);
    await expect(page.locator("[data-chat-bubble]")).toBeHidden({ timeout: 6000 });
    await shootScreen(page, `40b-chat-chess-count${suffix}`);

    // Open: every kind of message, and what can be sent.
    room.receive(...CHAT_MESSAGES);
    await page.locator("[data-chat-button]").click();
    await expect(page.getByRole("log")).toBeVisible();
    await page.getByRole("textbox", { name: "Viết tin nhắn" }).fill("Chào Minh");
    await page.getByRole("textbox", { name: "Viết tin nhắn" }).press("Enter");
    await page.getByRole("button", { name: "Gửi Tuyệt" }).click();
    await expect(page.getByRole("img", { name: "Tuyệt" })).toBeVisible();
    await shootScreen(page, `40c-chat-chess-open${suffix}`);

    // Nothing sent back: the message is told as not sent.
    room.setChatAnswers(false);
    await page.getByRole("button", { name: "Chơi hay đấy" }).click();
    await expect(page.locator("#room-chat").getByRole("alert")).toBeVisible({ timeout: 10_000 });
    await shootScreen(page, `40d-chat-chess-failed${suffix}`);

    // Muted: no bubble, no count, and the panel says so.
    await page.getByRole("switch", { name: "Tắt chat" }).click();
    await expect(page.getByText(/Chat đang tắt:/u)).toBeVisible();
    await shootScreen(page, `40e-chat-chess-muted${suffix}`);
    await page.getByRole("button", { name: "Đóng chat" }).click();
    await shootScreen(page, `40f-chat-chess-muted-closed${suffix}`);
  });

  test(`the chat of Cờ cá ngựa, and the lobby${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && !onPhone(), "a phone's sizes");
    await chatViewport(page, viewport);

    const room = await openChatRoom(page, "ludo");
    await expect(horseChoices(page)).toHaveCount(4);
    room.receive(...CHAT_MESSAGES);
    await page.getByRole("button", { name: /^Chat \d+/u }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("log")).toBeVisible();
    await shootScreen(page, `41-chat-ludo-open${suffix}`);
    await page.keyboard.press("Escape");
    room.receive({ kind: "reaction", reaction: "fire" });
    await expect(page.locator("[data-chat-reaction]")).toBeVisible();
    // Its animation at its fullest: between 18 % and 75 % of 1800 ms.
    await page.waitForTimeout(600);
    await shootScreen(page, `41a-chat-ludo-reaction${suffix}`, { moving: true });

    const lobby = await openFakeRoom(page, {
      gameId: "ludo",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
        null,
      ],
      record: ludoRecord(3, []),
    });
    await expect(page.getByRole("region", { name: "Người chơi" })).toBeVisible();
    lobby.receive(...CHAT_MESSAGES);
    await page.getByRole("button", { name: /^Chat/u }).click();
    await expect(page.getByRole("log")).toBeVisible();
    await shootScreen(page, `41b-chat-lobby-open${suffix}`);
  });

  test(`the chat in the lobby, where a laptop has no room beside it${suffix}`, async ({ page }) => {
    test.skip(viewport !== null || onPhone(), "a laptop");
    await page.setViewportSize({ width: 1024, height: 768 });
    const lobby = await openFakeRoom(page, {
      gameId: "ludo",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
        null,
      ],
      record: ludoRecord(3, []),
    });
    await expect(page.getByRole("region", { name: "Người chơi" })).toBeVisible();
    lobby.receive(...CHAT_MESSAGES);
    await page.getByRole("button", { name: /^Chat/u }).click();
    await expect(page.getByRole("log")).toBeVisible();
    await shootScreen(page, "41c-chat-lobby-1024");
  });

  test(`the chat once a game is over${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && !onPhone(), "a phone's sizes");
    await chatViewport(page, viewport);

    const room = await openFakeRoom(page, {
      gameId: "chess",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
      ],
      record: {
        ...chessRecord(["e2e4", "e7e5"]),
        ending: { reason: "resigned" as const, player: 1 },
      },
    });
    await expect(page.getByRole("button", { name: "Chơi lại" }).first()).toBeVisible();
    room.receive({ kind: "preset", preset: "good-game" }, { kind: "text", text: "Ván nữa nha" });
    await shootScreen(page, `42-chat-over-bubble${suffix}`);
    await page.getByRole("button", { name: /^Chat \d+/u }).click();
    await expect(page.getByRole("log")).toBeVisible();
    await shootScreen(page, `42a-chat-over-open${suffix}`);
  });

  test(`the tab when the chat's button is off the screen${suffix}`, async ({ page }) => {
    test.skip(viewport?.height !== 740 || !onPhone(), "the phone where it is off the screen");
    await page.setViewportSize(viewport ?? { width: 360, height: 740 });

    const room = await openChatRoom(page, "ludo");
    await expect(horseChoices(page)).toHaveCount(4);
    room.receive({ kind: "text", text: "Ngựa mình sắp về đích rồi" });
    await expect(page.locator("[data-chat-bubble]")).toBeHidden({ timeout: 8000 });
    await expect(page.locator("[data-chat-peek]")).toBeVisible();
    await shootScreen(page, `43-chat-peek${suffix}`);
  });
}

// The chat's column at the right of a wide screen (change `rework-chat-layout`): open as it comes,
// collapsed with a bubble beside its strip, in the lobby, and once the game is over.
test("the chat's column of a wide screen", async ({ page }) => {
  test.skip(onPhone(), "a wide screen");
  const room = await openChatRoom(page, "chess");
  await expect(page.getByRole("log")).toBeVisible();
  room.receive(...CHAT_MESSAGES);
  await expect(page.getByRole("log").getByText("Khai cuộc này mình mới học")).toBeVisible();
  await shootScreen(page, "44-chat-column-chess");

  await page.getByRole("button", { name: "Thu gọn chat" }).click();
  room.receive({ kind: "text", text: "Đến lượt bạn đó" });
  await expect(page.locator("[data-chat-bubble]")).toBeVisible();
  await shootScreen(page, "44a-chat-column-collapsed");
  await page.locator("[data-chat-rail]").getByRole("button").click();

  const ludo = await openChatRoom(page, "ludo");
  await expect(horseChoices(page)).toHaveCount(4);
  ludo.receive(...CHAT_MESSAGES);
  await shootScreen(page, "44b-chat-column-ludo");

  const lobby = await openFakeRoom(page, {
    gameId: "ludo",
    seats: [
      { kind: "human", name: "Lan", standIn: false },
      { kind: "human", name: "Minh", standIn: false },
      null,
    ],
    record: ludoRecord(3, []),
  });
  await expect(page.getByRole("region", { name: "Người chơi" })).toBeVisible();
  lobby.receive(...CHAT_MESSAGES);
  await shootScreen(page, "44c-chat-column-lobby");

  await openFakeRoom(page, {
    gameId: "chess",
    seats: [
      { kind: "human", name: "Lan", standIn: false },
      { kind: "human", name: "Minh", standIn: false },
    ],
    record: {
      ...chessRecord(["e2e4", "e7e5"]),
      ending: { reason: "resigned" as const, player: 1 },
    },
  });
  await expect(page.getByRole("button", { name: "Chơi lại" }).first()).toBeVisible();
  await shootScreen(page, "44d-chat-column-over");
});

// Cờ rào: the screens of the mockup (`add-fence-race-game`), at a phone of 360 px too. The setup and
// rules screens first, then the board in each thing it can show.
const FENCE_STEP = (row: number, col: number): FenceRaceMove => ({ kind: "step", row, col });
const FENCE_FENCE = (row: number, col: number, dir: "h" | "v" = "h"): FenceRaceMove => ({
  kind: "fence",
  row,
  col,
  dir,
});
/** The game of the mockup's scene: fences placed by both, pawns under way. */
const FENCE_MIDDLE: readonly FenceRaceMove[] = [
  FENCE_STEP(9, 4),
  FENCE_FENCE(2, 3),
  FENCE_STEP(8, 4),
  FENCE_FENCE(6, 4),
  FENCE_FENCE(1, 3),
  FENCE_STEP(1, 4),
  FENCE_STEP(8, 3),
  FENCE_FENCE(4, 2, "v"),
  FENCE_STEP(7, 3),
  FENCE_STEP(1, 5),
];
const FENCE_FOUR: readonly FenceRaceMove[] = [
  FENCE_STEP(7, 4),
  FENCE_STEP(4, 1),
  FENCE_STEP(1, 4),
  FENCE_STEP(4, 7),
  FENCE_FENCE(3, 3),
  FENCE_FENCE(5, 1, "v"),
  FENCE_STEP(2, 4),
  FENCE_STEP(4, 6),
];

async function openFence(page: Page, players: 2 | 3 | 4, moves: readonly FenceRaceMove[]) {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "fence-race:local", savedFenceRaceGame(players, moves));
  await page.goto("/play/fence-race/local");
  await expect(fenceFrame(page)).toBeVisible();
}

test("Cờ rào: the setup screen and the rules", async ({ page }) => {
  await page.goto("/play/fence-race");
  await choose(page, "Số người chơi", "4 người");
  await shoot(page, "50-setup-fence-race");
  await page.goto("/rules/fence-race");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shoot(page, "50a-rules-fence-race");
});

for (const [suffix, viewport] of [
  ["", null],
  ["-360", { width: 360, height: 740 }],
] as const) {
  test(`Cờ rào, two players${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    await openFence(page, 2, []);
    await shootScreen(page, `51-fence-start${suffix}`);

    await openFence(page, 2, FENCE_MIDDLE);
    await shootScreen(page, `51a-fence-move${suffix}`);

    await fenceMode(page, "Đặt rào").click();
    await shootScreen(page, `51b-fence-place-empty${suffix}`);
    await tryFenceAt(page, { row: 7, col: 3, dir: "h" });
    await expect(fencePreview(page)).toHaveAttribute("data-preview", "ok");
    await shootScreen(page, `51c-fence-place-ok${suffix}`);
    await page.getByRole("button", { name: "Xoay" }).click();
    await shootScreen(page, `51d-fence-place-turned${suffix}`);
    await page.getByRole("button", { name: "Huỷ" }).click();
    await tryFenceAt(page, { row: 6, col: 4, dir: "h" });
    await expect(fencePreview(page)).toHaveAttribute("data-preview", "bad");
    await shootScreen(page, `51e-fence-place-bad${suffix}`);
    await page.getByRole("button", { name: "Huỷ" }).click();

    await fenceMode(page, "Phá rào").click();
    await tryFenceAt(page, { row: 6, col: 4, dir: "h" });
    await expect(page.locator("[data-chosen]")).toBeVisible();
    await shootScreen(page, `51f-fence-break${suffix}`);
    await page.getByRole("button", { name: "Phá rào" }).click();
    await expect(page.locator("[data-gone]")).toBeVisible();
    await shootScreen(page, `51g-fence-just-broken${suffix}`);
  });

  test(`Cờ rào, four players${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    await openFence(page, 4, FENCE_FOUR);
    await shootScreen(page, `52-fence-four${suffix}`);

    // All four in one cell.
    const middle: FenceRaceMove[] = [];
    for (let step = 1; step <= 4; step += 1) {
      middle.push(
        FENCE_STEP(8 - step, 4),
        FENCE_STEP(4, step),
        FENCE_STEP(step, 4),
        FENCE_STEP(4, 8 - step),
      );
    }
    await openFence(page, 4, middle);
    await expect(fenceCell(page, "E5")).toBeVisible();
    await shootScreen(page, `52a-fence-four-share${suffix}`);

    await openFence(page, 3, []);
    await shootScreen(page, `52b-fence-three${suffix}`);
  });

  test(`Cờ rào, the end${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    const moves: FenceRaceMove[] = [];
    for (let up = 1; up <= 9; up += 1) {
      moves.push(FENCE_STEP(10 - up, 4), FENCE_STEP(0, up % 2 === 1 ? 3 : 4));
    }
    await openFence(page, 2, moves);
    await fenceCell(page, "E11").click();
    await expect(page.locator("[data-goal]")).toBeVisible();
    await shootScreen(page, `53-fence-won${suffix}`);
  });

  test(`Cờ rào online, the second seat${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    await openFakeRoom(
      page,
      {
        gameId: "fence-race",
        seats: [
          { kind: "human", name: "Lan", standIn: false },
          { kind: "human", name: "Minh", standIn: false },
        ],
        record: fenceRaceRecord(2, FENCE_MIDDLE.slice(0, 9)),
      },
      1,
    );
    await expect(fenceFrame(page)).toBeVisible();
    await shootScreen(page, `54-fence-online${suffix}`);
    await fenceMode(page, "Đặt rào").click();
    await tryFenceAt(page, { row: 7, col: 3, dir: "h" }, true);
    await expect(fencePreview(page)).toBeVisible();
    await shootScreen(page, `54a-fence-online-place${suffix}`);
  });

  test(`Cờ rào online, four seats${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    await openFakeRoom(
      page,
      {
        gameId: "fence-race",
        seats: [
          { kind: "human", name: "Lan", standIn: false },
          { kind: "human", name: "Minh", standIn: false },
          { kind: "ai" },
          { kind: "ai" },
        ],
        record: fenceRaceRecord(4, FENCE_FOUR),
      },
      0,
    );
    await expect(fenceFrame(page)).toBeVisible();
    await shootScreen(page, `55-fence-online-four${suffix}`);
  });
}

// ── The toolbox and the card score tool ──

const CARD_ROUNDS: readonly (readonly string[])[] = [
  ["30", "-10", "-5"],
  ["-20", "40", "-10"],
  ["50", "-5", "-15"],
];

async function playedCardGroup(page: Page): Promise<void> {
  await createCardGroup(page, ["Lan", "Minh", "Hùng", "Tú"], "Team Dev");
  for (const values of CARD_ROUNDS) {
    await enterRound(page, values);
    await page.getByRole("button", { name: "Lưu ván" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }
}

test("toolbox and an empty list", async ({ page }) => {
  await page.goto("/tools");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shoot(page, "60-toolbox");
  await page.goto("/tools/card-score");
  await expect(page.getByRole("heading", { name: "Chưa có nhóm nào" })).toBeVisible();
  await shoot(page, "61-card-score-empty");
});

test("card score: the form, with a name taken", async ({ page }) => {
  await page.goto("/tools/card-score/new");
  await page.getByRole("textbox", { name: "Người chơi 1" }).fill("Lan");
  await page.getByRole("textbox", { name: "Người chơi 2" }).fill("lan");
  await page.getByRole("button", { name: "Tạo nhóm" }).click();
  await expect(page.getByText("Tên này đã có trong nhóm.")).toBeVisible();
  await shoot(page, "62-card-score-form");
});

test("card score: the board", async ({ page }) => {
  await playedCardGroup(page);
  await expect(page.getByRole("status").getByText("Đã lưu ván 3.")).toBeVisible();
  await shoot(page, "63-card-score-board");
  await shootScreen(page, "63a-card-score-board-screen");
  await page.getByRole("banner").getByRole("link", { name: "Các nhóm" }).click();
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1);
  await shoot(page, "64-card-score-list");
});

test("card score: typing a round", async ({ page }) => {
  await createCardGroup(page, ["Lan", "Minh", "Hùng", "Tú"], "Team Dev");
  await page.getByRole("button", { name: "Nhập ván 1" }).click();
  await shootScreen(page, "65-card-score-round-open");
  await page.getByRole("button", { name: "Đóng" }).click();
  await enterRound(page, ["-10", "-20", "-5"]);
  await expect(page.getByText("Tú được tự tính: +35")).toBeVisible();
  await shootScreen(page, "65a-card-score-round-auto");
  await page.getByRole("button", { name: "Đóng" }).click();
  await shootScreen(page, "65b-card-score-round-ask");
});

test("card score: a round that does not add up, and one corrected", async ({ page }) => {
  await playedCardGroup(page);
  await enterRound(page, ["5", "5", "5", "5"]);
  await expect(page.getByText("Tổng đang lệch +20")).toBeVisible();
  await shootScreen(page, "66-card-score-round-mismatch");
  await page.getByRole("button", { name: "Đóng" }).click();
  await page.getByRole("button", { name: "Bỏ ván" }).click();
  await page.getByRole("button", { name: "Sửa ván 2" }).first().click();
  await shootScreen(page, "66a-card-score-round-edit");
});

test("card score: eight long names", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) > 500, "a phone's size");
  await page.setViewportSize({ width: 360, height: 640 });
  await createCardGroup(page, CARD_SCORE_LONG_NAMES, "Họp lớp 12A");
  await enterRound(page, ["1", "-1", "2"]);
  await shootScreen(page, "67-card-score-round-eight-360x640");
  await page.getByRole("button", { name: "Đóng" }).click();
  await page.getByRole("button", { name: "Bỏ ván" }).click();
  await enterRound(page, ["1", "-1", "0", "0", "0", "0", "0"]);
  await page.getByRole("button", { name: "Lưu ván" }).click();
  await expect(page.getByRole("region", { name: "Bảng các ván" })).toBeVisible();
  await shoot(page, "67a-card-score-board-eight-360x640");
});

test("card score: resting, and editing the group", async ({ page }) => {
  await playedCardGroup(page);
  await page.getByRole("link", { name: "Sửa nhóm" }).click();
  await page.getByRole("button", { name: "Cho nghỉ: Tú" }).click();
  await expect(page.getByRole("button", { name: "Chơi lại: Tú" })).toBeVisible();
  await page.getByRole("textbox", { name: "Tên người mới" }).fill("Tú");
  await page.getByRole("button", { name: "Thêm người" }).click();
  await expect(page.getByText(/đang nghỉ/)).toBeVisible();
  await shoot(page, "68-card-score-edit");
});

test("card score: turned sideways", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) > 500, "a phone's size");
  await page.setViewportSize({ width: 844, height: 390 });
  await createCardGroup(page, ["Lan", "Minh", "Hùng", "Tú"]);
  await enterRound(page, ["-10", "-20", "-5"]);
  await shootScreen(page, "69-card-score-round-sideways");
});

test("the menu's way to the toolbox", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Hộp công cụ" })).toBeVisible();
  await shootScreen(page, "01f-menu-toolbox");
});

// Gom thạch (add-jelly-gather-puzzle design §9): the level list new and with progress, a level with
// its hint, a stuck coconut, the solved panel (and at 360 × 640), no such level.

async function openJellyLevel(page: Page, id: string): Promise<void> {
  await page.goto(`/puzzles/jelly-gather/${id}`);
  await expect(page.getByRole("button", { name: "Lên" })).toHaveAttribute("aria-disabled", "false");
}

async function solveJellyFirst(page: Page): Promise<void> {
  await openJellyLevel(page, "1-1");
  for (const key of ["ArrowLeft", "ArrowLeft", "ArrowUp", "ArrowRight"])
    await page.keyboard.press(key);
  await expect(page.getByRole("region", { name: "Gom xong!" })).toBeVisible();
}

test("Gom thạch: the level list, new and with progress", async ({ page }) => {
  await page.goto("/puzzles/jelly-gather");
  await expect(page.getByRole("link", { name: /^Bắt đầu/ })).toBeVisible();
  await shoot(page, "70-jelly-list-new");
  await solveJellyFirst(page);
  await openJellyLevel(page, "2-1");
  await page.keyboard.press("ArrowUp");
  await page.goto("/puzzles/jelly-gather");
  await expect(page.getByRole("link", { name: "Tiếp tục: màn 2-1" })).toBeVisible();
  await shoot(page, "70a-jelly-list-progress");
});

test("Gom thạch: a level with its hint, and the menu's card", async ({ page }) => {
  await openJellyLevel(page, "1-1");
  await shootScreen(page, "71-jelly-level-hint");
  await openJellyLevel(page, "2-1");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowUp");
  // Strawberry pushed into the grass jelly: stuck across a seam.
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  await shootScreen(page, "71a-jelly-level-grass");
  await page.goto("/");
  await page.getByRole("heading", { name: "Gom thạch", exact: true }).scrollIntoViewIfNeeded();
  await shootScreen(page, "01g-menu-jelly-card");
});

test("Gom thạch: a coconut stuck to a wall", async ({ page }) => {
  await openJellyLevel(page, "3-2");
  await shootScreen(page, "72-jelly-level-coconut");
});

test("Gom thạch: solved, and at 360 × 640", async ({ page }) => {
  await solveJellyFirst(page);
  await page.waitForTimeout(400);
  await shootScreen(page, "73-jelly-solved");
  test.skip((page.viewportSize()?.width ?? 0) > 500, "a phone's size");
  await page.setViewportSize({ width: 360, height: 640 });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await shootScreen(page, "73a-jelly-solved-360x640");
});

test("Gom thạch: no such level", async ({ page }) => {
  await page.goto("/puzzles/jelly-gather/9-9");
  await expect(page.getByRole("heading", { name: "Không có màn này" })).toBeVisible();
  await shoot(page, "74-jelly-not-found");
});

// Molds (add-jelly-gather-molds design §5): 4-1 at the start, 4-8 with grass jelly on a strawberry
// mold, 4-3 with some molds filled; chapter 5 (and at 360 × 640). The list of five chapters is above.

const JELLY_KEY = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" } as const;

test("Gom thạch: molds, empty, a wrong kind on one, and some filled", async ({ page }) => {
  await openJellyLevel(page, "4-1");
  await shootScreen(page, "75-jelly-molds-start");
  await openJellyLevel(page, "4-8");
  await shootScreen(page, "75a-jelly-molds-wrong-kind");
  await openJellyLevel(page, "4-3");
  // The first part of the level's shortest solution, until some molds fit.
  const moves = JELLY_SOLUTIONS["4-3"] ?? "";
  for (const move of moves.slice(0, moves.length - 4)) {
    await page.keyboard.press(JELLY_KEY[move as keyof typeof JELLY_KEY]);
  }
  await page.waitForTimeout(300);
  await shootScreen(page, "75b-jelly-molds-some-filled");
});

test("Gom thạch: Kho đá, and at 360 × 640", async ({ page }) => {
  await openJellyLevel(page, "5-1");
  for (const key of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"])
    await page.keyboard.press(key);
  await page.waitForTimeout(300);
  await shootScreen(page, "76-jelly-depot");
  test.skip((page.viewportSize()?.width ?? 0) > 500, "a phone's size");
  await page.setViewportSize({ width: 360, height: 640 });
  await shootScreen(page, "76a-jelly-depot-360x640");
});

// ── Đội gom thạch (change `add-jelly-crew-game`): the scenes of the mockup ──

const CREW = JELLY_CREW_KITCHEN_TWO;

async function openCrew(
  page: Page,
  players: 2 | 3 | 4,
  moves: readonly (typeof CREW)[number][],
  map: JellyCrewMapId = "kitchen",
) {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "jelly-crew:local", savedJellyCrewGame(players, moves, map));
  await page.goto("/play/jelly-crew/local");
  await expect(crewBoard(page)).toBeVisible();
}

test("Đội gom thạch: the setup screen and the rules", async ({ page }) => {
  await page.goto("/play/jelly-crew");
  await choose(page, "Số người chơi", "4 người");
  await shoot(page, "80-setup-jelly-crew");
  await page.goto("/rules/jelly-crew");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shoot(page, "80a-rules-jelly-crew");
});

for (const [suffix, viewport] of [
  ["", null],
  ["-360", { width: 360, height: 740 }],
] as const) {
  test(`Đội gom thạch, two on one device${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    await openCrew(page, 2, []);
    await shootScreen(page, `81-crew-start${suffix}`);
    await openCrew(page, 2, CREW.slice(0, 8));
    await shootScreen(page, `81a-crew-holding${suffix}`);
    // Lam picked under "Điều khiển": the arrows and the pad move Lam now.
    await openCrew(page, 2, CREW.slice(0, 7));
    await page
      .locator("label")
      .filter({ has: page.getByRole("radio", { name: /Lam/u }) })
      .click();
    await expect(page.getByRole("radio", { name: /Lam/u })).toBeChecked();
    await shootScreen(page, `81b-crew-pick-lam${suffix}`);
    await page.getByRole("button", { name: "Đặt lại bản đồ" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shootScreen(page, `81c-crew-reset${suffix}`);
  });

  test(`Đội gom thạch, the end${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    await openCrew(page, 2, CREW.slice(0, -1));
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("status")).toHaveText(/Cả đội thắng!/u);
    await shootScreen(page, `81d-crew-won${suffix}`, { moving: true });
  });

  test(`Đội gom thạch, four players${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    await openCrew(page, 4, ["0D", "1D", "1D", "1D", "1L", "1L"]);
    await shootScreen(page, `82-crew-four${suffix}`);
    await openCrew(page, 4, [], "cold-store");
    await shootScreen(page, `82a-crew-cold-store-four${suffix}`);
    await openCrew(page, 3, [], "market");
    await shootScreen(page, `82b-crew-market-three${suffix}`);
  });

  // The five maps added after the first playtest (add-jelly-crew-game §11): one layout of each.
  test(`Đội gom thạch, the new maps${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);

    const maps = [
      ["dessert-shop", 2],
      ["coconut-grove", 4],
      ["floating-market", 3],
      ["jelly-factory", 4],
      ["moon-festival", 2],
    ] as const;
    for (const [index, [map, players]] of maps.entries()) {
      await openCrew(page, players, [], map);
      const scene = `84${"abcde"[index] ?? ""}-crew-${map}-${String(players)}`;
      await shootScreen(page, `${scene}${suffix}`);
    }
  });

  test(`Đội gom thạch online${suffix}`, async ({ page }) => {
    test.skip(viewport !== null && (page.viewportSize()?.width ?? 0) > 500, "a phone's size");
    if (viewport !== null) await page.setViewportSize(viewport);
    const seats = [
      { kind: "human", name: "Lan", standIn: false },
      { kind: "human", name: "Minh", standIn: false },
    ] as const;

    await openFakeRoom(
      page,
      { gameId: "jelly-crew", seats, record: jellyCrewRecord(2, CREW.slice(0, 24)) },
      1,
    );
    await expect(crewBoard(page)).toBeVisible();
    await shootScreen(page, `83-crew-online${suffix}`);
    await page.getByRole("button", { name: "Bỏ cuộc" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await shootScreen(page, `83a-crew-give-up${suffix}`);

    await openFakeRoom(
      page,
      { gameId: "jelly-crew", seats, record: jellyCrewRecord(2, CREW.slice(0, 2)) },
      0,
    );
    await expect(crewBoard(page)).toBeVisible();
    await shootScreen(page, `83b-crew-online-lam${suffix}`);

    const stopped = {
      ...jellyCrewRecord(2, CREW.slice(0, 10)),
      ending: { reason: "resigned" as const, player: 1 },
    };
    await openFakeRoom(page, { gameId: "jelly-crew", seats, record: stopped }, 0);
    await expect(page.getByRole("status")).toHaveText(/Ván dừng/u);
    await shootScreen(page, `83c-crew-stopped${suffix}`);
  });
}
