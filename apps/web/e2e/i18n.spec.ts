import { expect, test } from "@playwright/test";

import { languageButton, pickLanguage } from "./helpers";

test.describe("browser language", () => {
  test.use({ locale: "ja-JP" });

  test("is used when the player has not picked one", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(
      page.getByRole("heading", { level: 1, name: "友だちとボードゲーム、ブラウザですぐに" }),
    ).toBeVisible();
    await expect(languageButton(page)).toHaveAccessibleName("言語: 日本語、JA");
  });
});

test("picked language is applied and kept after reload", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Chơi cờ cùng bạn bè, ngay trên trình duyệt" }),
  ).toBeVisible();

  await pickLanguage(page, "English");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Play board games with friends, right in your browser",
    }),
  ).toBeVisible();
  await expect(languageButton(page)).toHaveAccessibleName("Language: English, EN");
  // The focus stays on the button while the page changes language.
  await expect(languageButton(page)).toBeFocused();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Ludo" })).toBeVisible();
});
