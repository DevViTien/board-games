import { expect, type Locator, type Page, test } from "@playwright/test";

// Spec `jelly-gather` in a real browser: the menu's card, the level list, a level played by keys,
// by the pad and by swipes (the "mobile" project), its go kept across a reload, the solved panel,
// no network, and an address that is no level.

const HOME = "/puzzles/jelly-gather";
const KEY = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" } as const;
const BUTTON = { U: "Lên", D: "Xuống", L: "Sang trái", R: "Sang phải" } as const;
// Level 1-1 is solved by LLUR, 2-1 by ULLURR (levels.solutions.ts, proved shortest).

/** The move count by the level's title. */
const steps = (page: Page): Locator => page.getByRole("main").getByText(/^\d+ bước$/);

async function keys(page: Page, moves: string): Promise<void> {
  for (const move of moves) await page.keyboard.press(KEY[move as keyof typeof KEY]);
}

async function openLevel(page: Page, id: string): Promise<void> {
  await page.goto(`${HOME}/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: `Màn ${id}` })).toBeVisible();
  // The go is read from this browser once mounted: the pad says it is ready.
  await expect(page.getByRole("button", { name: "Lên" })).toHaveAttribute("aria-disabled", "false");
}

test.describe("Lối vào", () => {
  test("Mở trò giải đố từ menu, Lần đầu vào, and the ways back up", async ({ page }) => {
    await page.goto("/");
    const card = page
      .getByRole("listitem")
      // Exact: "Đội gom thạch" is a game of its own, with its own card.
      .filter({ has: page.getByRole("heading", { name: "Gom thạch", exact: true }) });
    await expect(card.getByText("1 người")).toBeVisible();
    await expect(card.getByText("40 màn")).toBeVisible();
    await expect(card.getByRole("link", { name: "Online" })).toHaveCount(0);
    await card.getByRole("link", { name: "Chơi" }).click();

    await expect(page).toHaveURL(new RegExp(`${HOME}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Gom thạch" })).toBeVisible();
    await expect(page.getByRole("link", { name: /, chưa giải$/ })).toHaveCount(40);
    await page.getByRole("link", { name: "Bắt đầu: màn 1-1" }).click();

    await expect(page).toHaveURL(new RegExp(`${HOME}/1-1$`));
    await expect(page.getByRole("heading", { level: 1, name: "Màn 1-1" })).toBeVisible();
    await page.getByRole("banner").getByRole("link", { name: "Danh sách màn" }).click();
    await expect(page).toHaveURL(new RegExp(`${HOME}$`));
    await page.getByRole("banner").getByRole("link", { name: "Về menu" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("Màn không có: 404, and the way back to the levels", async ({ page }) => {
    const response = await page.goto(`${HOME}/6-1`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Không có màn này" })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Về danh sách màn" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Gom thạch" })).toBeVisible();
  });
});

test.describe("Một màn", () => {
  test("Chơi bằng bàn phím: solve 1-1, the panel, the best kept, and the next level", async ({
    page,
  }) => {
    await openLevel(page, "1-1");
    await expect(page.getByText(/Đi vào thạch để đẩy nó/)).toBeVisible();
    await keys(page, "LLU");
    await expect(steps(page)).toHaveText("3 bước");
    await keys(page, "R");

    const panel = page.getByRole("region", { name: "Gom xong!" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Ít bước nhất có thể!")).toBeVisible();
    await expect(page.getByRole("group", { name: "Điều khiển" })).toHaveCount(0);
    await expect(panel.getByRole("link", { name: "Màn tiếp" })).toBeFocused();

    // Mở lại màn đã giải: the solved board and panel come back.
    await page.reload();
    await expect(page.getByRole("region", { name: "Gom xong!" })).toBeVisible();

    await page
      .getByRole("region", { name: "Gom xong!" })
      .getByRole("link", { name: "Màn tiếp" })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Màn 1-2" })).toBeVisible();
    await page.getByRole("banner").getByRole("link", { name: "Danh sách màn" }).click();
    await expect(page.getByRole("link", { name: "Màn 1-1, đã giải, 4 bước" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tiếp tục: màn 1-2" })).toBeVisible();
  });

  test("Chơi bằng nút: solve 2-1 with the pad; hoàn tác and chơi lại", async ({ page }) => {
    await openLevel(page, "2-1");
    for (const move of "ULLUR") {
      await page.getByRole("button", { name: BUTTON[move as keyof typeof BUTTON] }).click();
    }
    await expect(steps(page)).toHaveText("5 bước");
    await page.getByRole("button", { name: "Hoàn tác" }).click();
    await expect(steps(page)).toHaveText("4 bước");
    await page.getByRole("button", { name: "Chơi lại màn" }).click();
    await expect(steps(page)).toHaveText("0 bước");
    await page.getByRole("button", { name: "Hoàn tác" }).click();
    await expect(steps(page)).toHaveText("4 bước");
    for (const move of "RR") {
      await page.getByRole("button", { name: BUTTON[move as keyof typeof BUTTON] }).click();
    }
    await expect(page.getByRole("region", { name: "Gom xong!" })).toBeVisible();
  });

  test("Tải lại giữa màn: the board, the count and undo come back, with no hydration error", async ({
    page,
  }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));
    await openLevel(page, "2-1");
    await keys(page, "ULL");
    await expect(steps(page)).toHaveText("3 bước");
    await page.reload();
    await expect(steps(page)).toHaveText("3 bước");
    await page.getByRole("button", { name: "Hoàn tác" }).click();
    await expect(steps(page)).toHaveText("2 bước");
    expect(problems.filter((text) => /hydrat|did not match/i.test(text))).toEqual([]);
  });

  test("Menu ngôn ngữ đang mở: its arrows and letters do not move the player", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "a keyboard's");
    await openLevel(page, "2-1");
    await page.getByRole("button", { name: /Ngôn ngữ/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await keys(page, "D");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("a");
    await page.keyboard.press("Escape");
    await expect(steps(page)).toHaveText("0 bước");
  });

  test("Vuốt trên điện thoại: a swipe on the board is a move, and the page does not scroll", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "a finger's");
    await openLevel(page, "2-1");
    const board = page.locator("[data-jelly-board]");
    const box = await board.boundingBox();
    if (box === null) throw new Error("no board");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const swipe = async (dx: number, dy: number) => {
      await board.dispatchEvent("pointerdown", {
        clientX: x,
        clientY: y,
        pointerType: "touch",
        bubbles: true,
      });
      await board.dispatchEvent("pointerup", {
        clientX: x + dx,
        clientY: y + dy,
        pointerType: "touch",
        bubbles: true,
      });
    };
    const scrolled = await page.evaluate(() => window.scrollY);
    await swipe(0, -60);
    await expect(steps(page)).toHaveText("1 bước");
    await swipe(-60, 4);
    await expect(steps(page)).toHaveText("2 bước");
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    await expect(board.locator("xpath=..")).toHaveCSS("touch-action", "none");
  });
});

test.describe("Dữ liệu trên trình duyệt này", () => {
  test("Không gửi gì đi: no request carries the moves; moving between screens asks nothing", async ({
    page,
  }) => {
    await page.goto(HOME);
    await expect(page.getByRole("link", { name: "Bắt đầu: màn 1-1" })).toBeVisible();
    const sent: string[] = [];
    page.on("request", (request) => {
      sent.push(`${request.url()} ${request.postData() ?? ""}`);
    });
    await page.getByRole("link", { name: /^Màn 2-1/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Màn 2-1" })).toBeVisible();
    await keys(page, "ULLURR");
    await expect(page.getByRole("region", { name: "Gom xong!" })).toBeVisible();
    await page.getByRole("banner").getByRole("link", { name: "Danh sách màn" }).click();
    await expect(page.getByRole("link", { name: "Màn 2-1, đã giải, 6 bước" })).toBeVisible();

    expect(sent.join("\n")).not.toContain("ULLURR");
    expect(sent.filter((line) => line.includes("/puzzles/"))).toEqual([]);
  });

  test("Mất mạng giữa buổi: from the list, a level is played and solved offline", async ({
    page,
    context,
  }) => {
    await page.goto(HOME);
    await expect(page.getByRole("link", { name: "Bắt đầu: màn 1-1" })).toBeVisible();
    await context.setOffline(true);
    await page.getByRole("link", { name: /^Màn 2-1/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Màn 2-1" })).toBeVisible();
    await keys(page, "ULLURR");
    await expect(page.getByRole("region", { name: "Gom xong!" })).toBeVisible();
    await page
      .getByRole("region", { name: "Gom xong!" })
      .getByRole("link", { name: "Danh sách màn" })
      .click();
    await expect(page.getByRole("link", { name: "Màn 2-1, đã giải, 6 bước" })).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe("Khuôn và kho đá", () => {
  test("Vừa khít khuôn: 4-1 by keys, the chip following each move, then the solved panel", async ({
    page,
  }) => {
    await openLevel(page, "4-1");
    await expect(page.getByText(/Khuôn: đưa thạch vào khuôn cùng màu/)).toBeVisible();
    const chip = page.getByRole("main").getByText(/^Khuôn \d+\/\d+$/);
    await expect(chip).toHaveText("Khuôn 0/2");
    // levels.solutions.ts: RRULULDD.
    await keys(page, "RRULULD");
    await expect(page.getByRole("region", { name: "Vừa khuôn!" })).toHaveCount(0);
    const before = await chip.innerText();
    await keys(page, "D");
    await expect(chip).toHaveText("Khuôn 2/2");
    await expect(page.getByRole("region", { name: "Vừa khuôn!" })).toBeVisible();
    await page.keyboard.press("z");
    await expect(chip).toHaveText(before);
  });

  test("Kho đá: chapter 5 opens with its hint and four ice molds; the list credits Boxoban", async ({
    page,
  }) => {
    await openLevel(page, "5-1");
    await expect(page.getByText(/Kho đá: đẩy mọi đá viên vào khuôn đá/)).toBeVisible();
    await expect(page.getByRole("main").getByText(/^Khuôn \d+\/\d+$/)).toHaveText("Khuôn 0/4");
    await page.getByRole("banner").getByRole("link", { name: "Danh sách màn" }).click();
    const chapter = page.getByRole("region", { name: "Chương 5 · Kho đá" });
    await expect(chapter).toContainText("Màn từ bộ Boxoban của DeepMind, giấy phép Apache 2.0");
    await expect(chapter.getByRole("link", { name: "Giấy phép bên thứ ba" })).toHaveAttribute(
      "href",
      "/third-party-licenses.txt",
    );
  });
});
