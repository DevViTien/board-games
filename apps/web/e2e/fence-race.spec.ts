import type { Fence, FenceRaceMove } from "@board-games/games/fence-race";
import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  choose,
  fenceCell,
  fenceFrame,
  fenceLayer,
  fenceMode,
  fencePoint,
  fencePreview,
  fenceRaceRecord,
  giveNameInLobby,
  nameField,
  openAsNewPlayer,
  openFakeRoom,
  PAGE_WITHOUT_STORAGE,
  pressStart,
  ROOM_URL,
  savedFenceRaceGame,
  status,
  tryFenceAt,
  writeSaved,
} from "./helpers";

// The game on screen: on this device, against the AI, online, and on a phone's touch screen.

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const placeButton = (page: Page) => button(page, "Đặt rào");
const panel = (page: Page) => page.getByRole("list", { name: "Người chơi" });
const seatRow = (page: Page, seat: number) => page.locator(`li[data-player="${seat}"]`);
const walls = (page: Page) => page.locator("[data-wall]");
const step = (row: number, col: number): FenceRaceMove => ({ kind: "step", row, col });
const fence = (row: number, col: number, dir: "h" | "v" = "h"): FenceRaceMove => ({
  kind: "fence",
  row,
  col,
  dir,
});

async function openSaved(page: Page, players: 2 | 3 | 4, moves: readonly FenceRaceMove[]) {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, "fence-race:local", savedFenceRaceGame(players, moves));
  await page.goto("/play/fence-race/local");
  await expect(fenceFrame(page)).toBeVisible();
}

