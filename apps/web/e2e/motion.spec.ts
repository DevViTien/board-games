import { expect, type Page, test } from "@playwright/test";

import {
  horseChoices,
  LUDO_FOUR_CHOICES,
  PAGE_WITHOUT_STORAGE,
  savedLudoGame,
  startLocalGame,
  writeSaved,
} from "./helpers";

// Design §10 of `polish-accessibility-and-mobile`: a game's card lifts when pointed at or reached
// with Tab, without pushing anything around; nothing moves when motion is reduced; nothing stays
// "hovered" on a touch screen. And the dialogs open without motion when it is reduced (§4).

const card = (page: Page, name: string) =>
  page.getByRole("listitem").filter({ has: page.getByRole("heading", { name }) });

/** The boxes of every game card. */
function cardBoxes(page: Page) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { level: 2 }) })
    .evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return [box.x, box.y, box.width, box.height].map(Math.round);
      }),
    );
}

/** The card's own box (its `Card`), as drawn: lifted or not. */
const lift = (page: Page, name: string) =>
  card(page, name)
    .locator("> div")
    .evaluate((element) => getComputedStyle(element).translate);

test.describe("with a mouse", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "a device that hovers");
  });

  test("a card pointed at lifts, the others stay where they were", async ({ page }) => {
    await page.goto("/");
    const before = await cardBoxes(page);

    await card(page, "Cờ caro").hover();

    await expect.poll(() => lift(page, "Cờ caro")).not.toBe("none");
    expect(await cardBoxes(page)).toEqual(before);
    expect(await lift(page, "Tic-tac-toe")).toBe("none");
  });

  test("a card reached with Tab lifts as when pointed at", async ({ page }) => {
    await page.goto("/");
    await card(page, "Cờ vua").getByRole("link", { name: "Chơi", exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");

    await expect.poll(() => lift(page, "Cờ vua")).not.toBe("none");
  });

  test.describe("when motion is reduced", () => {
    test.use({ reducedMotion: "reduce" });

    test("a card pointed at does not move, and a dialog opens without motion", async ({ page }) => {
      await page.goto("/");
      await card(page, "Cờ caro").hover();
      expect(await lift(page, "Cờ caro")).toBe("none");
      expect(
        await card(page, "Cờ caro")
          .locator("> div")
          .evaluate((element) => getComputedStyle(element).transitionProperty),
      ).toBe("none");

      await startLocalGame(page);
      await page.getByRole("button", { name: "Luật chơi" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.getAnimations().filter((a) => a.playState === "running").length,
        ),
      ).toBe(0);
    });
  });
});

test.describe("Cờ cá ngựa's horses to choose", () => {
  async function openChoices(page: Page) {
    await page.goto(PAGE_WITHOUT_STORAGE);
    await writeSaved(page, "ludo:local", savedLudoGame(4, LUDO_FOUR_CHOICES));
    await page.goto("/play/ludo/local");
    await expect(horseChoices(page)).toHaveCount(4);
  }
  const bobbing = (page: Page) =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation instanceof CSSAnimation &&
              animation.animationName === "piece-bob",
          ).length,
    );

  test("bob on their squares", async ({ page }) => {
    await openChoices(page);
    expect(await bobbing(page)).toBe(4);
  });

  test.describe("when motion is reduced", () => {
    test.use({ reducedMotion: "reduce" });

    test("stand still, still ringed", async ({ page }) => {
      await openChoices(page);
      expect(await bobbing(page)).toBe(0);
      await expect(page.locator("[data-ring]")).toHaveCount(4);
    });
  });
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("no hover: a card tapped does not stay lifted", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => window.matchMedia("(hover: hover)").matches)).toBe(false);
    // Every hover style of the build sits inside `@media (hover: hover)`.
    const unguarded = await page.evaluate(() => {
      const found: string[] = [];
      const walk = (rules: CSSRuleList, guarded: boolean) => {
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule) {
            walk(rule.cssRules, guarded || rule.conditionText.includes("hover: hover"));
          } else if (rule instanceof CSSStyleRule && rule.selectorText.includes(":hover")) {
            if (!guarded) found.push(rule.selectorText);
          } else if ("cssRules" in rule) {
            walk((rule as CSSGroupingRule).cssRules, guarded);
          }
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules, false);
      return found;
    });
    expect(unguarded).toEqual([]);

    await card(page, "Cờ caro").getByRole("heading").tap();
    // Not lifted (a tap may leave it `:active`, which only settles it).
    expect(await lift(page, "Cờ caro")).not.toContain("-");
  });
});
