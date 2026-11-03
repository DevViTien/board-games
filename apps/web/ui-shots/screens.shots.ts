import { expect, test } from "@playwright/test";

import {
  board,
  choose,
  horseChoices,
  nameField,
  PAGE_WITHOUT_STORAGE,
  play,
  players,
  pressStart,
  rollButton,
  ROOM_URL,
  savedLudoGame,
  startLocalGame,
  status,
  writeSaved,
} from "../e2e/helpers";
import { shoot } from "./shoot";

// The key screens, each in every project of playwright.shots.config.ts (phone and desktop, light
// and dark). The numbers keep the files in the order a player meets the screens.

test("menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await shoot(page, "01-menu");
});

test("setup screens", async ({ page }) => {
  await page.goto("/play/tictactoe");
  await expect(page.getByRole("group", { name: "Chế độ" })).toBeVisible();
  await shoot(page, "02-setup-tictactoe");

  await page.goto("/play/caro");
  await expect(page.getByRole("group", { name: "Chế độ" })).toBeVisible();
  await shoot(page, "03-setup-caro");

  await page.goto("/play/ludo");
  await choose(page, "Số người chơi", "4 người");
  await shoot(page, "04-setup-ludo");
});

test("tic-tac-toe on one device, in progress then won", async ({ page }) => {
  await startLocalGame(page);
  await play(page, [1, 1], [2, 1], [1, 2], [2, 2]);
  await expect(status(page)).toHaveText("Đến lượt X");
  await shoot(page, "05-tictactoe-playing");

  await play(page, [1, 3]);
  await expect(status(page)).toHaveText("X thắng!");
  await shoot(page, "06-tictactoe-won");
});

test("Cờ caro on one device, in progress then won", async ({ page }) => {
  await page.goto("/play/caro");
  await choose(page, "Chế độ", "Cùng máy");
  await pressStart(page);
  await expect(board(page)).toBeVisible();
  await play(page, [8, 4], [10, 4], [8, 5], [10, 5], [8, 6], [10, 6], [8, 7], [10, 7]);
  await expect(status(page)).toHaveText("Đến lượt X");
  await shoot(page, "07-caro-playing");

  await play(page, [8, 8]);
  await expect(status(page)).toHaveText("X thắng!");
  await shoot(page, "08-caro-won");
});

test("Cờ cá ngựa for four on one device, a choice of horses to make", async ({ page }) => {
  // Every colour has a horse out, and Red has just rolled a 6: a list of choices on the board.
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(
    page,
    "ludo:local",
    savedLudoGame(4, [
      { roll: 6 },
      { horse: 0 },
      { roll: 4 },
      { horse: 0 },
      { roll: 6 },
      { horse: 0 },
      { roll: 5 },
      { horse: 0 },
      { roll: 6 },
      { horse: 0 },
      { roll: 3 },
      { horse: 0 },
      { roll: 6 },
      { horse: 0 },
      { roll: 2 },
      { horse: 0 },
      { roll: 6 },
    ]),
  );
  await page.goto("/play/ludo/local");
  await expect(rollButton(page)).toBeVisible();
  await expect(horseChoices(page).first()).toBeVisible();
  await shoot(page, "09-ludo-playing");
});

test("room lobby of a Cờ cá ngựa room for four", async ({ page }) => {
  await page.goto("/play/ludo");
  await choose(page, "Chế độ", "Online");
  await choose(page, "Số người chơi", "4 người");
  await nameField(page).fill("Minh");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  await expect(players(page)).toHaveCount(4);
  await shoot(page, "10-room-lobby");
});

test("a room that does not exist, as a first-time visitor", async ({ page }) => {
  // A first visit asks for a name before it tells that the room does not exist.
  await page.goto("/room/ABC234");
  await expect(nameField(page)).toBeVisible();
  await shoot(page, "11-room-ask-name");

  await nameField(page).fill("Khoa");
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByRole("heading", { name: "Không tìm thấy phòng" })).toBeVisible();
  await shoot(page, "12-room-not-found");
});
