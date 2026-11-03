import { expect, test } from "@playwright/test";

test.describe("browser language", () => {
  test.use({ locale: "ja-JP" });

  test("is used when the player has not picked one", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(
      page.getByRole("heading", { level: 1, name: "友だちとボードゲーム、ブラウザですぐに" }),
    ).toBeVisible();
  });
});

test("picked language is applied and kept after reload", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Chơi cờ cùng bạn bè, ngay trên trình duyệt" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Play board games with friends, right in your browser",
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "English" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.reload();
  await expect(page.getByRole("heading", { name: "Ludo" })).toBeVisible();
});