async function startFromSetup(
  page: Page,
  mode: "Cùng máy" | "Đấu với máy",
  players: 2 | 3 | 4,
  level = "Dễ",
) {
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Cờ rào" }) })
    .getByRole("link", { name: "Chơi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/play\/fence-race$/);
  await choose(page, "Chế độ", mode);
  await choose(page, "Số người chơi", `${players} người`);
  if (mode === "Đấu với máy") {
    await choose(page, "Mức độ", level);
    await choose(page, "Ai đi trước", "Tôi");
  }
  await pressStart(page);
  await expect(fenceFrame(page)).toBeVisible();
}

/** A fence tried and placed by touch or mouse, at a place on the board. */
async function placeFence(page: Page, at: Fence) {
  await fenceMode(page, "Đặt rào").click();
  await tryFenceAt(page, at);
  await expect(fencePreview(page)).toHaveAttribute("data-preview", "ok");
  await placeButton(page).click();
}

test.describe("on this device", () => {
  test("Về đích, two players: a whole game by taps, won in the gate", async ({ page }) => {
    await startFromSetup(page, "Cùng máy", 2);
    await expect(status(page)).toHaveText("Đến lượt Đỏ");
    await expect(page.getByText("Về cổng màu đỏ ● ở cạnh trên trước mọi người.")).toBeVisible();

    const up = ["E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10", "E11"];
    const aside = ["F11", "G11", "H11", "I11", "I10", "I9", "I8", "I7", "I6"];
    for (const [index, name] of up.entries()) {
      await fenceCell(page, name).click();
      const other = aside[index];
      if (other !== undefined) await fenceCell(page, other).click();
    }

    await expect(status(page)).toHaveText("Đỏ thắng!");
    await expect(page.getByText("Đỏ về đích ở ô E11 sau 19 nước.")).toBeVisible();
    await expect(page.locator("[data-goal]")).toBeVisible();
    await expect(page.getByRole("group", { name: "Chế độ" })).toHaveCount(0);
    await expect(button(page, "Ván mới")).toBeVisible();
  });

  test("Về đích, four players: arrives at the gate opposite, the game ends for everyone", async ({
    page,
  }) => {
    const rows: FenceRaceMove[] = [];
    for (let up = 1; up <= 7; up += 1) {
      rows.push(step(8 - up, 4), step(4, up), step(up, 4), step(4, 8 - up));
    }
    await openSaved(page, 4, rows);
    await expect(status(page)).toHaveText("Đến lượt Đỏ");

    await fenceCell(page, "E9").click();

    await expect(status(page)).toHaveText("Đỏ thắng!");
    await expect(page.getByRole("button", { name: "Ván mới" }).first()).toBeVisible();
  });

  test("Đứng chung ô: four pawns in one cell, all four symbols there", async ({ page }) => {
    const moves: FenceRaceMove[] = [];
    // All four go to the middle: seat by seat, four steps each.
    for (let k = 1; k <= 4; k += 1) {
      moves.push(step(8 - k, 4), step(4, k), step(k, 4), step(4, 8 - k));
    }
    await openSaved(page, 4, moves);

    await expect(page.locator("[data-pawn]")).toHaveCount(4);
    await expect(fenceCell(page, "E5")).toHaveAccessibleName(
      /có quân Đỏ, Xanh dương, Vàng và Xanh lá/,
    );
    await expect(page.locator("[data-share]")).toBeVisible();
  });

  test("Đặt rào: previewed first, placed on the button, the turn passes", async ({ page }) => {
    await startFromSetup(page, "Cùng máy", 2);

    await placeFence(page, { row: 4, col: 3, dir: "h" });

    await expect(walls(page)).toHaveCount(1);
    await expect(page.locator("[data-just]")).toHaveCount(1);
    await expect(status(page)).toHaveText("Đến lượt Xanh dương");
    await expect(seatRow(page, 0)).toContainText("8 rào");
    await expect(fenceMode(page, "Đi quân")).toHaveAttribute("aria-pressed", "true");
    await expect(fencePreview(page)).toHaveCount(0);
  });

  test("Rào bị cấm: a fence sealing a pawn in is refused, with its reason", async ({ page }) => {
    // Red at I1, closed in above: a fence to its left would seal it.
    await openSaved(page, 2, [
      step(10, 5),
      fence(9, 7),
      step(10, 6),
      step(0, 3),
      step(10, 7),
      step(0, 4),
      step(10, 8),
    ]);

    await fenceMode(page, "Đặt rào").click();
    await tryFenceAt(page, { row: 9, col: 6, dir: "v" });

    await expect(fencePreview(page)).toHaveAttribute("data-preview", "bad");
    await expect(page.getByText("Bịt kín đường của Đỏ").first()).toBeVisible();
    await expect(placeButton(page)).toHaveAttribute("aria-disabled", "true");
    // `force`: Playwright waits for a button with `aria-disabled` to be enabled.
    await placeButton(page).click({ force: true });
    await expect(walls(page)).toHaveCount(1);
    await expect(status(page)).toHaveText("Đến lượt Xanh dương");
  });

  test("Phá rào: chosen first, broken on the button, the place marked", async ({ page }) => {
    await openSaved(page, 2, [fence(4, 3)]);

    await fenceMode(page, "Phá rào").click();
    await tryFenceAt(page, { row: 4, col: 3, dir: "h" });
    await expect(page.locator("[data-chosen]")).toBeVisible();
    await button(page, "Phá rào").click();

    await expect(walls(page)).toHaveCount(0);
    await expect(page.locator("[data-gone]")).toBeVisible();
    await expect(seatRow(page, 1)).toContainText("đã phá");
    await expect(seatRow(page, 0)).toContainText("8 rào");
    await expect(page.getByText(/^Xanh dương vừa phá rào giữa hàng/).first()).toBeVisible();
  });

  test("Hoàn tác khi đang xem trước: the fence tried goes with the position", async ({ page }) => {
    await openSaved(page, 2, [step(9, 4)]);

    await fenceMode(page, "Đặt rào").click();
    await tryFenceAt(page, { row: 4, col: 3, dir: "h" });
    await expect(fencePreview(page)).toBeVisible();

    await button(page, "Hoàn tác").click();

    await expect(fencePreview(page)).toHaveCount(0);
    await expect(fenceMode(page, "Đi quân")).toHaveAttribute("aria-pressed", "true");
    await expect(status(page)).toHaveText("Đến lượt Đỏ");
  });

  test("Dùng được bằng bàn phím: a fence by arrows, R and Enter, the focus back on the pawn", async ({
    page,
  }) => {
    test.skip(test.info().project.name === "mobile", "a keyboard");
    await startFromSetup(page, "Cùng máy", 2);

    await fenceMode(page, "Đặt rào").focus();
    await page.keyboard.press("Enter");
    await expect(fenceLayer(page)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("r");
    await expect(fencePreview(page)).toHaveAttribute("transform", /rotate\(90\)/);
    await page.keyboard.press("Enter");

    await expect(walls(page)).toHaveCount(1);
    // On a shared device: the pawn of who just moved.
    await expect(fenceCell(page, "E1")).toBeFocused();
    await expect(status(page)).toHaveText("Đến lượt Xanh dương");
  });

  test.describe("Giữ phím trên thiết bị dùng chung", () => {
    // Đỏ at E5, Xanh dương at E7: the cell between is one step for both.
    const FACING = [
      step(9, 4),
      step(1, 4),
      step(8, 4),
      step(2, 4),
      step(7, 4),
      step(3, 4),
      step(6, 4),
      step(4, 4),
    ];

    test("Enter held on a cell plays one move, not the next player's too", async ({ page }) => {
      test.skip(test.info().project.name === "mobile", "a keyboard");
      await openSaved(page, 2, FACING);
      await fenceCell(page, "E6").focus();

      await page.keyboard.down("Enter");
      for (let repeat = 0; repeat < 4; repeat += 1) await page.keyboard.down("Enter");
      await page.keyboard.up("Enter");

      await expect(status(page)).toHaveText(/Đến lượt Xanh dương/);
      await expect(fenceCell(page, "E6")).toHaveAccessibleName(/có quân Đỏ/);
      await expect(fenceCell(page, "E7")).toHaveAccessibleName(/có quân Xanh dương/);
    });

    test("Enter held on a fence places it, and the next player does not move", async ({ page }) => {
      test.skip(test.info().project.name === "mobile", "a keyboard");
      await openSaved(page, 2, FACING);
      await fenceMode(page, "Đặt rào").focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowLeft");

      await page.keyboard.down("Enter");
      for (let repeat = 0; repeat < 4; repeat += 1) await page.keyboard.down("Enter");
      await page.keyboard.up("Enter");

      await expect(walls(page)).toHaveCount(1);
      await expect(status(page)).toHaveText(/Đến lượt Xanh dương/);
      await expect(fenceCell(page, "E7")).toHaveAccessibleName(/có quân Xanh dương/);
    });
  });

  test("Phá rào bằng bàn phím: PageDown reaches a fence the arrows cannot", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "a keyboard");
    // The record the search found: with the arrows, 6,3,v is out of reach from any other.
    await openSaved(page, 2, [
      fence(2, 6),
      fence(8, 6),
      fence(4, 6),
      fence(1, 1, "v"),
      fence(9, 0),
      fence(4, 0),
      fence(6, 3, "v"),
      fence(9, 7, "v"),
      fence(8, 0),
    ]);
    await fenceMode(page, "Phá rào").focus();
    await page.keyboard.press("Enter");
    await expect(fenceLayer(page)).toBeFocused();

    const names = new Set<string | null>();
    for (let press = 0; press < 9; press += 1) {
      await page.keyboard.press("PageDown");
      names.add(await fenceLayer(page).getAttribute("aria-label"));
    }
    expect(names.size).toBe(9);
  });
});

test.describe("against the AI", () => {
  for (const level of ["Dễ", "Vừa", "Khó"]) {
    test(`Máy chơi ở mức ${level}: it answers each move`, async ({ page }) => {
      await startFromSetup(page, "Đấu với máy", 2, level);
      await expect(status(page)).toHaveText("Đến lượt bạn (Đỏ)");

      await fenceCell(page, "E2").click();
      await expect(status(page)).toHaveText(/^Máy .+\. Đến lượt bạn \(Đỏ\)$/, {
        timeout: 15_000,
      });
      // Any cell the pawn can reach: the computer may just have fenced off the one straight ahead.
      await page.locator('[data-cell][aria-disabled="false"]').first().click();
      await expect(status(page)).toHaveText(/^Máy .+\. Đến lượt bạn \(Đỏ\)$/, {
        timeout: 15_000,
      });
    });
  }

  test("Một người với ba máy: each of them moves, and the seats show their pawns", async ({
    page,
  }) => {
    await startFromSetup(page, "Đấu với máy", 4);

    await fenceCell(page, "E2").click();
    await expect(status(page)).toHaveText(/^Máy \(Xanh lá\) .+\. Đến lượt bạn \(Đỏ\)$/, {
      timeout: 15_000,
    });
    await expect(page.locator("[data-pawn]")).toHaveCount(4);
    await expect(panel(page).getByRole("listitem")).toHaveCount(4);
  });

  test("Tải lại vẫn thấy ô vừa rời: the marker of the cell left is still there", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await startFromSetup(page, "Đấu với máy", 2);

    await fenceCell(page, "E2").click();
    await expect(status(page)).toHaveText(/^Máy .+\. Đến lượt bạn \(Đỏ\)$/, { timeout: 15_000 });
    // Until the AI's move is a step, a marker may be absent: play till it is, then reload.
    let left = await page.locator("[data-left]").count();
    for (let tries = 0; left === 0 && tries < 24; tries += 1) {
      await page.locator("button[data-cell][aria-disabled='false']").first().click();
      await expect(status(page)).toHaveText(/^Máy .+\. Đến lượt bạn \(Đỏ\)$/, { timeout: 15_000 });
      left = await page.locator("[data-left]").count();
    }
    expect(left).toBe(1);
    const box = await page.locator("[data-left]").boundingBox();

    await page.reload();
    await expect(fenceFrame(page)).toBeVisible();

    await expect(page.locator("[data-left]")).toHaveCount(1);
    const again = await page.locator("[data-left]").boundingBox();
    expect(again?.x).toBeCloseTo(box?.x ?? 0, 0);
    expect(again?.y).toBeCloseTo(box?.y ?? 0, 0);
  });
});

