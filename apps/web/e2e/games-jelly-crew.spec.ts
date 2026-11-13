import { expect, type Page, test } from "@playwright/test";

import {
  choose,
  crewBoard,
  JELLY_CREW_KITCHEN_TWO,
  jellyCrewRecord,
  nameField,
  openAsNewPlayer,
  openFakeRoom,
  pressStart,
  ROOM_URL,
  status,
} from "./helpers";

// Đội gom thạch (change `add-jelly-crew-game`): the two players' kitchen won on one device with the
// keys only, and a room of two browsers holding a plate, pushing through its door, stepping back
// and giving up.

const KEY = {
  U: "ArrowUp",
  D: "ArrowDown",
  L: "ArrowLeft",
  R: "ArrowRight",
  end: "Enter",
} as const;

const chip = (page: Page, name: string) => page.locator(`[data-chip="${name}"]`);

/** Takes the focus off any button, as a player clicking the page would, then plays by keys. */
async function playKeys(page: Page, moves: readonly (keyof typeof KEY)[]): Promise<void> {
  await crewBoard(page).click();
  for (const move of moves) {
    const before = await page.locator("[data-chip]").allTextContents();
    await page.keyboard.press(KEY[move]);
    await expect
      .poll(async () => (await page.locator("[data-chip]").allTextContents()).join("|"))
      .not.toBe(before.join("|"));
  }
}

test("Cùng máy: the two players' kitchen is won by keys, and the whole team wins", async ({
  page,
}) => {
  await page.goto("/play/jelly-crew");
  await choose(page, "Chế độ", "Cùng máy");
  await choose(page, "Số người chơi", "2 người");
  await pressStart(page);
  await expect(crewBoard(page)).toBeVisible();
  await expect(chip(page, "turn")).toHaveText("Lam · còn 5 bước");

  await playKeys(page, JELLY_CREW_KITCHEN_TWO as readonly (keyof typeof KEY)[]);

  await expect(status(page)).toHaveText(/Cả đội thắng!/u);
  await expect(page.getByText("Đầy khuôn sau 25 bước, 4 vòng.")).toBeVisible();
  await expect(chip(page, "molds")).toHaveText(/^Khuôn 4\/4/u);
});

test("Online: one holds the plate, the other pushes through the door, steps back, then gives up", async ({
  page,
  browser,
}) => {
  await page.goto("/play/jelly-crew");
  await choose(page, "Chế độ", "Online");
  await choose(page, "Số người chơi", "2 người");
  await nameField(page).fill("Minh");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  const lan = await openAsNewPlayer(browser, page.url(), "Lan");
  await lan.page.getByRole("button", { name: "Vào chơi" }).click();
  await expect(crewBoard(page)).toBeVisible();
  await expect(crewBoard(lan.page)).toBeVisible();
  await expect(chip(page, "turn")).toHaveText("Lam · còn 5 bước");

  // Minh (Lam) a step down; Lan (Hồng) onto plate ●.
  await playKeys(page, ["D", "end"]);
  await playKeys(lan.page, ["D", "D", "D", "L", "L"]);
  await expect(lan.page.locator('[data-door="circle"][data-open]')).toBeVisible();
  await expect(lan.page.getByRole("button", { name: "Giữ nút ●" })).toBeVisible();
  await playKeys(lan.page, ["end"]);
  await expect(page.locator('[data-door="circle"][data-open]')).toBeVisible();

  // Minh pushes the strawberries through the open door, then takes the last step back.
  await playKeys(page, ["R", "R", "R", "R", "R"]);
  await expect(chip(page, "molds")).toHaveText(/^Khuôn 1\/4/u);
  await expect(chip(lan.page, "molds")).toHaveText(/^Khuôn 1\/4/u);
  await page.getByRole("button", { name: "Lùi bước" }).click();
  await expect(chip(page, "turn")).toHaveText("Lam · còn 1 bước");
  await expect(chip(lan.page, "molds")).toHaveText(/^Khuôn 0\/4/u);

  // Lan gives up: the game stops for both, nobody wins.
  await lan.page.getByRole("button", { name: "Bỏ cuộc" }).click();
  await lan.page.getByRole("dialog").getByRole("button", { name: "Bỏ cuộc" }).click();
  await expect(status(page)).toHaveText(/Ván dừng/u);
  await expect(status(lan.page)).toHaveText(/Ván dừng/u);
  await expect(page.getByText("Lan đã bỏ cuộc.")).toBeVisible();
  await expect(lan.page.getByText("Bạn đã bỏ cuộc.")).toBeVisible();
  await lan.context.close();
});

test.describe("Dùng được trên điện thoại", () => {
  test.use({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });

  test("Bố cục lớn nhất trên điện thoại: Kho lạnh for four fits, no sideways scroll", async ({
    page,
  }) => {
    await page.goto("/play/jelly-crew");
    await choose(page, "Chế độ", "Cùng máy");
    await choose(page, "Số người chơi", "4 người");
    await choose(page, "Bản đồ", "Kho lạnh");
    await pressStart(page);
    await expect(crewBoard(page)).toBeVisible();

    const box = await crewBoard(page).boundingBox();
    expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 999) <= 360).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const down = page.getByRole("button", { name: "Xuống" });
    await down.scrollIntoViewIfNeeded();
    const size = await down.boundingBox();
    expect(Math.min(size?.width ?? 0, size?.height ?? 0)).toBeGreaterThanOrEqual(44);
    await down.tap();
    await expect(chip(page, "turn")).toHaveText("Lam · còn 4 bước");
  });
});

// A wide board on a big screen: `main` stops growing at 72rem, so the board is held to what is left
// beside the column of words (`--play-cap`), with the chat's column open and without a chat.
test.describe("Màn hình lớn: bàn rộng không đè cột chữ", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  /** The board's right edge is left of the column of words (its status line and chips). */
  async function expectBesideColumn(page: Page): Promise<void> {
    await expect(crewBoard(page)).toBeVisible();
    const board = await crewBoard(page).boundingBox();
    const words = await status(page).boundingBox();
    const chips = await page.locator("[data-chip]").first().boundingBox();
    expect(board).not.toBeNull();
    const right = (board?.x ?? 0) + (board?.width ?? 0);
    expect(right).toBeLessThanOrEqual(words?.x ?? 0);
    expect(right).toBeLessThanOrEqual(chips?.x ?? 0);
  }

  test("online, the chat's column open: Chợ đêm for two", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "a wide screen");
    await openFakeRoom(page, {
      gameId: "jelly-crew",
      seats: [
        { kind: "human", name: "Lam", standIn: false },
        { kind: "human", name: "Hồng", standIn: false },
      ],
      record: jellyCrewRecord(2, [], "market"),
    });
    await expect(page.locator("#room-chat")).toBeVisible();
    await expectBesideColumn(page);
  });

  test("on one device, no chat: Kho lạnh for two", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "a wide screen");
    await page.goto("/play/jelly-crew");
    await choose(page, "Chế độ", "Cùng máy");
    await choose(page, "Số người chơi", "2 người");
    await choose(page, "Bản đồ", "Kho lạnh");
    await pressStart(page);
    await expectBesideColumn(page);
  });
});
