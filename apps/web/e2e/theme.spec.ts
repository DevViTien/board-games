import { expect, type Page, test } from "@playwright/test";

import { pickTheme, themeButton } from "./helpers";

// The page's background, which every theme sets: how a test sees which theme shows.
const LIGHT_BG = "rgb(246, 245, 241)";
const DARK_BG = "rgb(18, 19, 34)";

const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Errors the page logs (a hydration mismatch is one) or throws, from now on. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("on a light system", () => {
  test.use({ colorScheme: "light" });

  test("Chọn giao diện tối, then Giữ giao diện sau khi tải lại: dark from the server's HTML", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    expect(await background(page)).toBe(LIGHT_BG);

    await pickTheme(page, "Tối");
    // At once, without loading the page again.
    await expect.poll(() => background(page)).toBe(DARK_BG);
    await expect(themeButton(page)).toHaveAccessibleName("Giao diện: Tối");

    // A new visit to another page: the HTML the server sends is already dark.
    const response = await page.request.get("/play/tictactoe");
    expect(await response.text()).toMatch(/<html[^>]* data-theme="dark"/);
    await page.goto("/play/tictactoe");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background(page)).toBe(DARK_BG);
    await expect(themeButton(page)).toHaveAccessibleName("Giao diện: Tối");
    expect(errors).toEqual([]);
  });

  test("a remembered dark theme renders the menu dark and its button on Tối, without a hydration error", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "theme", value: "dark", url: baseURL ?? "" }]);
    const errors = collectErrors(page);

    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(themeButton(page)).toHaveAccessibleName("Giao diện: Tối");
    expect(await background(page)).toBe(DARK_BG);
    // Let hydration finish and report.
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("Chọn bằng bàn phím: Tab to the button, Enter, ↓ and Enter choose the next theme", async ({
    page,
  }) => {
    await page.goto("/");
    await themeButton(page).focus();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitemradio", { name: "Theo hệ thống" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitemradio", { name: "Sáng" })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(themeButton(page)).toBeFocused();
    await expect(themeButton(page)).toHaveAccessibleName("Giao diện: Sáng");
  });
});

test("Theo hệ thống: follows the system as it changes, without a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await pickTheme(page, "Tối");
  await pickTheme(page, "Theo hệ thống");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(await background(page)).toBe(LIGHT_BG);

  await page.emulateMedia({ colorScheme: "dark" });

  await expect.poll(() => background(page)).toBe(DARK_BG);
});

test.describe("on a dark system", () => {
  test.use({ colorScheme: "dark" });

  test("Lựa chọn đã nhớ hỏng: a broken remembered theme follows the system, without an error", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "theme", value: "khong-hop-le", url: baseURL ?? "" }]);
    const errors = collectErrors(page);

    await page.goto("/");

    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    expect(await background(page)).toBe(DARK_BG);
    await expect(themeButton(page)).toHaveAccessibleName("Giao diện: Theo hệ thống");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