test.describe("online", () => {
  async function createRoom(page: Page, count: 2 | 3 | 4): Promise<string> {
    await page.goto("/play/fence-race");
    await choose(page, "Chế độ", "Online");
    await choose(page, "Số người chơi", `${count} người`);
    await nameField(page).fill("Minh");
    await button(page, "Tạo phòng").click();
    await expect(page).toHaveURL(ROOM_URL);
    return page.url();
  }

  test("Hai trình duyệt: a fence, a break and the same names on both; the second is turned", async ({
    page,
    browser,
  }) => {
    const url = await createRoom(page, 2);
    const lan = await openAsNewPlayer(browser, url, "Lan");
    await button(lan.page, "Vào chơi").click();
    await expect(fenceFrame(page)).toBeVisible();
    await expect(fenceFrame(lan.page)).toBeVisible();

    // The second seat's board is turned: its pawn at the bottom of its screen, the names the same.
    const seen = await lan.page.locator('[data-pawn="1"]').boundingBox();
    const frame = await fenceFrame(lan.page).boundingBox();
    expect((seen?.y ?? 0) - (frame?.y ?? 0)).toBeGreaterThan((frame?.height ?? 0) / 2);
    await expect(fenceCell(lan.page, "E11")).toHaveAccessibleName(/^Ô E11, có quân Bạn/);
    await expect(fenceCell(page, "E11")).toHaveAccessibleName(/^Ô E11, có quân Xanh dương/);

    await placeFence(page, { row: 4, col: 3, dir: "h" });
    await expect(status(lan.page)).toHaveText(
      "Minh vừa đặt rào giữa hàng 6 và 7, cột D–E. Đến lượt bạn (Xanh dương)",
    );
    await expect(walls(lan.page)).toHaveCount(1);
    await expect(lan.page.locator("[data-wall]").first()).toHaveAttribute("data-wall", "h:4:3");

    // Lan breaks it from a turned board.
    await fenceMode(lan.page, "Phá rào").click();
    await tryFenceAt(lan.page, { row: 4, col: 3, dir: "h" }, true);
    await expect(lan.page.locator("[data-chosen]")).toBeVisible();
    await button(lan.page, "Phá rào").click();

    await expect(status(page)).toHaveText(
      "Lan vừa phá rào giữa hàng 6 và 7, cột D–E. Đến lượt bạn (Đỏ)",
    );
    await expect(walls(page)).toHaveCount(0);
    await expect(page.locator("[data-gone]")).toBeVisible();
    await expect(seatRow(page, 1)).toContainText("đã phá");

    await lan.context.close();
  });

  test("Nối lại giữa ván khi đang xem trước: the fence tried is still there, and goes through", async ({
    page,
  }) => {
    const room = await openFakeRoom(page, {
      gameId: "fence-race",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
      ],
      record: fenceRaceRecord(2, [step(9, 4), step(1, 4)]),
    });
    await expect(fenceFrame(page)).toBeVisible();
    await fenceMode(page, "Đặt rào").click();
    await tryFenceAt(page, { row: 4, col: 3, dir: "h" });
    await button(page, "Xoay").click();
    await expect(fencePreview(page)).toHaveAttribute("transform", /rotate\(90\)/);

    await room.loseConnection();

    await expect(placeButton(page)).toHaveAttribute("aria-disabled", "true");
    await expect(fencePreview(page)).toHaveAttribute("transform", /rotate\(90\)/);
    await expect(placeButton(page)).toHaveAccessibleDescription(/.+/);

    room.restoreConnection();

    // The client reconnects by itself, after its own wait.
    await expect(placeButton(page)).toHaveAttribute("aria-disabled", "false", { timeout: 30_000 });
    await expect(fencePreview(page)).toHaveAttribute("transform", /rotate\(90\)/);
    await placeButton(page).click();
    await expect.poll(() => room.movesSent()).toEqual([fence(4, 3, "v")]);
  });

  test("Bàn quay: the arrows move the fence as seen by the second seat", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "a keyboard");
    await openFakeRoom(
      page,
      {
        gameId: "fence-race",
        seats: [
          { kind: "human", name: "Minh", standIn: false },
          { kind: "human", name: "Lan", standIn: false },
        ],
        record: fenceRaceRecord(2, [step(9, 4)]),
      },
      1,
    );
    await expect(fenceFrame(page)).toBeVisible();
    await fenceMode(page, "Đặt rào").focus();
    await page.keyboard.press("Enter");
    await expect(fenceLayer(page)).toBeFocused();
    const place = async () => {
      const transform = (await fencePreview(page).getAttribute("transform")) ?? "";
      const [, x = "0", y = "0"] = /translate\(([\d.]+) ([\d.]+)\)/.exec(transform) ?? [];
      return { x: Number(x), y: Number(y) };
    };

    await page.keyboard.press("ArrowUp");
    const start = await place();
    await page.keyboard.press("ArrowUp");
    await expect(fenceLayer(page)).toHaveAccessibleName(/hàng 9 và 10/);
    const above = await place();
    expect(above.y).toBeLessThan(start.y);
    expect(above.x).toBe(start.x);

    await page.keyboard.press("ArrowRight");
    await expect(fenceLayer(page)).toHaveAccessibleName(/cột D–E/);
    const right = await place();
    expect(right.x).toBeGreaterThan(above.x);
    expect(right.y).toBe(above.y);
  });

  test("Rào đang gửi không nháy: from the press to the answer, the fence never leaves", async ({
    page,
  }) => {
    const record = fenceRaceRecord(2, [step(9, 4), step(1, 4)]);
    const room = await openFakeRoom(page, {
      gameId: "fence-race",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
      ],
      record,
    });
    await expect(fenceFrame(page)).toBeVisible();
    await fenceMode(page, "Đặt rào").click();
    await tryFenceAt(page, { row: 4, col: 3, dir: "h" });

    // Every frame from here on, whether a fence shows at that place.
    await page.evaluate(() => {
      const seen: boolean[] = [];
      (window as unknown as { __frames: boolean[] }).__frames = seen;
      const look = () => {
        seen.push(
          document.querySelector('[data-wall="h:4:3"]') !== null ||
            document.querySelector("[data-preview]") !== null,
        );
        requestAnimationFrame(look);
      };
      look();
    });
    await placeButton(page).click();

    // The server takes a second: the fence shows as what it will be, and stays.
    await expect(walls(page)).toHaveCount(1);
    await expect(page.getByText("Đang gửi…").first()).toBeVisible();
    await page.waitForTimeout(1000);
    room.update({ record: fenceRaceRecord(2, [step(9, 4), step(1, 4), fence(4, 3)]) });
    await expect(status(page)).toHaveText(/Đang chờ Minh/);
    await page.waitForTimeout(100);

    await expect(walls(page)).toHaveCount(1);
    const frames = await page.evaluate(
      () => (window as unknown as { __frames: boolean[] }).__frames,
    );
    expect(frames.length).toBeGreaterThan(10);
    expect(frames.filter((shown) => !shown)).toHaveLength(0);
  });

  test("Phòng 4 ghế có ghế máy và máy chơi thay: the computer plays, and takes over a seat", async ({
    page,
    browser,
  }) => {
    const url = await createRoom(page, 4);
    const lan = await openAsNewPlayer(browser, url, "Lan");
    await button(lan.page, "Vào chơi").click();
    await button(page, "Cho máy chơi ghế 3").click();
    await expect(button(page, "Bỏ máy ở ghế 3")).toBeVisible();
    await button(page, "Cho máy chơi ghế 4 và bắt đầu ván").click();
    await expect(fenceFrame(page)).toBeVisible();
    await expect(fenceFrame(lan.page)).toBeVisible();

    // Nobody's board is turned with four players.
    const row = lan.page.getByRole("row").first();
    await expect(row.getByRole("gridcell").first().locator("button")).toHaveAttribute(
      "data-cell",
      "A9",
    );

    // Each moves; the computer's two seats answer.
    await fenceCell(page, "E2").click();
    await expect(status(lan.page)).toHaveText(/Đến lượt bạn \(Xanh dương\)$/);
    await fenceCell(lan.page, "B5").click();
    await expect(status(page)).toHaveText(/Đến lượt bạn \(Đỏ\)$/, { timeout: 20_000 });

    // Lan resigns: the computer plays for her, and the game goes on.
    await button(lan.page, "Đầu hàng").click();
    await lan.page.getByRole("dialog").getByRole("button", { name: "Đầu hàng" }).click();
    await expect(seatRow(page, 1)).toContainText("Máy chơi thay", { timeout: 15_000 });
    await fenceCell(page, "E3").click();
    await expect(status(page)).toHaveText(/Đến lượt bạn \(Đỏ\)$/, { timeout: 20_000 });

    await lan.context.close();
  });

  test("names no one twice in the lobby, and a stranger can join by the link", async ({
    page,
    browser,
  }) => {
    const url = await createRoom(page, 2);
    const stranger = await browser.newContext();
    const other = await stranger.newPage();
    await other.goto(url);
    await giveNameInLobby(other, "Lan");
    await button(other, "Vào chơi").click();

    await expect(fenceFrame(other)).toBeVisible();
    await stranger.close();
  });
});

