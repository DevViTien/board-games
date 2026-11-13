import { type Browser, expect, type Page, test } from "@playwright/test";

import { choose, pressStart, status } from "./helpers";

// Tam giác cấm (change `add-forbidden-triangle-game`): two on one device until Đỏ closes a red
// triangle, against the AI, two browsers online, and a table of seven guests on a phone.

const table = (page: Page) => page.getByRole("group", { name: /^Bàn tiệc \d khách$/u });
const guest = (page: Page, letter: string) =>
  table(page).getByRole("button", { name: new RegExp(`^Khách ${letter}[:,]`, "u") });

/** Draws the line between two guests: the first, then the second. */
async function join(page: Page, a: string, b: string): Promise<void> {
  await guest(page, a).click();
  await guest(page, b).click();
}

/** The number of lines of each owner drawn on the table. */
const lines = (page: Page, owner: "red" | "blue") =>
  page.locator(`[data-forbidden-board] [data-owner="${owner}"]`);

async function startLocal(page: Page, mode: "Cùng máy" | "Đấu với máy"): Promise<void> {
  await page.goto("/play/forbidden-triangle");
  await choose(page, "Chế độ", mode);
  await pressStart(page);
  await expect(table(page)).toBeVisible();
}

test("Cùng máy: Đỏ closes a red triangle after a warning, and Xanh wins", async ({ page }) => {
  await startLocal(page, "Cùng máy");
  await expect(table(page)).toHaveAccessibleName("Bàn tiệc 6 khách");
  await expect(status(page)).toHaveText("Đến lượt Đỏ");

  await join(page, "A", "B");
  await join(page, "D", "E");
  await join(page, "B", "C");
  await join(page, "A", "E");
  await expect(lines(page, "red")).toHaveCount(2);
  await expect(lines(page, "blue")).toHaveCount(2);

  // Đỏ's A–C would close A–B–C: marked, then asked.
  await guest(page, "A").click();
  await expect(guest(page, "C")).toHaveAccessibleName("Khách C: nối A–C sẽ khép tam giác đỏ A–B–C");
  await guest(page, "C").click();
  const dialog = page.getByRole("dialog", { name: "Nối A–C?" });
  await dialog.getByRole("button", { name: "Không nối" }).click();
  await expect(dialog).toBeHidden();
  await expect(lines(page, "red")).toHaveCount(2);

  await guest(page, "C").click();
  await page
    .getByRole("dialog", { name: "Nối A–C?" })
    .getByRole("button", { name: "Vẫn nối" })
    .click();

  await expect(status(page)).toHaveText("Xanh thắng!");
  await expect(page.getByText("Đỏ khép tam giác A–B–C.")).toBeVisible();
  await expect(page.locator("[data-lost-triangle]")).toHaveAttribute("data-lost-triangle", "A–B–C");
});

test("Đấu với máy: the AI answers each line with a blue one", async ({ page }) => {
  await startLocal(page, "Đấu với máy");

  await join(page, "A", "B");
  await expect(lines(page, "blue")).toHaveCount(1);
  await join(page, "C", "D");
  await expect(lines(page, "blue")).toHaveCount(2);
  await expect(lines(page, "red")).toHaveCount(2);
});

// Online: two browsers, as in online.spec.ts.

const ROOM_URL = /\/room\/[2-9A-HJKMNP-Z]{6}$/;
const nameField = (page: Page) => page.getByRole("textbox", { name: "Tên của bạn" });

async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/play/forbidden-triangle");
  await choose(page, "Chế độ", "Online");
  await choose(page, "Bàn tiệc", "5 khách");
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

test("Online: two browsers draw in turn on a table of five", async ({ page, browser }) => {
  const url = await createRoom(page, "Minh");
  const lan = await joinAs(browser, url, "Lan");
  await expect(table(page)).toHaveAccessibleName("Bàn tiệc 5 khách");
  await expect(table(lan.page)).toBeVisible();

  await join(page, "A", "B");
  await expect(lines(lan.page, "red")).toHaveCount(1);
  await join(lan.page, "C", "D");
  await expect(lines(page, "blue")).toHaveCount(1);
  await expect(status(page)).toHaveText(/Đến lượt bạn/u);

  await lan.context.close();
});

test.describe("Dùng được trên điện thoại", () => {
  test.use({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });

  test("Bàn 7 khách trên điện thoại: fits, no sideways scroll, every guest 44 px", async ({
    page,
  }) => {
    await page.goto("/play/forbidden-triangle");
    await choose(page, "Chế độ", "Cùng máy");
    await choose(page, "Bàn tiệc", "7 khách");
    await pressStart(page);
    await expect(table(page)).toHaveAccessibleName("Bàn tiệc 7 khách");

    const box = await table(page).boundingBox();
    expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 999) <= 360).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    for (const letter of ["A", "B", "C", "D", "E", "F", "G"]) {
      const size = await guest(page, letter).boundingBox();
      expect(Math.min(size?.width ?? 0, size?.height ?? 0), letter).toBeGreaterThanOrEqual(44);
    }
    await guest(page, "A").tap();
    await guest(page, "D").tap();
    await expect(lines(page, "red")).toHaveCount(1);
  });
});
