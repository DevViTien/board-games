import { expect, type Page, test, type Worker } from "@playwright/test";

import {
  afterAiMove,
  board,
  boardCells,
  cell,
  continueSection,
  countMarks,
  modeLabel,
  play,
  playAndWaitForAi,
  playFirstEmptyCell,
  readSavedGame,
  savedMoveCount,
  SLOT,
  startAiGame,
  startLocalGame,
  status,
} from "./helpers";

// The browser language is pinned to Vietnamese in playwright.config.ts.

interface StatusChange {
  readonly text: string;
  readonly at: number;
  /** Whether no cell of the board could be chosen at that moment. */
  readonly locked: boolean;
}

/**
 * Records every change of the play screen in the page itself, with the time, the status line and
 * whether the board accepted a move. Checking from the test instead would race the AI's move.
 */
async function recordChanges(page: Page): Promise<void> {
  await page.evaluate(() => {
    const changes: StatusChange[] = [];
    (window as unknown as { changes: StatusChange[] }).changes = changes;
    const main = document.querySelector("main");
    if (main === null) throw new Error("no play screen");
    new MutationObserver(() => {
      const cells = [...main.querySelectorAll('[role="group"] button')];
      changes.push({
        text: main.querySelector('[role="status"]')?.textContent ?? "",
        at: performance.now(),
        locked: cells.every((button) => button.getAttribute("aria-disabled") === "true"),
      });
    }).observe(main, { subtree: true, childList: true, characterData: true, attributes: true });
  });
}

function recordedChanges(page: Page): Promise<StatusChange[]> {
  return page.evaluate(() => (window as unknown as { changes: StatusChange[] }).changes);
}

test("answers the player's move within 2 seconds, with the board locked meanwhile", async ({
  page,
}) => {
  await startAiGame(page);
  await expect(modeLabel(page, "Với máy · Vừa")).toBeVisible();
  await expect(status(page)).toHaveText("Đến lượt bạn (X)");
  await recordChanges(page);

  await cell(page, 2, 2).click();
  await expect.poll(() => countMarks(page, "O")).toBe(1);
  // Where the AI played is told, and its cell is marked as the last move.
  await expect(status(page)).toHaveText(afterAiMove("X"));
  const aiCell = board(page).getByRole("button", { name: /, O$/ });
  const aiCellName = (await aiCell.getAttribute("aria-label")) ?? "";
  expect(await status(page).textContent()).toContain(
    `Máy đánh ${aiCellName.replace(/, O$/, "").replace("Hàng", "hàng")}.`,
  );
  await expect(aiCell).toHaveAccessibleDescription("Nước vừa đi");
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, X");

  const changes = await recordedChanges(page);
  const thinking = changes.filter((change) => change.text === "Máy đang nghĩ…");
  expect(thinking.length).toBeGreaterThan(0);
  // No cell could be chosen at any moment while the AI was thinking.
  expect(thinking.every((change) => change.locked)).toBe(true);
  const [thinkingFrom] = thinking;
  const answered = changes.find(
    (change) => change.at > (thinkingFrom?.at ?? 0) && afterAiMove("X").test(change.text),
  );
  expect(answered).toBeDefined();
  expect((answered?.at ?? Infinity) - (thinkingFrom?.at ?? 0)).toBeLessThan(2000);
});

test("thinks in a real Web Worker, without falling back to the main thread", async ({ page }) => {
  const workers: Worker[] = [];
  const stopped: Worker[] = [];
  page.on("worker", (worker) => {
    workers.push(worker);
    worker.on("close", () => stopped.push(worker));
  });
  await startAiGame(page);

  await playAndWaitForAi(page, "X");
  await playAndWaitForAi(page, "X");

  // One Worker, started for the AI's first move and still running: the AI player stops it for good
  // when it falls back to the main thread (start failure, error or no answer in time).
  expect(workers).toHaveLength(1);
  expect(stopped).toHaveLength(0);
  expect(await workers[0]?.evaluate(() => typeof self.postMessage)).toBe("function");
});