test.describe("Dùng được trên điện thoại", () => {
  test.use({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });

  /** One finger pressed at `from`, dragged to `to` in `steps`, by real touch events. */
  async function touchDrag(
    page: Page,
    from: { x: number; y: number },
    to: { x: number; y: number },
    steps = 12,
    lift = true,
  ) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: from.x, y: from.y }],
    });
    for (let step_ = 1; step_ <= steps; step_ += 1) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: from.x + ((to.x - from.x) * step_) / steps,
            y: from.y + ((to.y - from.y) * step_) / steps,
          },
        ],
      });
    }
    if (lift) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }

  async function centre(locator: Locator) {
    const box = await locator.boundingBox();
    if (box === null) throw new Error("not on screen");
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  test("Kéo để dời rào: the fence follows a real finger, and the page does not scroll", async ({
    page,
  }) => {
    await openSaved(page, 2, []);
    await fenceMode(page, "Đặt rào").tap();
    await fenceLayer(page).scrollIntoViewIfNeeded();
    const point = await fencePoint(page, { row: 2, col: 2, dir: "h" });
    await page.touchscreen.tap(point.x, point.y);
    await expect(fencePreview(page)).toHaveAttribute("data-preview", "ok");
    const placed = await fencePreview(page).getAttribute("transform");
    const scrolled = await page.evaluate(() => window.scrollY);
    const end = await fencePoint(page, { row: 7, col: 5, dir: "h" });

    await touchDrag(page, point, end);

    await expect(fencePreview(page)).not.toHaveAttribute("transform", placed ?? "");
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    // Still a fence along a row: dragging across lines of both kinds does not turn it.
    await expect(fencePreview(page)).not.toHaveAttribute("transform", /rotate/);
  });

  for (const [side, target] of [
    ["phải", { row: 2, col: 7, dir: "h" }],
    ["trái", { row: 2, col: 0, dir: "h" }],
  ] as const) {
    test(`Nhãn nổi khi kéo về mép ${side}: inside the screen, and no sideways scrolling`, async ({
      page,
    }) => {
      // A fence already there: the tag says why not, its longest words.
      await openSaved(page, 2, [fence(2, 7), fence(2, 0)]);
      await fenceMode(page, "Đặt rào").tap();
      await fenceLayer(page).scrollIntoViewIfNeeded();
      const point = await fencePoint(page, { row: 6, col: 4, dir: "h" });
      await page.touchscreen.tap(point.x, point.y);
      await expect(fencePreview(page)).toHaveAttribute("data-preview", "ok");
      const end = await fencePoint(page, target);

      await touchDrag(page, point, end, 12, false);

      const tag = page.locator("[data-fence-race-tag]");
      await expect(tag).toContainText(/hàng/);
      const box = await tag.boundingBox();
      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
      const sizes = await page.evaluate(() => ({
        inner: window.innerWidth,
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(sizes.inner).toBe(360);
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
    });
  }

  test("Kéo giữ hướng: turned first, it stays turned through a real diagonal drag", async ({
    page,
  }) => {
    await openSaved(page, 2, []);
    await fenceMode(page, "Đặt rào").tap();
    await fenceLayer(page).scrollIntoViewIfNeeded();
    const point = await fencePoint(page, { row: 2, col: 2, dir: "h" });
    await page.touchscreen.tap(point.x, point.y);
    await button(page, "Xoay").tap();
    await expect(fencePreview(page)).toHaveAttribute("transform", /rotate\(90\)/);

    const end = await fencePoint(page, { row: 8, col: 6, dir: "v" });
    await touchDrag(page, point, end, 30);

    await expect(fencePreview(page)).toHaveAttribute("transform", /rotate\(90\)/);
  });

  test("cuộn được ở Đi quân: a finger over the board scrolls the page", async ({ page }) => {
    await openSaved(page, 2, []);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const middle = await centre(fenceFrame(page));

    await touchDrag(page, middle, { x: middle.x, y: middle.y - 200 });

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("vuốt ngoài bàn vẫn cuộn khi đang đặt rào", async ({ page }) => {
    await openSaved(page, 2, []);
    await fenceMode(page, "Đặt rào").tap();
    const frame = await fenceFrame(page).boundingBox();
    if (frame === null) throw new Error("no board");
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    const beside = { x: 6, y: frame.y + 60 };

    await touchDrag(page, beside, { x: 6, y: beside.y - 150 });

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("Hai ngón vẫn phóng to: the page zooms, the fence tried does not change", async ({
    page,
  }) => {
    await openSaved(page, 2, []);
    await fenceMode(page, "Đặt rào").tap();
    await fenceLayer(page).scrollIntoViewIfNeeded();
    const point = await fencePoint(page, { row: 4, col: 3, dir: "h" });
    await page.touchscreen.tap(point.x, point.y);
    const placed = await fencePreview(page).getAttribute("transform");
    const before = await page.evaluate(() => window.visualViewport?.scale ?? 1);
    const { x, y } = await centre(fenceFrame(page));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 20, y, id: 0 },
        { x: x + 20, y, id: 1 },
      ],
    });
    for (let spread = 1; spread <= 10; spread += 1) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: x - 20 - spread * 8, y, id: 0 },
          { x: x + 20 + spread * 8, y, id: 1 },
        ],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await expect
      .poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1))
      .toBeGreaterThan(before);
    await expect(fencePreview(page)).toHaveAttribute("transform", placed ?? "");
  });
});

