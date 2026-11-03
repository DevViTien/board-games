import path from "node:path";

import { type Page, test } from "@playwright/test";

/**
 * Saves a full-page screenshot of `page` as `<screen>.png` in the running project's folder
 * (`.ui-shots/<viewport>-<scheme>/`). Waits for the web fonts, and finishes CSS animations so a
 * shot shows where they end.
 */
export async function shoot(page: Page, screen: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: path.join(test.info().project.outputDir, `${screen}.png`),
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
}