test("goes back to the menu right away while the AI is thinking", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await startAiGame(page, { level: "Khó" });

  await cell(page, 1, 1).click();
  await expect(status(page)).toHaveText("Máy đang nghĩ…");
  await page.getByRole("link", { name: "Về menu" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeVisible();
  // The player's move was kept, so the game can be continued.
  await expect(
    continueSection(page).getByRole("link", { name: "Tic-tac-toe · Với máy · Khó" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("undo takes back the AI's answer with the player's move, and redo plays both again", async ({
  page,
}) => {
  await startAiGame(page);
  await playAndWaitForAi(page, "X");
  const afterOneTurn = await boardCells(page);
  await playAndWaitForAi(page, "X");
  const afterTwoTurns = await boardCells(page);

  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect.poll(() => boardCells(page)).toEqual(afterOneTurn);
  expect(await countMarks(page, "X")).toBe(1);
  expect(await countMarks(page, "O")).toBe(1);
  await expect(status(page)).toHaveText(afterAiMove("X"));

  await page.getByRole("button", { name: "Làm lại" }).click();
  await expect.poll(() => boardCells(page)).toEqual(afterTwoTurns);
  await expect(status(page)).toHaveText(afterAiMove("X"));
});

test("keeps a game against the AI across a reload, with the player's side and level", async ({
  page,
}) => {
  await startAiGame(page, { level: "Khó", first: "Máy" });
  await expect.poll(() => countMarks(page, "X")).toBe(1);
  await expect(status(page)).toHaveText(afterAiMove("O"));
  await playAndWaitForAi(page, "O");
  const played = await boardCells(page);
  // Saving is asynchronous; reload only once the last move has reached IndexedDB.
  await expect.poll(() => savedMoveCount(page, SLOT.ai)).toBe(3);

  await page.reload();

  await expect(status(page)).toHaveText(afterAiMove("O"));
  expect(await boardCells(page)).toEqual(played);
  await expect(modeLabel(page, "Với máy · Khó")).toBeVisible();
});

test("keeps the level of a game against the AI reloaded before the first move", async ({
  page,
}) => {
  await startAiGame(page, { level: "Khó" });
  // Saved from the start, with its seats, but not as a game in progress.
  await expect.poll(async () => (await readSavedGame(page, SLOT.ai))?.inProgress).toBe(false);

  await page.reload();

  await expect(modeLabel(page, "Với máy · Khó")).toBeVisible();
  await expect(status(page)).toHaveText("Đến lượt bạn (X)");
  expect(await countMarks(page, "X")).toBe(0);
  expect(await countMarks(page, "O")).toBe(0);
});

test("lists the games in progress of both modes on the menu, newest first, and opens each", async ({
  page,
}) => {
  await startLocalGame(page);
  await play(page, [2, 2]);
  await expect.poll(() => savedMoveCount(page, SLOT.local)).toBe(1);

  // A game in progress on this device does not stop a game against the AI from starting.
  await startAiGame(page, { level: "Khó" });
  await playAndWaitForAi(page, "X");
  const againstAi = await boardCells(page);
  await expect.poll(() => savedMoveCount(page, SLOT.ai)).toBe(2);

  await page.getByRole("link", { name: "Về menu" }).click();
  const links = continueSection(page).getByRole("link");
  await expect(links).toHaveText(["Tic-tac-toe · Với máy · Khó", "Tic-tac-toe · Cùng máy"]);

  await links.filter({ hasText: "Với máy · Khó" }).click();
  await expect(page).toHaveURL(/\/play\/tictactoe\/ai$/);
  await expect(modeLabel(page, "Với máy · Khó")).toBeVisible();
  await expect(status(page)).toHaveText(afterAiMove("X"));
  expect(await boardCells(page)).toEqual(againstAi);

  await page.getByRole("link", { name: "Về menu" }).click();
  await links.filter({ hasText: "Cùng máy" }).click();
  await expect(page).toHaveURL(/\/play\/tictactoe\/local$/);
  await expect(cell(page, 2, 2)).toHaveAccessibleName("Hàng 2, cột 2, X");
  await expect(status(page)).toHaveText("Đến lượt O");
});

test("does not list a game where only the AI has moved", async ({ page }) => {
  // A game in progress on this device shows that the menu has read the saved games.
  await startLocalGame(page);
  await play(page, [2, 2]);
  await expect.poll(() => savedMoveCount(page, SLOT.local)).toBe(1);

  await startAiGame(page, { first: "Máy" });
  await expect.poll(() => countMarks(page, "X")).toBe(1);
  await expect(status(page)).toHaveText(afterAiMove("O"));
  await expect.poll(() => savedMoveCount(page, SLOT.ai)).toBe(1);

  // Nothing to lose yet, so "New game" does not ask.
  await page.getByRole("button", { name: "Ván mới" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(status(page)).toHaveText(afterAiMove("O"));
  await expect.poll(() => savedMoveCount(page, SLOT.ai)).toBe(1);

  await page.getByRole("link", { name: "Về menu" }).click();
  await expect(continueSection(page).getByRole("link")).toHaveText(["Tic-tac-toe · Cùng máy"]);
});

test("plays a whole game against the AI to its end", async ({ page }) => {
  await startAiGame(page, { level: "Dễ" });

  // The player keeps playing the first empty cell until the game is over.
  for (let turn = 0; turn < 5; turn += 1) {
    const moves = await countMarks(page, "X");
    await playFirstEmptyCell(page);
    // Once the move shows, the status line no longer tells the previous turn.
    await expect.poll(() => countMarks(page, "X")).toBe(moves + 1);
    await expect(status(page)).toHaveText(
      new RegExp(`${afterAiMove("X").source}|^(Bạn thắng!|Máy thắng!|Hoà!)$`),
    );
    if ((await status(page).textContent())?.endsWith("Đến lượt bạn (X)") !== true) break;
  }

  await expect(status(page)).toHaveText(/^(Bạn thắng!|Máy thắng!|Hoà!)$/);
  // A finished game is not kept.
  await expect.poll(() => readSavedGame(page, SLOT.ai)).toBeNull();
});