test.describe("Dùng được trên điện thoại, 360 × 740", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  const noSidewaysScroll = (page: Page) =>
    page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );

  for (const [name, players] of [
    ["Hai người", 2],
    ["Bốn người", 4],
  ] as const) {
    test(`${name} ở 360 × 740: the board, the turn, the row of modes and Ván mới without scrolling`, async ({
      page,
    }) => {
      await openSaved(page, players, []);

      expect(await noSidewaysScroll(page)).toBe(true);
      await expect(fenceFrame(page)).toBeInViewport({ ratio: 1 });
      await expect(status(page)).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole("group", { name: "Chế độ" })).toBeInViewport({ ratio: 1 });
      await expect(button(page, "Ván mới")).toBeInViewport({ ratio: 1 });
    });

    test(`${name} online ở 360 × 740: the board, the turn and the row of modes without scrolling`, async ({
      page,
    }) => {
      await openFakeRoom(page, {
        gameId: "fence-race",
        seats:
          players === 2
            ? [
                { kind: "human", name: "Lan", standIn: false },
                { kind: "human", name: "Minh", standIn: false },
              ]
            : [
                { kind: "human", name: "Lan", standIn: false },
                { kind: "human", name: "Minh", standIn: false },
                { kind: "ai" },
                { kind: "ai" },
              ],
        record: fenceRaceRecord(players, []),
      });
      await expect(fenceFrame(page)).toBeVisible();

      expect(await noSidewaysScroll(page)).toBe(true);
      await expect(fenceFrame(page)).toBeInViewport({ ratio: 1 });
      await expect(status(page)).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole("group", { name: "Chế độ" })).toBeInViewport({ ratio: 1 });
    });
  }
});

