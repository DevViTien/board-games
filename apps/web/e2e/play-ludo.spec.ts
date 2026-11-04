import { type Browser, expect, type Page, test } from "@playwright/test";

import {
  choose,
  die,
  horseChoices,
  horsePositions,
  lastRoll,
  ludoPly,
  PAGE_WITHOUT_STORAGE,
  playLudoTurnWithKeyboard,
  pressStart,
  rollButton,
  savedLudoGame,
  status,
  writeSaved,
} from "./helpers";

// Cờ cá ngựa. Real dice (`cryptoRng`) decide most of a game here, so these tests only check what
// holds whatever is rolled; the rules themselves are pinned down by positions saved in advance.

const COLOURS = {
  2: ["Đỏ", "Vàng"],
  3: ["Đỏ", "Xanh dương", "Vàng"],
  4: ["Đỏ", "Xanh dương", "Vàng", "Xanh lá"],
} as const;
type Players = keyof typeof COLOURS;

/** From the menu's Cờ cá ngựa card, through the setup screen, to a new game for `players`. */
async function startLudo(page: Page, mode: "Cùng máy" | "Đấu với máy", players: Players) {
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Cờ cá ngựa" }) })
    .getByRole("link", { name: "Chơi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/play\/ludo$/);
  await choose(page, "Chế độ", mode);
  await choose(page, "Số người chơi", `${players} người`);
  if (mode === "Đấu với máy") {
    await choose(page, "Mức độ", "Dễ");
    await choose(page, "Ai đi trước", "Tôi");
  }
  await pressStart(page);
  await expect(page).toHaveURL(mode === "Cùng máy" ? /\/play\/ludo\/local$/ : /\/play\/ludo\/ai$/);
  await expect(rollButton(page)).toBeVisible();
}

function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

for (const players of [2, 3, 4] as const) {
  const colours = COLOURS[players];

  test(`plays a few turns of a ${players}-player game on one device with the keyboard`, async ({
    page,
  }) => {
    await startLudo(page, "Cùng máy", players);
    await expect(horsePositions(page)).toHaveCount(4 * players);
    await expect(status(page)).toHaveText("Đến lượt Đỏ");

    let seat = 0;
    for (let turn = 0; turn < 6; turn += 1) {
      const face = await playLudoTurnWithKeyboard(page);
      // A 6 rolls again; any other number passes the turn on, in the direction of play.
      if (face !== 6) seat = (seat + 1) % players;
      await expect(status(page)).toHaveText(`Đến lượt ${colours[seat] ?? ""}`);
    }

    const positions = await horsePositions(page).allTextContents();
    await page.reload();
    await expect(horsePositions(page)).toHaveText(positions);
    await expect(status(page)).toHaveText(`Đến lượt ${colours[seat] ?? ""}`);
  });

  test(`plays against ${players - 1} AI${players > 2 ? "s" : ""} at Easy, which roll and move by themselves`, async ({
    page,
  }) => {
    await startLudo(page, "Đấu với máy", players);
    await expect(horsePositions(page)).toHaveCount(4 * players);
    await expect(status(page)).toHaveText("Đến lượt bạn (Đỏ)");

    // Back to the player once every AI has played, the last one named when there are several.
    const lastAi = players === 2 ? "" : ` \\(${colours[players - 1] ?? ""}\\)`;
    const backToPlayer = new RegExp(`^Máy${lastAi} .+\\. Đến lượt bạn \\(Đỏ\\)$`);
    let rounds = 0;
    let roundMs = 0;
    while (rounds < 2) {
      const face = await playLudoTurnWithKeyboard(page);
      if (face === 6) continue;
      const started = Date.now();
      await expect(status(page)).toHaveText(backToPlayer, { timeout: 45_000 });
      roundMs = Math.max(roundMs, Date.now() - started);
      rounds += 1;
    }
    test.info().annotations.push({
      type: "ai-round",
      description: `${players - 1} AI(s) at Easy: longest round ${roundMs} ms`,
    });
    console.info(`[ludo e2e] ${players} players, longest AI round: ${roundMs} ms`);

    const said = (await status(page).textContent()) ?? "";
    const positions = await horsePositions(page).allTextContents();
    await page.reload();
    await expect(horsePositions(page)).toHaveText(positions);
    await expect(status(page)).toHaveText(said);
  });
}

test("jumps to the next gate on a 1 with the way clear, as the only choice for that horse", async ({
  page,
}) => {
  // Red brings a horse out (6), moves it 4 squares, Yellow loses the turn, Red rolls a 1: the
  // horse stands 9 squares before the next gate (Blue's), the way clear.
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(
    page,
    "ludo:local",
    savedLudoGame(2, [
      { roll: 6 },
      { horse: 0 },
      { roll: 4 },
      { horse: 0 },
      { roll: 2 },
      { roll: 1 },
    ]),
  );
  await page.goto("/play/ludo/local");

  await expect(horsePositions(page).first()).toHaveText("Đỏ, ngựa 1: ô 5");
  await expect(horseChoices(page)).toHaveText(["Ngựa 1: tới ô 14"]);
  await horseChoices(page).first().click();

  await expect(horsePositions(page).first()).toHaveText("Đỏ, ngựa 1: ô 14 (vừa đi)");
  await expect(status(page)).toHaveText("Đến lượt Vàng");
});

test.describe("on a phone 360 px wide, with reduced motion", () => {
  test.use({ viewport: { width: 360, height: 740 }, reducedMotion: "reduce" });

  test("Bàn 4 người trên điện thoại hẹp: no sideways scrolling, every control reachable", async ({
    page,
    hasTouch,
  }) => {
    // Red rolled a 6 with a horse on the track: four choices (move it, or bring one out).
    await page.goto(PAGE_WITHOUT_STORAGE);
    await writeSaved(
      page,
      "ludo:local",
      savedLudoGame(4, [
        { roll: 6 },
        { horse: 0 },
        { roll: 3 },
        { horse: 0 },
        { roll: 2 },
        { roll: 2 },
        { roll: 2 },
        { roll: 6 },
      ]),
    );
    await page.goto("/play/ludo/local");

    await expect(horseChoices(page)).toHaveText([
      "Ngựa 1: tới ô 10",
      "Ngựa 2: ra chuồng",
      "Ngựa 3: ra chuồng",
      "Ngựa 4: ra chuồng",
    ]);
    expect(await scrollsSideways(page)).toBe(false);
    for (const control of [rollButton(page), ...(await horseChoices(page).all())]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect((box?.x ?? Infinity) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    }

    const second = horseChoices(page).nth(1);
    if (hasTouch) await second.tap();
    else await second.click();

    await expect(horsePositions(page).nth(1)).toHaveText("Đỏ, ngựa 2: ô 1 (vừa đi)");
    // A 6: Red rolls again.
    await expect(rollButton(page)).toHaveAttribute("aria-disabled", "false");
    await expect(status(page)).toHaveText("Đến lượt Đỏ");
    expect(await scrollsSideways(page)).toBe(false);
  });
});

// --- Online ------------------------------------------------------------------------------------

const ROOM_URL = /\/room\/[2-9A-HJKMNP-Z]{6}$/;
const nameField = (page: Page) => page.getByRole("textbox", { name: "Tên của bạn" });
const button = (page: Page, name: string) => page.getByRole("button", { name });

/** Minh creates a two-player Cờ cá ngựa room; Lan opens the invite link and takes the seat. */
async function startOnlineLudo(page: Page, browser: Browser) {
  await page.goto("/play/ludo");
  await choose(page, "Chế độ", "Online");
  await choose(page, "Số người chơi", "2 người");
  await nameField(page).fill("Minh");
  await button(page, "Tạo phòng").click();
  await expect(page).toHaveURL(ROOM_URL);

  const context = await browser.newContext();
  const lan = await context.newPage();
  await lan.goto(page.url());
  await nameField(lan).fill("Lan");
  await button(lan, "Vào chơi").click();
  await expect(status(page)).toHaveText("Ván mới: bạn cầm Đỏ và đi trước");
  await expect(status(lan)).toHaveText("Ván mới: bạn cầm Vàng, Minh đi trước");
  return { context, lan };
}

/** The page of the player whose turn it is; fails after 15 s without one. */
async function playerToMove(pages: readonly Page[]): Promise<Page> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const page of pages) {
      if ((await rollButton(page).getAttribute("aria-disabled")) === "false") return page;
    }
    await pages[0]?.waitForTimeout(100);
  }
  throw new Error("Nobody may roll");
}

