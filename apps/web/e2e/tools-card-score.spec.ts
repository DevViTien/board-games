import { expect, type Locator, type Page, test } from "@playwright/test";

import { createCardGroup, enterRound, roundButton, scoreField, standings } from "./helpers";

// Specs `toolbox` and `card-score` in a real browser: real IndexedDB, the real dialog, the keypad on
// a touch device (the "mobile" project) and the keyboard elsewhere.

const FOUR = ["Lan", "Minh", "Hùng", "Tú"];
const save = (page: Page) => page.getByRole("button", { name: "Lưu ván" });

test.describe("Lối vào", () => {
  test("Mở từ menu, Thấy ngay trên điện thoại: menu, toolbox, tool, and the way back up", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const entry = page.getByRole("link", { name: "Hộp công cụ" });
    await expect(entry).toBeInViewport({ ratio: 1 });
    await entry.click();

    await expect(page).toHaveURL(/\/tools$/);
    await expect(page.getByRole("heading", { level: 1, name: "Hộp công cụ" })).toBeVisible();
    await page.getByRole("link", { name: /Ghi điểm đánh bài/ }).click();

    await expect(page).toHaveURL(/\/tools\/card-score$/);
    await expect(page.getByRole("heading", { level: 1, name: "Ghi điểm đánh bài" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chưa có nhóm nào" })).toBeVisible();
    await page.getByRole("banner").getByRole("link", { name: "Hộp công cụ" }).click();
    await expect(page).toHaveURL(/\/tools$/);
  });

  test("Đường dẫn không có, and a group not on this browser", async ({ page }) => {
    const response = await page.goto("/tools/card-score/a/b/c");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();

    await page.goto("/tools/card-score/nhom-o-may-khac");
    await expect(
      page.getByRole("heading", { name: "Không thấy nhóm này trên trình duyệt này" }),
    ).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Các nhóm" }).click();
    await expect(page).toHaveURL(/\/tools\/card-score$/);
  });
});

test.describe("Một buổi chơi", () => {
  test("creates a group, types a round, sees it worked out, corrects it, deletes it, and reloads", async ({
    page,
  }) => {
    await createCardGroup(page, FOUR, "Team Dev");
    await expect(page.getByRole("heading", { level: 1, name: "Team Dev" })).toBeVisible();

    await enterRound(page, ["-10", "-20", "-5"]);
    await expect(page.getByText("Tú được tự tính: +35")).toBeVisible();
    await expect(page.locator('[data-auto-score="p4"]')).toHaveText("+35");
    // The number stays on show when its own field is chosen: a focused field rises above the rest.
    await scoreField(page, "Tú").focus();
    const above = await page.locator('[data-auto-score="p4"]').evaluate((number) => {
      const field = number.parentElement?.querySelector("input");
      return (
        Number(getComputedStyle(number).zIndex) > Number(field && getComputedStyle(field).zIndex)
      );
    });
    expect(above).toBe(true);
    await save(page).click();

    await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();
    await expect(standings(page)).toHaveText([/Tú.*\+35/, /Hùng.*−5/, /Lan.*−10/, /Minh.*−20/]);
    await expect(roundButton(page, "Nhập ván 2")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gợi ý cân điểm" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("region", { name: "Bảng các ván" })).toContainText("+35");

    // Corrected: everyone's totals follow.
    await page.getByRole("button", { name: "Sửa ván 1" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Sửa ván 1" })).toBeVisible();
    await expect(scoreField(page, "Tú")).toHaveValue("35");
    await page.getByRole("button", { name: "Xoá ván này" }).click();
    await page.getByRole("button", { name: "Giữ lại" }).click();
    await page.getByRole("button", { name: "Đóng" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await enterRound(page, ["30", "-10", "-10"]);
    await save(page).click();
    await expect(page.getByRole("status").getByText("Đã lưu ván 2.")).toBeVisible();

    await page.getByRole("button", { name: "Sửa ván 1" }).first().click();
    await page.getByRole("button", { name: "Xoá ván này" }).click();
    await page.getByRole("button", { name: "Xoá ván", exact: true }).click();
    await expect(page.getByRole("status").getByText("Đã xoá ván 1.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sửa ván 2" })).toHaveCount(0);
    await expect(roundButton(page, "Nhập ván 2")).toBeFocused();
    await expect(standings(page).first()).toContainText("+30");
  });

  test("after a new round the page is at the top: the message and the standings on screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await createCardGroup(page, FOUR, "Team Dev");
    await enterRound(page, ["1", "-1", "0"]);
    await save(page).click();
    await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByRole("heading", { name: "Xếp hạng" })).toBeInViewport();

    // Opening and closing a round moves nothing, wherever the page was.
    const scrolled = await page.evaluate(() => {
      window.scrollTo(0, 60);
      return window.scrollY;
    });
    expect(scrolled).toBeGreaterThan(0);
    await roundButton(page, "Nhập ván 2").evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    await page.getByRole("button", { name: "Đóng" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);
  });

  test("Điền đủ mà lệch: not saved, and how far off", async ({ page }) => {
    await createCardGroup(page, ["Lan", "Minh", "Hùng"]);
    await enterRound(page, ["5", "5", "-5"]);
    await expect(page.getByText("Tổng đang lệch +5")).toBeVisible();
    await save(page).click({ force: true });
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("region", { name: "Bảng các ván" })).toHaveCount(0);
  });

  test("Thêm người, cho nghỉ, buổi mới: the old group stays", async ({ page }) => {
    await createCardGroup(page, FOUR, "Team Dev");
    await enterRound(page, ["10", "-10", "0"]);
    await save(page).click();
    await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();

    await page.getByRole("link", { name: "Sửa nhóm" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sửa nhóm" })).toBeVisible();
    await page.getByRole("textbox", { name: "Tên người mới" }).fill("Nam");
    await page.getByRole("button", { name: "Thêm người" }).click();
    await expect(page.getByRole("textbox", { name: "Tên của Nam" })).toBeVisible();
    await page.getByRole("button", { name: "Cho nghỉ: Tú" }).click();
    await expect(page.getByRole("button", { name: "Chơi lại: Tú" })).toBeVisible();

    await page.getByRole("link", { name: "Xong" }).click();
    await expect(standings(page).filter({ hasText: "Tú" })).toContainText("Đã nghỉ");
    await expect(page.getByRole("region", { name: "Bảng các ván" })).toContainText("—");
    await roundButton(page, "Nhập ván 2").click();
    await expect(scoreField(page, "Nam")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Tú" })).toHaveCount(0);
    await page.getByRole("button", { name: "Đóng" }).click();

    await page.getByRole("link", { name: "Buổi mới" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Buổi mới" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Tên nhóm" })).toHaveValue("Team Dev");
    await expect(page.getByRole("textbox", { name: "Người chơi 4" })).toHaveValue("Nam");
    await page.getByRole("button", { name: "Tạo nhóm" }).click();
    await expect(roundButton(page, "Nhập ván 1")).toBeVisible();

    // Quay lại sau khi tạo: Back skips the form, and the two groups are there.
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Team Dev" })).toBeVisible();
    await expect(roundButton(page, "Nhập ván 2")).toBeVisible();
    await page.getByRole("banner").getByRole("link", { name: "Các nhóm" }).click();
    await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(2);
  });

  test("Xoá nhóm: the link no longer finds it", async ({ page }) => {
    await createCardGroup(page, ["Lan", "Minh"], "Team Dev");
    const address = page.url();
    await page.getByRole("button", { name: "Xoá nhóm" }).click();
    await page
      .getByRole("dialog", { name: 'Xoá nhóm "Team Dev"?' })
      .getByRole("button", { name: "Xoá nhóm" })
      .click();
    await expect(page).toHaveURL(/\/tools\/card-score$/);
    await expect(page.getByRole("heading", { name: "Chưa có nhóm nào" })).toBeVisible();
    await page.goto(address);
    await expect(
      page.getByRole("heading", { name: "Không thấy nhóm này trên trình duyệt này" }),
    ).toBeVisible();
  });

  test("Tải lại giữa chừng: the round comes back", async ({ page }) => {
    await createCardGroup(page, FOUR);
    await enterRound(page, ["7", "-3"]);
    await expect(scoreField(page, "Minh")).toHaveValue("−3");
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(scoreField(page, "Lan")).toHaveValue("7");
    await expect(scoreField(page, "Minh")).toHaveValue("−3");
  });

  test("Đóng khi đang nhập dở, Esc lặp lại: the real dialog stays usable", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Esc is a keyboard's");
    await createCardGroup(page, ["Lan", "Minh", "Hùng"]);
    await enterRound(page, ["5"]);
    for (let presses = 0; presses < 3; presses += 1) await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Bỏ ván đang nhập?" })).toBeVisible();
    await page.getByRole("button", { name: "Nhập tiếp" }).click();
    await expect(scoreField(page, "Lan")).toHaveValue("5");
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Đóng" }).click();
    await page.getByRole("button", { name: "Bỏ ván" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    // The focus is back on what opened it, and it opens again.
    await expect(roundButton(page, "Nhập ván 1")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("Bàn số", () => {
  test("a touch device: the keypad, asking for no keyboard; the choice of the device's own is kept", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "a finger's");
    await createCardGroup(page, FOUR);
    await roundButton(page, "Nhập ván 1").click();

    const keypad = page.getByRole("group", { name: "Bàn số" });
    await expect(keypad).toBeInViewport({ ratio: 1 });
    await expect(scoreField(page, "Lan")).toHaveAttribute("inputmode", "none");
    await expect(scoreField(page, "Lan")).toBeFocused();

    const press = (name: string) => keypad.getByRole("button", { name, exact: true }).tap();
    await press("1");
    await press("2");
    await press("Đổi dấu");
    await press("Tiếp");
    await expect(scoreField(page, "Lan")).toHaveValue("−12");
    await expect(scoreField(page, "Minh")).toBeFocused();
    await press("5");
    await press("Tiếp");
    await expect(scoreField(page, "Hùng")).toBeFocused();
    await press("7");
    await expect(page.getByText("Tú được tự tính: 0")).toBeVisible();

    // A field chosen again: its number goes with the first key.
    await scoreField(page, "Minh").tap();
    await press("Xoá lùi");
    await expect(scoreField(page, "Minh")).toHaveValue("");
    await expect(page.getByText("Còn 2 người chưa nhập")).toBeVisible();

    await page.getByRole("button", { name: "Dùng bàn phím của máy" }).tap();
    await expect(keypad).toBeHidden();
    await expect(scoreField(page, "Lan")).toHaveAttribute("inputmode", "numeric");
    await expect(save(page)).toBeInViewport({ ratio: 1 });
    await page.reload();
    await expect(scoreField(page, "Lan")).toHaveAttribute("inputmode", "numeric");
    await page.getByRole("button", { name: "Dùng bàn số" }).tap();
    await expect(keypad).toBeVisible();
  });

  test("Gõ trên máy tính: -12, Enter; no keypad", async ({ page, isMobile }) => {
    test.skip(isMobile, "a keyboard's");
    await createCardGroup(page, ["Lan", "Minh", "Hùng"]);
    await roundButton(page, "Nhập ván 1").click();
    await expect(scoreField(page, "Lan")).toBeFocused();
    await page.keyboard.type("-12");
    await page.keyboard.press("Enter");
    await expect(scoreField(page, "Lan")).toHaveValue("−12");
    await expect(scoreField(page, "Minh")).toBeFocused();
    await expect(page.getByRole("group", { name: "Bàn số" })).toHaveCount(0);

    // A number typed over: the field chosen again is selected whole.
    await scoreField(page, "Lan").focus();
    await page.keyboard.type("5");
    await expect(scoreField(page, "Lan")).toHaveValue("5");
    await page.keyboard.press("Enter");
    await page.keyboard.type("-5");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();
  });
});

/** Presses Tab until `target` has the focus: it is reached by the keyboard, or the test fails. */
async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let presses = 0; presses < 40; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

test("Cả luồng bằng bàn phím: create, save, correct and delete by Tab, Enter and digits", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "a keyboard's");
  await page.goto("/tools/card-score/new");
  await tabTo(page, page.getByRole("textbox", { name: "Người chơi 1" }));
  await page.keyboard.type("Lan");
  await tabTo(page, page.getByRole("textbox", { name: "Người chơi 2" }));
  await page.keyboard.type("Minh");
  await page.keyboard.press("Enter");

  const enter = roundButton(page, "Nhập ván 1");
  await expect(enter).toBeVisible();
  await tabTo(page, enter);
  await page.keyboard.press("Enter");
  await expect(scoreField(page, "Lan")).toBeFocused();
  await page.keyboard.type("7");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();
  await expect(roundButton(page, "Nhập ván 2")).toBeFocused();

  // Corrected, from the message, and saved.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "Sửa ván 1" })).toBeVisible();
  await page.keyboard.type("9");
  await page.keyboard.press("Tab");
  await page.keyboard.type("-9");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").getByText("Đã sửa ván 1.")).toBeVisible();
  await expect(standings(page).first()).toContainText("+9");

  // Deleted, from the table.
  await tabTo(
    page,
    page.getByRole("region", { name: "Bảng các ván" }).getByRole("button", { name: "Sửa ván 1" }),
  );
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByRole("button", { name: "Xoá ván này" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Giữ lại" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").getByText("Đã xoá ván 1.")).toBeVisible();
  await expect(roundButton(page, "Nhập ván 1")).toBeFocused();
});

test.describe("Dữ liệu trên trình duyệt này", () => {
  test("Không gửi lên mạng: no request carries a name or a score; moving between screens asks nothing", async ({
    page,
  }) => {
    const NAME = "Tenrieng";
    await page.goto("/tools/card-score/new");
    await expect(page.getByRole("textbox", { name: "Người chơi 1" })).toBeVisible();

    const sent: string[] = [];
    page.on("request", (request) => {
      sent.push(`${request.url()} ${request.postData() ?? ""}`);
    });
    const socketFrames: string[] = [];
    page.on("websocket", (socket) => {
      socket.on("framesent", ({ payload }) => socketFrames.push(String(payload)));
    });

    await page.getByRole("textbox", { name: "Người chơi 1" }).fill(NAME);
    await page.getByRole("textbox", { name: "Người chơi 2" }).fill("Khac");
    await page.getByRole("button", { name: "Tạo nhóm" }).click();
    await expect(page.getByRole("heading", { level: 1, name: `${NAME}, Khac` })).toBeVisible();
    await enterRound(page, ["4242"]);
    await save(page).click();
    await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();
    await page.getByRole("link", { name: "Sửa nhóm" }).click();
    await page.getByRole("link", { name: "Xong" }).click();
    await page.getByRole("banner").getByRole("link", { name: "Các nhóm" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ghi điểm đánh bài" })).toBeVisible();

    const everything = [...sent, ...socketFrames].join("\n");
    expect(everything).not.toContain(NAME);
    expect(everything).not.toContain("4242");
    // The screens are one page: nothing asked of the server to move between them.
    expect(sent.filter((line) => line.includes("/tools/"))).toEqual([]);
    expect(socketFrames).toEqual([]);
  });

  test("Mất mạng giữa buổi: every screen of the tool still works", async ({ page, context }) => {
    await createCardGroup(page, ["Lan", "Minh"], "Team Dev");
    await context.setOffline(true);

    await enterRound(page, ["5"]);
    await save(page).click();
    await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();

    await page.getByRole("button", { name: "Sửa ván 1" }).first().click();
    await page.getByRole("button", { name: "Đóng" }).click();

    await page.getByRole("link", { name: "Sửa nhóm" }).click();
    await page.getByRole("textbox", { name: "Tên người mới" }).fill("Nam");
    await page.getByRole("button", { name: "Thêm người" }).click();
    await expect(page.getByRole("textbox", { name: "Tên của Nam" })).toBeVisible();
    await page.getByRole("link", { name: "Xong" }).click();
    await expect(roundButton(page, "Nhập ván 2")).toBeVisible();

    await page.getByRole("banner").getByRole("link", { name: "Các nhóm" }).click();
    await page.getByRole("link", { name: "Tạo nhóm" }).click();
    await page.getByRole("textbox", { name: "Người chơi 1" }).fill("An");
    await page.getByRole("textbox", { name: "Người chơi 2" }).fill("Bình");
    await page.getByRole("button", { name: "Tạo nhóm" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "An, Bình" })).toBeVisible();

    await page.getByRole("banner").getByRole("link", { name: "Các nhóm" }).click();
    await page.getByRole("link", { name: /Team Dev/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Team Dev" })).toBeVisible();
    await expect(roundButton(page, "Nhập ván 2")).toBeVisible();
    await context.setOffline(false);
  });

  test("Hai tab lưu cùng lúc: every round of both is kept, on real IndexedDB", async ({
    page,
    context,
  }) => {
    await createCardGroup(page, ["Lan", "Minh"]);
    const other = await context.newPage();
    await other.goto(page.url());
    await expect(other.getByRole("heading", { level: 1 })).toBeVisible();

    const ROUNDS = 6;
    for (let round = 0; round < ROUNDS; round += 1) {
      await Promise.all([page, other].map((tab) => enterRound(tab, [String(round + 1)])));
      await Promise.all([page, other].map((tab) => save(tab).click()));
      await Promise.all([page, other].map((tab) => expect(tab.getByRole("dialog")).toBeHidden()));
    }

    // Quay lại tab cũ: each sees everything once it comes back to the front.
    for (const tab of [page, other]) {
      await tab.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect(roundButton(tab, `Nhập ván ${ROUNDS * 2 + 1}`)).toBeVisible();
    }
  });
});

test.describe("Chia sẻ tổng kết", () => {
  test("Máy không có bảng chia sẻ: copied in full, and said", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined });
    });
    await createCardGroup(page, ["Lan", "Minh", "Hùng"], "Team Dev");
    await enterRound(page, ["30", "-10"]);
    await save(page).click();
    await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();

    await page.getByRole("button", { name: "Chia sẻ tổng kết" }).click();
    await expect(page.getByRole("status").getByText("Đã sao chép tổng kết.")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("Team Dev");
    expect(copied).toContain("1 ván");
    expect(copied).toContain("1. Lan: +30");
    expect(copied).toContain("Hùng → Lan: 20 điểm");
  });

  test("Không sao chép được: the words in a dialog, to select", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined });
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("refused")) },
      });
    });
    await createCardGroup(page, ["Lan", "Minh"], "Team Dev");
    await enterRound(page, ["3"]);
    await save(page).click();
    await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();
    await page.getByRole("button", { name: "Chia sẻ tổng kết" }).click();
    await expect(page.getByRole("dialog", { name: "Tổng kết" })).toContainText("1. Lan: +3");
  });
});
