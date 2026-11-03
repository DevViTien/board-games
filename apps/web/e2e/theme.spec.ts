import { expect, type Page, test } from "@playwright/test";

// The page's background, which every theme sets: how a test sees which theme shows.
const LIGHT_BG = "rgb(246, 245, 241)";
const DARK_BG = "rgb(18, 19, 34)";

const background = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const themeRadio = (page: Page, name: string) =>
  page.getByRole("group", { name: "Giao diện" }).getByRole("radio", { name });

/** Errors the page logs (a hydration mismatch is one) or throws, from now on. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** Picks a theme as a player does: the radios are hidden, their labels show the choice. */
async function pickTheme(page: Page, name: string): Promise<void> {
  await page
    .getByRole("group", { name: "Giao diện" })
    .locator("label")
    .filter({ hasText: name })
    .click();
  await expect(themeRadio(page, name)).toBeChecked();
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

    // A new visit to another page: the HTML the server sends is already dark.
    const response = await page.request.get("/play/tictactoe");
    expect(await response.text()).toMatch(/<html[^>]* data-theme="dark"/);
    await page.goto("/play/tictactoe");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background(page)).toBe(DARK_BG);
    expect(errors).toEqual([]);
  });

  test("a remembered dark theme renders the menu dark and its switcher on Tối, without a hydration error", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "theme", value: "dark", url: baseURL ?? "" }]);
    const errors = collectErrors(page);

    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(themeRadio(page, "Tối")).toBeChecked();
    expect(await background(page)).toBe(DARK_BG);
    // Let hydration finish and report.
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });

  test("Chọn bằng bàn phím: the arrow keys step through the themes", async ({ page }) => {
    await page.goto("/");
    await themeRadio(page, "Theo hệ thống").focus();

    await page.keyboard.press("ArrowLeft");

    await expect(themeRadio(page, "Tối")).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
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
    await expect(themeRadio(page, "Theo hệ thống")).toBeChecked();
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
