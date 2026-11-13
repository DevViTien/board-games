import { type Browser, expect, type Page, test } from "@playwright/test";

import { board, choose, nameField, pressStart, ROOM_URL, status } from "./helpers";

// Cờ tướng (change `add-xiangqi-game`): two on one device until Đỏ mates with two cannons, against
// the AI, two browsers online, and the board on a phone of 360 px.

/** The point at column `x`, row `y` of the rules (y = 0 is Đen's back rank). */
const point = (page: Page, x: number, y: number) =>
  board(page).locator(`[data-point="${String(y * 9 + x)}"]`);
const sheet = (page: Page) => page.getByRole("region", { name: "Sổ ghi" });

type Step = readonly [number, number, number, number];

/** Plays a move: a press on the piece, then on the point it goes to. */
async function go(page: Page, [fx, fy, tx, ty]: Step): Promise<void> {
  await point(page, fx, fy).click();
  await point(page, tx, ty).click();
}

/** P2-5 X1.1 P5.4 X1/1 P8.3 X1.1 P8-5: Đỏ's two cannons on the middle column, Đen looking on. */
const DOUBLE_CANNON_MATE: readonly Step[] = [
  [7, 7, 4, 7],
  [0, 0, 0, 1],
  [4, 7, 4, 3],
  [0, 1, 0, 0],
  [1, 7, 1, 4],
  [0, 0, 0, 1],
  [1, 4, 4, 4],
];

async function startLocal(page: Page, mode: "Cùng máy" | "Đấu với máy"): Promise<void> {
  await page.goto("/play/xiangqi");
  await choose(page, "Chế độ", mode);
  await pressStart(page);
  await expect(board(page)).toBeVisible();
}

test("Cùng máy: Đỏ mates with two cannons, the sheet keeps every move", async ({ page }) => {
  await startLocal(page, "Cùng máy");
  await expect(status(page)).toHaveText("Đến lượt Đỏ");
  await expect(page.getByRole("button", { name: "Pháo đỏ ở cột 2, hàng 3" })).toBeVisible();

  // A piece chosen shows where it may go; the press on one of those points plays it.
  await point(page, 7, 7).click();
  await expect(page.getByText(/^Đã chọn Pháo đỏ ở cột 2, hàng 3/u)).toBeVisible();
  await point(page, 4, 7).click();
  await expect(status(page)).toHaveText("Đến lượt Đen");

  for (const step of DOUBLE_CANNON_MATE.slice(1)) await go(page, step);

  await expect(status(page)).toHaveText("Đỏ thắng!");
  await expect(page.getByText("Chiếu bí.")).toBeVisible();
  await expect(sheet(page).getByRole("listitem")).toHaveCount(4);
  await expect(sheet(page).locator('[aria-current="true"]')).toHaveText(/^P8-5/u);
});

test("Đấu với máy: the AI answers with a move of Đen", async ({ page }) => {
  await startLocal(page, "Đấu với máy");

  await go(page, [7, 7, 4, 7]);
  await expect(status(page)).toHaveText(/^Máy đi .+\. Đến lượt bạn \(Đỏ\)$/u);
  await expect(sheet(page).getByRole("listitem").first()).toHaveText(/^1\.P2-5.+[TMXPBS]/u);
});

// Online: two browsers, as in online.spec.ts.

async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/play/xiangqi");
  await choose(page, "Chế độ", "Online");
  await nameField(page).fill(name);
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  return page.url();
}

async function joinAs(browser: Browser, url: string, name: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  await nameField(page).fill(name);
  await page.getByRole("button", { name: "Vào chơi" }).click();
  return { context, page };
}

/** The general on the point at the bottom middle of `page`'s board. */
const bottomMiddle = (page: Page) => board(page).getByRole("row").last().getByRole("button").nth(4);

test("Online: each sees their own side below, and the moves pass between them", async ({
  page,
  browser,
}) => {
  const url = await createRoom(page, "Minh");
  const lan = await joinAs(browser, url, "Lan");
  await expect(board(lan.page)).toBeVisible();

  await expect(bottomMiddle(page)).toHaveAccessibleName("Tướng đỏ ở cột 5, hàng 1");
  await expect(bottomMiddle(lan.page)).toHaveAccessibleName("Tướng đen ở cột 5, hàng 10");

  await go(page, [7, 7, 4, 7]);
  await expect(point(lan.page, 4, 7)).toHaveAccessibleName("Pháo đỏ ở cột 5, hàng 3");
  await go(lan.page, [7, 0, 6, 2]);
  await expect(point(page, 6, 2)).toHaveAccessibleName("Mã đen ở cột 3, hàng 8");
  await expect(status(page)).toHaveText(/Đến lượt bạn/u);

  await lan.context.close();
});

test.describe("Dùng được trên điện thoại", () => {
  test.use({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });

  test("Bàn Cờ tướng trên điện thoại: fits, no sideways scroll, every point 24 px", async ({
    page,
  }) => {
    await startLocal(page, "Cùng máy");

    const box = await board(page).boundingBox();
    expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 999) <= 360).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const sizes = await board(page)
      .locator("[data-point]")
      .evaluateAll((points) =>
        points.map((element) => {
          const rect = element.getBoundingClientRect();
          return Math.min(rect.width, rect.height);
        }),
      );
    expect(sizes).toHaveLength(90);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);

    await point(page, 7, 7).tap();
    await point(page, 4, 7).tap();
    await expect(status(page)).toHaveText("Đến lượt Đen");
  });
});