test.describe("Vùng chạm ở khung thấp, 844 × 300", () => {
  test.use({ viewport: { width: 844, height: 300 }, hasTouch: true });

  test("every cell the pawn can step to answers over at least 24 × 24 px, and a touch in it moves", async ({
    page,
  }) => {
    await openSaved(page, 2, []);
    const targets = page.locator("button[data-cell][aria-disabled='false']");
    await expect(targets).toHaveCount(3);
    for (const box of await targets.evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { width, height };
      }),
    )) {
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }

    await fenceCell(page, "E2").tap();

    await expect(status(page)).toHaveText("Đến lượt Xanh dương");
    await expect(fenceCell(page, "E2")).toHaveAccessibleName(/có quân Đỏ/);
  });
});

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 360, height: 640 },
  { width: 740, height: 360 },
  { width: 844, height: 300 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`at ${String(viewport.width)} × ${String(viewport.height)}`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    /**
     * Where the board is: on the page, or, sideways, on the screen, as it sticks under the top bar
     * while the column beside it scrolls.
     */
    const placeOf = async (page: Page) => {
      const box = await fenceFrame(page).boundingBox();
      const { scroll, sticky } = await page.evaluate(() => ({
        scroll: window.scrollY,
        sticky:
          getComputedStyle(document.querySelector("[data-play-board]") ?? document.body)
            .position === "sticky",
      }));
      // Under the top bar sooner or later: at most a few pixels from where it starts.
      const y = sticky ? Math.round((box?.y ?? 0) / 8) * 8 : (box?.y ?? 0) + scroll;
      return `${box?.x},${y},${box?.width},${box?.height}`;
    };

    for (const players of [2, 4] as const) {
      test(`Bàn đứng yên, ${players} người: modes, a fence tried, turned, refused, cancelled`, async ({
        page,
      }) => {
        await openSaved(page, players, [
          fence(5, 2),
          step(players === 2 ? 1 : 4, players === 2 ? 4 : 1),
        ]);
        const place = await placeOf(page);

        await fenceMode(page, "Đặt rào").click();
        expect(await placeOf(page)).toBe(place);
        await tryFenceAt(page, { row: 2, col: 3, dir: "h" });
        expect(await placeOf(page)).toBe(place);
        await button(page, "Xoay").click();
        expect(await placeOf(page)).toBe(place);
        await button(page, "Huỷ").click();
        expect(await placeOf(page)).toBe(place);
        await tryFenceAt(page, { row: 5, col: 3, dir: "h" });
        await expect(fencePreview(page)).toHaveAttribute("data-preview", "bad");
        expect(await placeOf(page)).toBe(place);
        await button(page, "Huỷ").click();
        await fenceMode(page, "Phá rào").click();
        expect(await placeOf(page)).toBe(place);
        await tryFenceAt(page, { row: 5, col: 2, dir: "h" });
        await expect(page.locator("[data-chosen]")).toBeVisible();
        expect(await placeOf(page)).toBe(place);
        await button(page, "Huỷ").click();
        await fenceMode(page, "Đi quân").click();
        expect(await placeOf(page)).toBe(place);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true);
      });
    }

    test("Bàn đứng yên khi có nước đối thủ, online", async ({ page }) => {
      const moves = [step(9, 4), step(1, 4)];
      const room = await openFakeRoom(page, {
        gameId: "fence-race",
        seats: [
          { kind: "human", name: "Lan", standIn: false },
          { kind: "human", name: "Minh", standIn: false },
        ],
        record: fenceRaceRecord(2, moves),
      });
      await expect(fenceFrame(page)).toBeVisible();
      const place = await placeOf(page);

      // Waiting for Minh, then told of a fence with the longest name: rows of two digits.
      const mine = [...moves, step(8, 4)];
      room.update({ record: fenceRaceRecord(2, mine), revision: 2 });
      await expect(status(page)).toHaveText(/Đang chờ Minh/);
      expect(await placeOf(page)).toBe(place);

      const theirs = [...mine, fence(0, 2, "v")];
      room.update({ record: fenceRaceRecord(2, theirs), revision: 3 });
      await expect(status(page)).toHaveText(
        "Minh vừa đặt rào giữa cột C và D, hàng 10–11. Đến lượt bạn (Đỏ)",
      );
      expect(await placeOf(page)).toBe(place);

      await fenceMode(page, "Đặt rào").click();
      expect(await placeOf(page)).toBe(place);
    });
  });
}

