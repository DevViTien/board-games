import { expect, test } from "@playwright/test";

test.describe("browser language", () => {
  test.use({ locale: "ja-JP" });

  test("is used when the player has not picked one", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.getByText("ブラウザで友だちとボードゲームを楽しもう。")).toBeVisible();
  });
});

test("picked language is applied and kept after reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Chơi cờ cùng bạn bè ngay trên trình duyệt.")).toBeVisible();

  await page.getByRole("combobox", { name: "Ngôn ngữ" }).selectOption("en");

  await expect(
    page.getByText("Play board games with friends, right in your browser."),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Ludo" })).toBeVisible();
});
