import { JELLY_CREW_MAPS } from "@board-games/games/jelly-crew";
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

// Đội gom thạch played freely (change `add-jelly-crew-game`, design §10): two on one keyboard win the
// two players' kitchen, W A S D for Lam and the arrows for Hồng; a room of two browsers where both
// move without waiting for the other, reset the map and give up.

/** W A S D move Lam (seat 0), the arrows the character picked: Hồng (seat 1) at first. */
const KEY: Readonly<Record<string, string>> = {
  "0U": "w",
  "0D": "s",
  "0L": "a",
  "0R": "d",
  "1U": "ArrowUp",
  "1D": "ArrowDown",
  "1L": "ArrowLeft",
  "1R": "ArrowRight",
};

/** Online, arrows move this player's own character, whatever its seat. */
const ARROW: Readonly<Record<string, string>> = {
  U: "ArrowUp",
  D: "ArrowDown",
  L: "ArrowLeft",
  R: "ArrowRight",
};

const chip = (page: Page, name: string) => page.locator(`[data-chip="${name}"]`);

/** Takes the focus off any button, as a player clicking the page would, then plays by keys. */
async function playKeys(page: Page, keys: readonly string[]): Promise<void> {
  await crewBoard(page).click();
  for (const key of keys) {
    const before = await chip(page, "steps").textContent();
    await page.keyboard.press(key);
    await expect(chip(page, "steps")).not.toHaveText(before ?? "");
  }
}

test("Cùng máy: two on one keyboard win the two players' kitchen, the team's time shown", async ({
  page,
}) => {
  await page.goto("/play/jelly-crew");
  await choose(page, "Chế độ", "Cùng máy");
  await choose(page, "Số người chơi", "2 người");
  await pressStart(page);
  await expect(crewBoard(page)).toBeVisible();
  await expect(status(page)).toHaveText("Cả đội cùng đi");
  await expect(page.getByRole("radio", { name: /Hồng/u })).toBeChecked();

  await playKeys(
    page,
    JELLY_CREW_KITCHEN_TWO.map((move) => KEY[move] ?? ""),
  );

  await expect(status(page)).toHaveText(/Cả đội thắng!/u);
  await expect(page.getByText(/^Đầy khuôn sau 25 bước, \d+ (phút \d+ )?giây\.$/u)).toBeVisible();
  await expect(chip(page, "molds")).toHaveText(/^Khuôn 4\/4/u);

  // The next map, suggested once the team wins (change `add-new-game-options`).
  await page.getByRole("button", { name: "Bản đồ tiếp: Tiệm chè" }).click();
  await expect(status(page)).toHaveText("Cả đội cùng đi");
  await expect(page.getByRole("main").getByText("Tiệm chè", { exact: true })).toBeVisible();
  await expect(chip(page, "steps")).toHaveText(/^Bước 0/u);
});

test("Online: both move without waiting for the other, one resets the map, then gives up", async ({
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
  await expect(status(page)).toHaveText("Cả đội cùng đi · bạn là Lam");
  await expect(status(lan.page)).toHaveText("Cả đội cùng đi · bạn là Hồng");

  // Minh (Lam) a step down, Lan (Hồng) onto plate ●, then Minh again: nobody waits for a turn.
  await playKeys(page, [ARROW.D ?? ""]);
  await playKeys(
    lan.page,
    ["D", "D", "D"].map((d) => ARROW[d] ?? ""),
  );
  await playKeys(page, [ARROW.R ?? ""]);
  await playKeys(
    lan.page,
    ["L", "L"].map((d) => ARROW[d] ?? ""),
  );
  await expect(page.locator('[data-door="circle"][data-open]')).toBeVisible();

  // Minh pushes the strawberries through the open door into their molds.
  await playKeys(
    page,
    ["R", "R", "R", "R"].map((d) => ARROW[d] ?? ""),
  );
  await expect(chip(page, "molds")).toHaveText(/^Khuôn 1\/4/u);
  await expect(chip(lan.page, "molds")).toHaveText(/^Khuôn 1\/4/u);

  // Lan puts the map back, for everyone; the steps still count.
  await lan.page.getByRole("button", { name: "Đặt lại bản đồ" }).click();
  await lan.page.getByRole("dialog").getByRole("button", { name: "Đặt lại" }).click();
  await expect(page.getByText("Hồng đã đặt lại bản đồ.")).toBeVisible();
  await expect(chip(page, "molds")).toHaveText(/^Khuôn 0\/4/u);
  await expect(chip(page, "steps")).toHaveText("Bước 11");

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
    // The picker of the character to move: every one reachable, 44 px high.
    const cam = page.locator("label").filter({ has: page.getByRole("radio", { name: /Cam/u }) });
    await cam.scrollIntoViewIfNeeded();
    expect((await cam.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await cam.tap();
    await expect(page.getByRole("radio", { name: /Cam/u })).toBeChecked();
    const down = page.getByRole("button", { name: "Xuống" });
    await down.scrollIntoViewIfNeeded();
    const size = await down.boundingBox();
    expect(Math.min(size?.width ?? 0, size?.height ?? 0)).toBeGreaterThanOrEqual(44);
  });

  test("every layout of the eight maps fits the phone, no sideways scroll", async ({ page }) => {
    for (const map of JELLY_CREW_MAPS) {
      for (const players of [2, 3, 4]) {
        const options = encodeURIComponent(JSON.stringify({ map }));
        await page.goto(
          `/play/jelly-crew/local?new=1&players=${String(players)}&options=${options}`,
        );
        await expect(crewBoard(page)).toBeVisible();
        const box = await crewBoard(page).boundingBox();
        expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 999) <= 360, map).toBe(true);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          `${map}-${String(players)}`,
        ).toBe(true);
      }
    }
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