test.describe("the longest words of every language, at 360 × 740", () => {
  test.use({ viewport: { width: 360, height: 740 }, reducedMotion: "reduce" });

  for (const locale of ["vi", "en", "ja"] as const) {
    test(`Bàn đứng yên in ${locale}: the turn line tells the longest fence, and the board stays`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL ?? "" }]);
      const moves = [step(9, 4), step(1, 4)];
      const room = await openFakeRoom(page, {
        gameId: "fence-race",
        seats: [
          { kind: "human", name: "Lan", standIn: false },
          { kind: "human", name: "Minh", standIn: false },
        ],
        record: fenceRaceRecord(2, moves),
      });
      await expect(fenceFrame(page)).toBeVisible();
      const before = await fenceFrame(page).boundingBox();

      const mine = [...moves, step(8, 4)];
      room.update({ record: fenceRaceRecord(2, mine), revision: 2 });
      await expect(status(page)).toContainText("Minh");
      expect(await fenceFrame(page).boundingBox()).toEqual(before);

      // Between columns C and D, rows 10 and 11: the longest name a fence has.
      room.update({ record: fenceRaceRecord(2, [...mine, fence(0, 2, "v")]), revision: 3 });
      await expect(status(page)).toContainText("10");
      expect(await fenceFrame(page).boundingBox()).toEqual(before);
      // Nothing cut: the words fit the two lines kept.
      const lines = await status(page).evaluate((element) => {
        const { lineHeight } = getComputedStyle(element);
        return Math.round(element.getBoundingClientRect().height / Number.parseFloat(lineHeight));
      });
      expect(lines).toBeLessThanOrEqual(2);
    });
  }
});

