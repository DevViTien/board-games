import { type Browser, expect, type Page, test } from "@playwright/test";

import {
  board,
  cell,
  choose,
  countMarks,
  languageButton,
  ludoRecord,
  nameField,
  openAsNewPlayer,
  openFakeRoom,
  PAGE_WITHOUT_STORAGE,
  pickLanguage,
  pickTheme,
  play,
  pressStart,
  ROOM_URL,
  savedLudoGame,
  startLocalGame,
  status,
  themeButton,
  writeSaved,
} from "./helpers";

// Specs color-theme "Chọn giao diện sáng hoặc tối" and localization "Đổi ngôn ngữ": the two menu
// buttons on the top bar of every page, by keyboard, mouse and touch, on a small phone too, and in
// the middle of a game (on one device, against the AI, online).

const menu = (page: Page) => page.getByRole("menu");
const item = (page: Page, name: string) => page.getByRole("menuitemradio", { name });

/** The open menu whole on screen, each choice at least 44 px high. */
async function expectMenuOnScreen(page: Page): Promise<void> {
  await expect(menu(page)).toBeVisible();
  await expect(menu(page)).toBeInViewport({ ratio: 1 });
  for (const choice of await page.getByRole("menuitemradio").all()) {
    expect((await choice.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
}

test("Chọn bằng bàn phím and Đóng bằng Escape: the theme menu with the keyboard alone", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await themeButton(page).focus();

  await page.keyboard.press("Enter");
  await expect(item(page, "Theo hệ thống")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(themeButton(page)).toBeFocused();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");

  // ↑ opens it on the last choice; Home, a letter.
  await page.keyboard.press("ArrowUp");
  await expect(item(page, "Theo hệ thống")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(item(page, "Sáng")).toBeFocused();
  await page.keyboard.press("t");
  await expect(item(page, "Tối")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(themeButton(page)).toBeFocused();
  await expect(themeButton(page)).toHaveAccessibleName("Giao diện: Tối");

  // Tab closes it and moves on.
  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(menu(page)).toBeHidden();
  await expect(languageButton(page)).toBeFocused();
});

test("Bấm ra ngoài: a press elsewhere closes the menu, the theme unchanged", async ({ page }) => {
  await page.goto("/");
  await themeButton(page).click();
  await expect(menu(page)).toBeVisible();

  // Left of the menu, which opens under its button at the right.
  await page.mouse.click(8, 400);

  await expect(menu(page)).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  // Closed from outside: the focus is not taken back to the button.
  await expect(themeButton(page)).not.toBeFocused();
  // A press on the button again opens it, and another closes it.
  await themeButton(page).click();
  await expect(menu(page)).toBeVisible();
  await themeButton(page).click();
  await expect(menu(page)).toBeHidden();
});

test("the press on the board that closes a menu plays nothing", async ({ page }) => {
  await startLocalGame(page);
  await themeButton(page).click();
  await expect(menu(page)).toBeVisible();

  await cell(page, 3, 1).click();

  await expect(menu(page)).toBeHidden();
  await expect(cell(page, 3, 1)).toHaveAccessibleName(/, trống$/u);
  await expect(status(page)).toHaveText("Đến lượt X");
  // The menu closed, the next press plays.
  await cell(page, 3, 1).click();
  await expect(cell(page, 3, 1)).toHaveAccessibleName(/, X$/u);
});

test("Đổi ngôn ngữ bằng bàn phím: ↓ opens on Tiếng Việt, ↓ to English changes nothing, Enter does", async ({
  page,
}) => {
  await page.goto("/");
  await languageButton(page).focus();

  await page.keyboard.press("ArrowDown");
  await expect(item(page, "Tiếng Việt")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item(page, "English")).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await page.keyboard.press("Enter");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(languageButton(page)).toHaveAccessibleName("Language: English, EN");
  await expect(languageButton(page)).toBeFocused();
});

test.describe("on a phone of 360 × 740", () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

  test("Chạm trên điện thoại nhỏ and Menu trên điện thoại nhỏ: both menus on screen on every page", async ({
    page,
  }) => {
    const pages: [string, () => Promise<void>][] = [
      [
        "menu",
        async () => {
          await page.goto("/");
        },
      ],
      [
        "play screen",
        async () => {
          await page.goto(PAGE_WITHOUT_STORAGE);
          await writeSaved(page, "ludo:local", savedLudoGame(4, []));
          await page.goto("/play/ludo/local");
          // The game, not its loading screen (whose bar goes with it).
          await expect(page.locator("[data-ply]")).toBeVisible();
        },
      ],
      [
        "lobby",
        async () => {
          await openFakeRoom(page, {
            gameId: "ludo",
            seats: [{ kind: "human", name: "Lan", standIn: false }, null],
            record: ludoRecord(2, []),
          });
          await expect(page.getByRole("region", { name: "Người chơi" })).toBeVisible();
        },
      ],
      [
        "rules",
        async () => {
          await page.goto("/rules/caro");
        },
      ],
      [
        "not found",
        async () => {
          await page.goto("/khong-co");
        },
      ],
    ];
    for (const [name, open] of pages) {
      await open();
      await test.step(name, async () => {
        await themeButton(page).tap();
        await expectMenuOnScreen(page);
        await page.keyboard.press("Escape");
        await languageButton(page).tap();
        await expectMenuOnScreen(page);
        await page.keyboard.press("Escape");
      });
    }

    // A tap chooses.
    await themeButton(page).tap();
    await item(page, "Tối").tap();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test("Đổi ngôn ngữ ở trang luật: the rules in English, still at /rules/ludo", async ({ page }) => {
  await page.goto("/rules/ludo");

  await pickLanguage(page, "English");

  await expect(page).toHaveURL(/\/rules\/ludo$/u);
  await expect(page.getByRole("heading", { level: 1, name: "How to play Ludo" })).toBeVisible();
});

test("Có trên mọi trang: setup, play screen, lobby, rules and a page not found have the theme button", async ({
  page,
}) => {
  for (const path of ["/play/caro", "/play/caro/local", "/rules/caro", "/khong-co"]) {
    await page.goto(path);
    await expect(themeButton(page)).toBeVisible();
    await expect(languageButton(page)).toBeVisible();
  }
  await openFakeRoom(page, {
    gameId: "ludo",
    seats: [{ kind: "human", name: "Lan", standIn: false }, null],
    record: ludoRecord(2, []),
  });
  await expect(page.getByRole("region", { name: "Người chơi" })).toBeVisible();
  await expect(themeButton(page)).toBeVisible();
});

test("Đổi ngôn ngữ giữa ván: against the AI, the game goes on in Japanese", async ({ page }) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Đấu với máy");
  await pressStart(page);
  await play(page, [8, 8]);
  await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/u);
  await play(page, [8, 9]);
  await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/u);

  await pickLanguage(page, "日本語");

  await expect(page.getByRole("heading", { level: 1, name: "五目並べ" })).toBeVisible();
  // The cells are named in Japanese now ("9行9列、X").
  const grid = page.getByRole("grid");
  const marks = async (mark: string) =>
    (
      await grid
        .getByRole("button")
        .evaluateAll((cells) => cells.map((element) => element.getAttribute("aria-label") ?? ""))
    ).filter((name) => name.endsWith(`、${mark}`)).length;
  expect(await marks("X")).toBe(2);
  expect(await marks("O")).toBe(2);
  // The game goes on: a move, and the AI's answer.
  await grid.getByRole("button", { name: /^10行10列、空き$/u }).click();
  await expect.poll(() => marks("O")).toBe(3);
});

test("Đổi giao diện giữa ván: on one device, the game untouched", async ({ page }) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Cùng máy");
  await pressStart(page);
  await play(page, [7, 7], [7, 8]);

  await pickTheme(page, "Tối");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await countMarks(page, "X")).toBe(1);
  expect(await countMarks(page, "O")).toBe(1);
  await expect(status(page)).toHaveText("Đến lượt X");
});

// --- Online, two browsers ----------------------------------------------------------------------

/** Minh creates a Cờ caro room, Lan joins it: both see the board, Minh (X) to move. */
async function startOnlineCaro(page: Page, browser: Browser) {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Online");
  await nameField(page).fill("Minh");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  const lan = await openAsNewPlayer(browser, page.url(), "Lan");
  await lan.page.getByRole("button", { name: "Vào chơi" }).click();
  await expect(board(page)).toBeVisible();
  await expect(board(lan.page)).toBeVisible();
  return lan;
}

/** Counts the WebSockets the page opens from now on: a new one means it reconnected. */
function countSockets(page: Page): () => number {
  let opened = 0;
  page.on("websocket", () => {
    opened += 1;
  });
  return () => opened;
}

test("Đổi giao diện khi đang chơi online: dark at once, the same seat, the opponent's move arrives", async ({
  page,
  browser,
}) => {
  const lan = await startOnlineCaro(page, browser);
  await play(page, [7, 7]);
  await expect(cell(lan.page, 7, 7)).toHaveAccessibleName(/X$/u);
  const sockets = countSockets(page);

  await pickTheme(page, "Tối");
  await play(lan.page, [7, 8]);

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(cell(page, 7, 8)).toHaveAccessibleName(/O$/u);
  await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/u);
  expect(sockets()).toBe(0);
  await lan.context.close();
});

test("Đổi ngôn ngữ khi đang chơi online: English, the same seat, no lobby, the opponent's move arrives", async ({
  page,
  browser,
}) => {
  const lan = await startOnlineCaro(page, browser);
  await play(page, [7, 7]);
  await expect(cell(lan.page, 7, 7)).toHaveAccessibleName(/X$/u);
  const sockets = countSockets(page);

  await pickLanguage(page, "English");
  await play(lan.page, [7, 8]);

  await expect(page.getByRole("heading", { level: 1, name: "Gomoku" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Join game" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Row 7, column 8, O$/u })).toBeVisible();
  await expect(status(page)).toHaveText(/Your move \(X\)$/u);
  // Design §9: the language changes in place; the connection is kept, not opened again.
  expect(sockets()).toBe(0);
  // And the game goes on from here.
  await page.getByRole("button", { name: /^Row 6, column 6/u }).click();
  await expect(cell(lan.page, 6, 6)).toHaveAccessibleName(/X$/u);
  await lan.context.close();
});
