import { expect, test } from "@playwright/test";

import { languageButton, MENU_HEADING, themeButton } from "./helpers";

test("home page shows the game menu", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Board Games Hub");
  await expect(page.getByRole("heading", { level: 1, name: MENU_HEADING })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("Board Games Hub");
  // Six games and Gom thạch.
  await expect(page.getByRole("listitem")).toHaveCount(7);
});

test("Thẻ Cờ caro: a card has two ways in, Play and Online", async ({ page }) => {
  await page.goto("/");

  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Cờ caro" }) });
  await expect(card.getByRole("link", { name: "Chơi", exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: "Online" })).toBeVisible();
  await expect(card.getByText("Sắp có")).toHaveCount(0);
});

test("Mở game để chơi online: Online opens the setup screen with online play chosen", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Cờ caro" }) })
    .getByRole("link", { name: "Online" })
    .click();

  await expect(page).toHaveURL(/\/play\/caro\?mode=online$/);
  await expect(
    page.getByRole("group", { name: "Chế độ" }).getByRole("radio", { name: "Online" }),
  ).toBeChecked();
  await expect(page.getByRole("button", { name: "Tạo phòng" })).toBeVisible();
});

test("nothing scrolls sideways on a 360 px wide screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: MENU_HEADING })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await expect(themeButton(page)).toBeInViewport({ ratio: 1 });
  await expect(languageButton(page)).toBeInViewport({ ratio: 1 });
});

test("Mở danh sách giấy phép: the menu's footer opens the third-party licences", async ({
  page,
}) => {
  await page.goto("/");
  const licences = page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Giấy phép bên thứ ba" });
  // A target of 24 px or more (WCAG 2.5.8).
  expect((await licences.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(24);

  await licences.click();

  await expect(page).toHaveURL(/\/third-party-licenses\.txt$/u);
  await expect(page.locator("body")).toContainText("chess.js");
  await expect(page.locator("body")).toContainText("staunty");
});
