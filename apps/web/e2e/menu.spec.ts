import { expect, test } from "@playwright/test";

test("home page shows the game menu", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Board Games Hub");
  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(4);
});