test("Hai người cùng thấy một lần gieo: both players see every roll and move of an online game", async ({
  page,
  browser,
}) => {
  const { context, lan } = await startOnlineLudo(page, browser);
  const pages = [page, lan];

  for (let turn = 0; turn < 6; turn += 1) {
    const mover = await playerToMove(pages);
    const moved = await playLudoTurnWithKeyboard(mover);
    // The mover's moves are in (counted); the other page then shows the same moves, die and horses.
    const ply = await ludoPly(mover);
    // The die waits for the next roll; the roll just made is shown beside it.
    await expect(lastRoll(mover)).toContainText(`gieo được ${moved}`);
    const rolled = (await lastRoll(mover).textContent()) ?? "";
    const waiting = (await die(mover).getAttribute("aria-label")) ?? "";
    const positions = await horsePositions(mover).allTextContents();
    for (const other of pages) {
      await expect.poll(() => ludoPly(other)).toBe(ply);
      await expect(die(other)).toHaveAccessibleName(waiting);
      await expect(lastRoll(other)).toHaveText(rolled);
      await expect(horsePositions(other)).toHaveText(positions);
    }
  }

  // A reload brings back the same game, at the same turn.
  const said = (await status(lan).textContent()) ?? "";
  const positions = await horsePositions(lan).allTextContents();
  await lan.reload();
  await expect(horsePositions(lan)).toHaveText(positions);
  await expect(status(lan)).toHaveText(said);

  await context.close();
});
