import { expect, type Page, test } from "@playwright/test";

import {
  board,
  chessSquare,
  choose,
  longChessGame,
  PAGE_WITHOUT_STORAGE,
  playChess,
  pressStart,
  savedChessGame,
  status,
  writeSaved,
} from "./helpers";

// Cờ vua on one device (spec chess): a whole game with the mouse, the special moves, a draw
// claimed, a move with the keyboard, undo and a reload; then how the screen fits a phone of 360 px
// and a laptop of 1280 × 800.

const button = (page: Page, name: string) => page.getByRole("button", { name });
const sheet = (page: Page) => page.getByRole("region", { name: "Sổ ghi" });

async function startChess(page: Page): Promise<void> {
  await page.goto("/play/chess");
  await choose(page, "Chế độ", "Cùng máy");
  await pressStart(page);
  await expect(board(page)).toBeVisible();
}

/** Opens the same-device game saved with `moves` (UCI). */
async function openSaved(page: Page, moves: readonly string[]): Promise<void> {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "chess:local", savedChessGame(moves));
  await page.goto("/play/chess/local");
  await expect(board(page)).toBeVisible();
}

test("Màn hình bắt đầu ván Cờ vua: only the same device and online", async ({ page }) => {
  await page.goto("/play/chess");

  await expect(page.getByRole("group", { name: "Chế độ" }).getByRole("radio")).toHaveCount(2);
  await expect(page.getByRole("radio", { name: "Cùng máy" })).toBeChecked();
  await expect(page.getByRole("group", { name: "Mức độ" })).toHaveCount(0);
});