test.describe("Chat trong phòng Cờ rào", () => {
  const ROOM = {
    gameId: "fence-race",
    seats: [
      { kind: "human" as const, name: "Lan", standIn: false },
      { kind: "human" as const, name: "Minh", standIn: false },
    ],
    record: fenceRaceRecord(2, [step(9, 4), step(1, 4)]),
  };
  const chatButton = (page: Page) => page.getByRole("button", { name: /^Chat/u });

  test("trên máy tính: the panel covers neither the board nor the row of modes, and reads the line", async ({
    page,
  }) => {
    test.skip(test.info().project.name === "mobile", "a laptop");
    // A small laptop, where the chat opens over the column (from 1280 px it is a column of its own).
    await page.setViewportSize({ width: 1100, height: 800 });
    await openFakeRoom(page, ROOM, 0);
    await expect(fenceFrame(page)).toBeVisible();
    await fenceMode(page, "Đặt rào").click();
    await tryFenceAt(page, { row: 4, col: 3, dir: "h" });
    await chatButton(page).click();

    const chat = page.locator("#room-chat");
    await expect(chat).toBeVisible();
    const panelBox = await chat.boundingBox();
    const frame = await fenceFrame(page).boundingBox();
    const tools = await button(page, "Xoay").boundingBox();
    expect((frame?.x ?? 0) + (frame?.width ?? 0)).toBeLessThanOrEqual(panelBox?.x ?? 0);
    expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0)).toBeLessThanOrEqual(tools?.y ?? 0);
    // The line under the board: what it covers, it says at its head.
    await expect(chat.getByText("Rào giữa hàng 6 và 7, cột D–E.", { exact: true })).toBeVisible();
  });

  test("trên điện thoại: closing the chat, the fence tried is still there", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openFakeRoom(page, ROOM, 0);
    await expect(fenceFrame(page)).toBeVisible();
    await fenceMode(page, "Đặt rào").click();
    await tryFenceAt(page, { row: 4, col: 3, dir: "h" });
    await chatButton(page).click();
    await expect(page.locator("#room-chat")).toBeVisible();

    await page.getByRole("button", { name: "Đóng chat" }).click();

    await expect(page.locator("#room-chat")).toBeHidden();
    await expect(fencePreview(page)).toHaveAttribute("data-preview", "ok");
    await placeButton(page).click();
    await expect(walls(page)).toHaveCount(1);
  });
});
