import { expect, type Page, test } from "@playwright/test";

import {
  choose,
  die,
  horseChoices,
  lastRoll,
  ludoPly,
  pressStart,
  rollButton,
  status,
} from "./helpers";

// The throw of the 3D die by the person at this device (change redesign-ludo-play): press and hold
// "Roll the die", let go, the die flies to the number the game drew. Every test checks the 3D die
// really ran (`data-throw="3d"`), never the 2D one quietly instead.

const overlay = (page: Page) => page.locator('[data-throw="3d"]');

/** A new game of Cờ cá ngựa on this device, or against the AI, from its setup screen. */
async function startLudo(page: Page, mode: "Cùng máy" | "Đấu với máy") {
  await page.goto("/play/ludo");
  await choose(page, "Chế độ", mode);
  await choose(page, "Số người chơi", "2 người");
  if (mode === "Đấu với máy") {
    await choose(page, "Mức độ", "Dễ");
    await choose(page, "Ai đi trước", "Tôi");
  }
  await pressStart(page);
  // Again after a game left unfinished (a retry): it is dropped.
  const dropGame = page.getByRole("dialog", { name: "Bỏ ván đang dở?" });
  const started = rollButton(page);
  await expect(dropGame.or(started)).toBeVisible();
  if (await dropGame.isVisible())
    await dropGame.getByRole("button", { name: "Bắt đầu ván mới" }).click();
  await expect(rollButton(page)).toHaveAttribute("aria-disabled", "false");
  // Loaded while idle: a press now throws the 3D die.
  await expect(rollButton(page)).toHaveAttribute("data-dice", "3d", { timeout: 15_000 });
}