test("Không có đấu với máy: /play/chess/ai is not found", async ({ page }) => {
  await page.goto("/play/chess/ai");

  await expect(page.getByRole("heading", { name: "Không tìm thấy trang chơi này" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Về menu" })).toBeVisible();
});

test("Thắng bằng chiếu hết: 1. f3 e5 2. g4 Qh4# with the mouse", async ({ page }) => {
  await startChess(page);
  await expect(status(page)).toHaveText("Đến lượt Trắng");

  await playChess(page, "f2f3", "e7e5", "g2g4", "d8h4");

  await expect(status(page)).toHaveText("Đen thắng!");
  await expect(page.getByText("Chiếu hết", { exact: true })).toBeVisible();
  await expect(sheet(page)).toContainText("0–1");
  await expect(chessSquare(page, "h4")).toHaveAccessibleName("Hậu đen ở h4");
});

test("castles on the king's side: the king to g1, the rook to f1", async ({ page }) => {
  await openSaved(page, ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"]);

  await playChess(page, "e1g1");

  await expect(chessSquare(page, "g1")).toHaveAccessibleName("Vua trắng ở g1");
  await expect(chessSquare(page, "f1")).toHaveAccessibleName("Xe trắng ở f1");
  await expect(sheet(page)).toContainText("O-O");
});

test("Phong thành Mã: the picker asks, the knight is chosen", async ({ page }) => {
  // 1. a4 b5 2. axb5 a6 3. bxa6 Bb7 4. axb7 Nc6: a White pawn on b7, b8 empty.
  await openSaved(page, ["a2a4", "b7b5", "a4b5", "a7a6", "b5a6", "c8b7", "a6b7", "b8c6"]);

  await playChess(page, "b7b8");
  const picker = page.getByRole("dialog", { name: "Tốt b7 → b8" });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button", { name: "Hậu" })).toBeFocused();

  // Escape keeps the pawn, and the focus goes back to b8.
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(chessSquare(page, "b8")).toBeFocused();
  await expect(chessSquare(page, "b7")).toHaveAccessibleName("Tốt trắng ở b7");

  await chessSquare(page, "b8").click();
  await picker.getByRole("button", { name: "Mã" }).click();

  await expect(chessSquare(page, "b8")).toHaveAccessibleName("Mã trắng ở b8");
  await expect(status(page)).toHaveText("Đến lượt Đen");
});

test("Bắt tốt qua đường: the pawn on d5 is taken from e5", async ({ page }) => {
  await openSaved(page, ["e2e4", "a7a6", "e4e5", "d7d5"]);

  await playChess(page, "e5d6");

  await expect(chessSquare(page, "d6")).toHaveAccessibleName("Tốt trắng ở d6");
  await expect(chessSquare(page, "d5")).toHaveAccessibleName("Ô d5 trống");
});

test("Đòi hoà khi lặp lại ba lần: the claim ends the game in a draw", async ({ page }) => {
  await startChess(page);
  await expect(button(page, "Đòi hoà")).toHaveCount(0);

  await playChess(page, "g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8");
  await expect(page.getByText("Thế cờ này đã lặp lại ba lần")).toBeVisible();
  await button(page, "Đòi hoà").click();

  await expect(status(page)).toHaveText("Hoà!");
  await expect(page.getByText("Trắng đòi hoà: thế cờ lặp lại ba lần")).toBeVisible();
  await expect(sheet(page)).toContainText("½–½");
});

test("Hoàn tác and a reload: the sheet follows the moves in effect, the game is kept", async ({
  page,
}) => {
  await startChess(page);
  await playChess(page, "e2e4", "e7e5");
  await expect(sheet(page).getByRole("listitem")).toHaveText([/^1\./]);

  await button(page, "Hoàn tác").click();
  await expect(chessSquare(page, "e5")).toHaveAccessibleName("Ô e5 trống");
  await expect(sheet(page)).not.toContainText("e5");

  await page.reload();
  await expect(chessSquare(page, "e4")).toHaveAccessibleName("Tốt trắng ở e4");
  await expect(sheet(page)).toContainText("e4");
  await expect(status(page)).toHaveText("Đến lượt Đen");
});

/** Whether the page scrolls down. */
const scrollsDown = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
  );

/** Every part of the Chess screen a laptop must show without scrolling. */
const laptopParts = (page: Page) => [
  board(page),
  page.getByRole("group", { name: "Trắng" }),
  page.getByRole("group", { name: "Đen" }),
  status(page),
  sheet(page),
  button(page, "Lật bàn"),
  button(page, "Hoàn tác"),
  button(page, "Làm lại"),
  button(page, "Ván mới"),
];

test.describe("on a laptop of 1280 × 800", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "the keyboard and the laptop's layout");
  });

  test("Đi Mã bằng phím: Tab into the board, then arrows and Enter", async ({ page }) => {
    await startChess(page);
    // The setup's Start button had the focus: Tab from the page's start until the board, a
    // bounded number of times.
    await page.locator("body").focus();
    for (let presses = 0; ; presses += 1) {
      const onBoard = await page.evaluate(
        () => document.activeElement?.closest("[role='grid']") !== null,
      );
      if (onBoard) break;
      expect(presses, "Tab never reached the board").toBeLessThan(30);
      await page.keyboard.press("Tab");
    }
    await expect(chessSquare(page, "e1")).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");

    await expect(chessSquare(page, "f3")).toHaveAccessibleName("Mã trắng ở f3");
    await expect(chessSquare(page, "f3")).toBeFocused();
  });

  test("Máy tính: a new game fits the screen without scrolling", async ({ page }) => {
    await startChess(page);

    for (const part of laptopParts(page)) await expect(part).toBeInViewport({ ratio: 1 });
    expect(await scrollsDown(page)).toBe(false);
  });

  for (const [width, height] of [
    [1366, 768],
    [1440, 900],
  ] as const) {
    test(`fits a laptop of ${width} × ${height} too`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await startChess(page);

      for (const part of laptopParts(page)) await expect(part).toBeInViewport({ ratio: 1 });
      expect(await scrollsDown(page)).toBe(false);
    });
  }

  test("Ván dài: everything on screen with 120 half-moves, the newest move in its frame", async ({
    page,
  }) => {
    await openSaved(page, longChessGame(120));

    for (const part of [...laptopParts(page), sheet(page).locator("[aria-current='true']")]) {
      await expect(part).toBeInViewport({ ratio: 1 });
    }
    expect(await scrollsDown(page)).toBe(false);

    // Khung sổ ghi nhận tiêu điểm bằng Tab: the next stop after the board (nothing to claim).
    await chessSquare(page, "e4").focus();
    await page.keyboard.press("Tab");
    await expect(sheet(page)).toBeFocused();
  });
});

test.describe("on a phone 360 px wide", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("Điện thoại hẹp: 8 columns, squares of 40 px, coordinates of 10 px, no sideways scroll", async ({
    page,
  }) => {
    await startChess(page);

    const firstRow = board(page).getByRole("row").first().getByRole("gridcell");
    await expect(firstRow).toHaveCount(8);
    for (const cell of await firstRow.all()) {
      expect((await cell.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(40);
      await expect(cell).toBeInViewport({ ratio: 1 });
    }
    const sizes = await page
      .locator("[data-coordinate]")
      .evaluateAll((spans) =>
        spans.map((span) => Number.parseFloat(getComputedStyle(span).fontSize)),
      );
    expect(sizes).toHaveLength(16);
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(10);
    // The board, both bars and the move sheet on a 360 × 740 screen without scrolling.
    await expect(sheet(page)).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("group", { name: "Trắng" })).toBeInViewport({ ratio: 1 });
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(sideways).toBe(false);
  });
});