/** Presses the roll button with the mouse and keeps it down. */
async function pressRoll(page: Page) {
  const box = await rollButton(page).boundingBox();
  if (box === null) throw new Error("No roll button");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

/** The number on the board once the throw is over: on the die, or beside it when the turn went. */
async function faceOnBoard(page: Page): Promise<number> {
  const label = (await die(page).getAttribute("aria-label")) ?? "";
  const onDie = /Xúc xắc: ([1-6])/.exec(label)?.[1];
  if (onDie !== undefined) return Number(onDie);
  const before = /gieo được ([1-6])/.exec((await lastRoll(page).textContent()) ?? "")?.[1];
  return Number(before);
}

/**
 * Times the next throw in the page (`performance.now()`): when the button is let go (`up`), when
 * the number is in (`fly`: the die flies to it), at rest, the overlay gone, and when the board
 * shows each move (`ply1`, `ply2`…; `plyDuringThrow` if one shows while the overlay is up).
 */
async function timeThrow(page: Page) {
  await page.evaluate(() => {
    const times: Partial<Record<string, number>> = {};
    Object.assign(window, { throwTimes: times });
    document.addEventListener(
      "pointerup",
      () => {
        times.up ??= performance.now();
      },
      { capture: true, once: true },
    );
    let lastPly = document.querySelector("[data-ply]")?.getAttribute("data-ply");
    new MutationObserver(() => {
      const now = performance.now();
      const shown = document.querySelector('[data-throw="3d"]');
      const phase = shown?.getAttribute("data-phase") ?? (times.fly === undefined ? null : "gone");
      if (phase !== null) times[phase] ??= now;
      // The face on top of the die at rest, as drawn.
      const top = shown?.getAttribute("data-top-face");
      if (top !== null && top !== undefined) times.topFace ??= Number(top);
      // Each move the board shows (`ply1`, `ply2`…), and any shown while the overlay is up.
      const ply = document.querySelector("[data-ply]")?.getAttribute("data-ply");
      if (ply !== lastPly) {
        lastPly = ply;
        times[`ply${ply ?? ""}`] ??= now;
        if (shown !== null) times.plyDuringThrow ??= now;
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  return async () => {
    const times = await page.evaluate(
      () => (window as unknown as { throwTimes: Record<string, number> }).throwTimes,
    );
    const between = (from: string, to: string) =>
      Math.round((times[to] ?? Number.NaN) - (times[from] ?? Number.NaN));
    return { between, topFace: times.topFace ?? null };
  };
}

test.beforeEach(({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("Nhấn giữ rồi thả: the overlay while held, then the die rests on the number the board shows", async ({
  page,
}) => {
  await startLudo(page, "Cùng máy");
  await expect(status(page)).toHaveText("Đến lượt Đỏ");

  await pressRoll(page);
  await expect(overlay(page)).toHaveAttribute("data-phase", "hold");
  await expect(overlay(page)).toHaveAttribute("aria-hidden", "true");
  await page.waitForTimeout(700);
  // Chưa thả thì chưa gieo.
  expect(await ludoPly(page)).toBe(0);

  const timed = await timeThrow(page);
  await page.mouse.up();
  // Dòng lượt không đổi khi đang tung.
  await expect(overlay(page)).toHaveAttribute("data-phase", /fly|rest/);
  await expect(status(page)).toHaveText("Đến lượt Đỏ");
  await expect(die(page)).toHaveAccessibleName("Xúc xắc: Đỏ sắp gieo");

  await expect(overlay(page)).toHaveCount(0, { timeout: 3000 });
  const { between, topFace } = await timed();
  console.info(
    `[ludo throw] number ${between("up", "fly")} ms after letting go; from the number: at rest ${between("fly", "rest")} ms, gone ${between("fly", "gone")} ms`,
  );
  // Gone within 1.9 s of the number by design; the spec allows 2.2 s (a slow frame, a busy runner).
  expect(between("fly", "gone")).toBeLessThanOrEqual(2200);
  // The number at rest long enough to read.
  expect(between("rest", "gone")).toBeGreaterThanOrEqual(300);

  expect(await ludoPly(page)).toBe(1);
  // Mặt trên đúng số ván ghi.
  // Mặt trên đúng số ván ghi: the face the die rested on, recorded in the page.
  expect(topFace).not.toBeNull();
  expect(await faceOnBoard(page)).toBe(topFace);
});

test("Huỷ khi đang giữ: Esc closes the overlay and rolls nothing", async ({ page }) => {
  await startLudo(page, "Cùng máy");

  await pressRoll(page);
  await expect(overlay(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(overlay(page)).toHaveCount(0);
  await page.mouse.up();

  await page.waitForTimeout(300);
  expect(await ludoPly(page)).toBe(0);
  await expect(rollButton(page)).toHaveAttribute("aria-disabled", "false");
  await expect(die(page)).toHaveAccessibleName("Xúc xắc: Đỏ sắp gieo");
});

// (A 6 that no horse can move with, rolled once however often pressed, is checked on the board's
// own tests with the number chosen: here the number is the engine's.)
test("Đang tung thì không đi được: presses while the die flies roll nothing more", async ({
  page,
}) => {
  await startLudo(page, "Cùng máy");

  await rollButton(page).click();
  await expect(overlay(page)).toBeVisible();
  // Pressed again and again, on the button and on the overlay, while it flies.
  const box = await rollButton(page).boundingBox();
  for (let k = 0; k < 4; k += 1) {
    await page.mouse.click((box?.x ?? 0) + 10, (box?.y ?? 0) + 10);
    await page.keyboard.press("Enter");
  }
  await expect(overlay(page)).toHaveCount(0, { timeout: 3000 });

  expect(await ludoPly(page)).toBe(1);
});

test("Máy chờ cú tung của người chơi: after a lost turn, the AI rolls only once the overlay is gone", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // A new game, every horse in its stable: anything but a 6 loses the turn. A 6: a new game.
  for (let tries = 0; tries < 8; tries += 1) {
    await startLudo(page, "Đấu với máy");
    const timed = await timeThrow(page);
    await rollButton(page).click();
    await expect(overlay(page)).toHaveAttribute("data-phase", /fly|rest/);
    await expect(overlay(page)).toHaveCount(0, { timeout: 3000 });
    await expect.poll(() => ludoPly(page)).toBe(1);
    if ((await horseChoices(page).count()) > 0) continue;
    await expect(status(page)).toHaveText(/^Máy gieo được/, { timeout: 5000 });
    const { between } = await timed();
    console.info(
      `[ludo throw] the AI's roll ${between("gone", "ply2")} ms after the overlay went, ${between("fly", "ply2")} ms after the number`,
    );
    // Nothing of the AI on the board while the die was thrown; its roll after the overlay went,
    // within 3 s of the number.
    expect(Number.isNaN(between("fly", "plyDuringThrow"))).toBe(true);
    expect(between("gone", "ply2")).toBeGreaterThan(0);
    expect(between("fly", "ply2")).toBeLessThanOrEqual(3000);
    return;
  }
  throw new Error("Every roll was a 6");
});
