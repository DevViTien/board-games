import { expect, type Page, test } from "@playwright/test";

import { expectNoAxeViolations, reportBestPractices } from "./axe";
import {
  board,
  CARD_SCORE_LONG_NAMES,
  chessRecord,
  choose,
  createCardGroup,
  enterRound,
  fenceMode,
  fenceRaceRecord,
  horseChoices,
  languageButton,
  LUDO_FOUR_CHOICES,
  ludoRecord,
  nameField,
  openFakeRoom,
  PAGE_WITHOUT_STORAGE,
  play,
  playChess,
  pressStart,
  ROOM_URL,
  savedChessGame,
  savedFenceRaceGame,
  savedLudoGame,
  savedMoveCount,
  SLOT,
  startAiGame,
  startLocalGame,
  status,
  themeButton,
  tryFenceAt,
  writeSaved,
} from "./helpers";

// Spec accessibility "Không vi phạm tiếp cận tự động phát hiện được": every main screen, in both
// themes, in both projects (desktop 1280 × 800 and the Pixel 7 phone), checked by axe-core once it
// stands still (reduced motion). Grouped as design §1: (A) menu, setup and state screens; (B) the
// play screens; (C) dialogs and menus open; (D) rooms and online games; (E) the rules pages.

const SCHEMES = ["light", "dark"] as const;

/** Opens a same-device game saved under `slot` (`<game>:local`). */
async function openSaved(page: Page, gameId: string, saved: unknown): Promise<void> {
  await page.goto(PAGE_WITHOUT_STORAGE);
  await writeSaved(page, `${gameId}:local`, saved);
  await page.goto(`/play/${gameId}/local`);
  await expect(board(page).or(page.locator("[data-ply]")).first()).toBeVisible();
}

for (const colorScheme of SCHEMES) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" });

    test.describe("(A) menu, setup and state screens", () => {
      test("Menu ở giao diện tối: the menu with a game in progress", async ({ page }) => {
        await startLocalGame(page);
        await play(page, [1, 1]);
        // The save is not awaited by the move: leaving at once could abort it.
        await expect.poll(() => savedMoveCount(page, SLOT.local)).toBe(1);
        await page.goto("/");
        await expect(page.getByRole("heading", { name: "Tiếp tục ván dở" })).toBeVisible();
        await expectNoAxeViolations(page, "menu");
      });

      test("the setup screen of every game, and online", async ({ page }) => {
        for (const gameId of ["tictactoe", "caro", "ludo", "chess", "fence-race"]) {
          await page.goto(`/play/${gameId}`);
          await expect(page.getByRole("group", { name: "Chế độ" })).toBeVisible();
          await expectNoAxeViolations(page, `setup-${gameId}`);
        }
        await page.goto("/play/caro?mode=online");
        await expect(page.getByRole("button", { name: "Tạo phòng" })).toBeVisible();
        await expectNoAxeViolations(page, "setup-online");
      });

      test("not found, loading and joining screens", async ({ page }) => {
        for (const [path, screen] of [
          ["/khong-co-trang-nay", "page-not-found"],
          ["/play/khong-co", "game-not-found"],
          ["/play/caro/khong-co", "mode-not-found"],
          ["/rules/khong-co", "rules-not-found"],
        ] as const) {
          await page.goto(path);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await expectNoAxeViolations(page, screen);
        }
        // A room whose server never answers: "joining", a state screen that is busy.
        await page.routeWebSocket(/\/api\/realtime$/, () => {
          // Never answered.
        });
        await page.goto("/room/ABC234");
        await expect(status(page)).toHaveText("Đang vào phòng…");
        await expectNoAxeViolations(page, "room-joining");
      });

      test("the play screen while its saved game loads", async ({ page }) => {
        // Saved games that never answer: the play screen stays on "loading".
        await page.addInitScript(() => {
          Object.defineProperty(window, "indexedDB", {
            value: { open: () => ({}) },
            configurable: true,
          });
        });
        await page.goto("/play/tictactoe/local");
        await expect(status(page)).toHaveText("Đang tải…");
        await expectNoAxeViolations(page, "play-loading");
      });
    });

    test.describe("(B) play screens", () => {
      test("every game on one device", async ({ page }) => {
        await startLocalGame(page);
        await play(page, [1, 1]);
        await expectNoAxeViolations(page, "tictactoe-local");

        await page.goto("/play/caro");
        await choose(page, "Chế độ", "Cùng máy");
        await pressStart(page);
        await play(page, [7, 7]);
        await expectNoAxeViolations(page, "caro-local");

        await openSaved(page, "ludo", savedLudoGame(4, LUDO_FOUR_CHOICES));
        await expect(horseChoices(page)).toHaveCount(4);
        await expectNoAxeViolations(page, "ludo-local-choices");

        await openSaved(page, "chess", savedChessGame(["e2e4", "e7e5", "g1f3"]));
        await expectNoAxeViolations(page, "chess-local");

        await openSaved(page, "fence-race", savedFenceRaceGame(2, []));
        await expectNoAxeViolations(page, "fence-race-local");

        await openSaved(
          page,
          "fence-race",
          savedFenceRaceGame(4, [
            { kind: "fence", row: 4, col: 3, dir: "h" },
            { kind: "step", row: 4, col: 1 },
          ]),
        );
        await expectNoAxeViolations(page, "fence-race-local-four");
        await fenceMode(page, "Đặt rào").click();
        await tryFenceAt(page, { row: 2, col: 2, dir: "h" });
        await expectNoAxeViolations(page, "fence-race-placing");
        await page.getByRole("button", { name: "Huỷ" }).click();
        await tryFenceAt(page, { row: 4, col: 3, dir: "h" });
        await expectNoAxeViolations(page, "fence-race-refused");
        await page.getByRole("button", { name: "Huỷ" }).click();
        await fenceMode(page, "Phá rào").click();
        await tryFenceAt(page, { row: 4, col: 3, dir: "h" });
        await expectNoAxeViolations(page, "fence-race-breaking");
      });

      test("against the AI: its game, thinking, and the result of a resignation", async ({
        page,
      }) => {
        await page.goto("/play/caro");
        await choose(page, "Chế độ", "Đấu với máy");
        await pressStart(page);
        await play(page, [8, 8]);
        await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/u);
        await expectNoAxeViolations(page, "caro-ai");

        // Thinking, for as long as the scan takes: an AI seat of a room whose server (the test)
        // never moves for it. The same turn line, chip and busy board as against the AI here (a
        // held page clock would hold axe's own timers too).
        await openFakeRoom(page, {
          gameId: "chess",
          seats: [{ kind: "human", name: "Lan", standIn: false }, { kind: "ai" }],
          record: chessRecord(["e2e4"]),
        });
        await expect(status(page)).toHaveText(/Máy đang nghĩ…$/u);
        await expectNoAxeViolations(page, "ai-thinking");

        await startAiGame(page);
        await play(page, [2, 2]);
        await page.getByRole("button", { name: "Đầu hàng" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Đầu hàng" }).click();
        await expect(status(page)).toHaveText("Máy thắng!");
        await expectNoAxeViolations(page, "tictactoe-ai-resigned");
      });

      test("the result card: a win and a draw", async ({ page }) => {
        await startLocalGame(page);
        // X wins along the top row.
        await play(page, [1, 1], [2, 1], [1, 2], [2, 2], [1, 3]);
        await expect(status(page)).toHaveText("X thắng!");
        await expectNoAxeViolations(page, "tictactoe-won");

        await page.getByRole("button", { name: "Ván mới" }).click();
        await play(page, [1, 1], [1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]);
        await expect(status(page)).toHaveText("Hoà!");
        await expectNoAxeViolations(page, "tictactoe-draw");
      });
    });

    test.describe("(C) dialogs and menus open", () => {
      test("Màn hình chơi có hộp thoại: Ván mới, Đầu hàng, the rules, the promotion", async ({
        page,
      }) => {
        await startLocalGame(page);
        await play(page, [1, 1]);
        await page.getByRole("button", { name: "Ván mới" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expectNoAxeViolations(page, "dialog-new-game");

        await page.goto("/play/caro");
        await choose(page, "Chế độ", "Đấu với máy");
        await pressStart(page);
        await play(page, [7, 7]);
        await expect(status(page)).toHaveText(/Đến lượt bạn \(X\)$/u);
        await page.getByRole("button", { name: "Đầu hàng" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expectNoAxeViolations(page, "dialog-resign");
        await page.keyboard.press("Escape");

        await page.getByRole("button", { name: "Luật chơi" }).click();
        const rules = page.getByRole("dialog", { name: "Luật chơi Cờ caro" });
        await expect(rules.getByRole("heading", { level: 3 }).first()).toBeVisible();
        await expectNoAxeViolations(page, "dialog-rules");

        await openSaved(
          page,
          "chess",
          savedChessGame(["a2a4", "b7b5", "a4b5", "a7a6", "b5a6", "c8b7", "a6b7", "b8c6"]),
        );
        await playChess(page, "b7b8");
        await expect(page.getByRole("dialog", { name: "Tốt b7 → b8" })).toBeVisible();
        await expectNoAxeViolations(page, "dialog-promotion");
      });

      test("the theme and language menus open, on the menu and the play screen", async ({
        page,
      }) => {
        await page.goto("/");
        await themeButton(page).click();
        await expect(page.getByRole("menu")).toBeVisible();
        await expectNoAxeViolations(page, "menu-theme-open");
        await page.keyboard.press("Escape");
        await languageButton(page).click();
        await expect(page.getByRole("menu")).toBeVisible();
        await expectNoAxeViolations(page, "menu-language-open");

        await openSaved(page, "ludo", savedLudoGame(2, []));
        await themeButton(page).click();
        await expect(page.getByRole("menu")).toBeVisible();
        await expectNoAxeViolations(page, "play-theme-open");
      });

      test("the question before claiming a turn abandoned, online", async ({ page }) => {
        await openFakeRoom(page, {
          gameId: "chess",
          seats: [
            { kind: "human", name: "Lan", standIn: false },
            { kind: "human", name: "Minh", standIn: false },
          ],
          record: chessRecord(["e2e4"]),
          turnIdleMs: 5 * 60_000 + 4000,
        });
        await page.getByRole("button", { name: "Xử thắng" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expectNoAxeViolations(page, "dialog-claim");
      });
    });

    test.describe("(D) rooms and online games", () => {
      test("Ván online: Cờ rào, the second seat's board turned", async ({ page }) => {
        await openFakeRoom(
          page,
          {
            gameId: "fence-race",
            seats: [
              { kind: "human", name: "Minh", standIn: false },
              { kind: "human", name: "Lan", standIn: false },
            ],
            record: fenceRaceRecord(2, [{ kind: "fence", row: 4, col: 3, dir: "h" }]),
          },
          1,
        );
        await expect(page.locator("[data-fence-race-frame]")).toBeVisible();
        await expectNoAxeViolations(page, "online-fence-race");
      });

      test("Ván online: Cờ vua holding Black, and waiting for a player gone", async ({ page }) => {
        await openFakeRoom(
          page,
          {
            gameId: "chess",
            seats: [
              { kind: "human", name: "Minh", standIn: false },
              { kind: "human", name: "Lan", standIn: false },
            ],
            record: chessRecord(["e2e4", "e7e5"]),
            turnIdleMs: 2 * 60_000 + 13_000,
          },
          1,
        );
        await expect(page.getByRole("group", { name: "Bạn · Đen" })).toBeVisible();
        await expect(page.getByText(/^Minh chưa đi · 2:1\d$/u)).toBeVisible();
        await expectNoAxeViolations(page, "online-chess-black-waiting");
      });

      test("the chat: open with every kind of message, a bubble, not sent, muted", async ({
        page,
      }) => {
        const room = await openFakeRoom(
          page,
          {
            gameId: "chess",
            seats: [
              { kind: "human", name: "Minh", standIn: false },
              { kind: "human", name: "Lan", standIn: false },
            ],
            record: chessRecord(["e2e4", "e7e5"]),
          },
          1,
        );
        await expect(page.getByRole("button", { name: "Chat" })).toBeAttached();

        room.receive({ kind: "text", text: "Chào, ván này mình cầm Trắng nhé" });
        await expect(page.locator("[data-chat-bubble]")).toBeVisible();
        await expectNoAxeViolations(page, "chat-bubble");

        room.receive(
          { kind: "preset", preset: "nice-move" },
          { kind: "reaction", reaction: "like" },
        );
        await page.locator("[data-chat-bubble]").click();
        await expect(page.getByRole("log")).toBeVisible();
        await page.getByRole("textbox", { name: "Viết tin nhắn" }).fill("Chào Minh");
        await page.getByRole("textbox", { name: "Viết tin nhắn" }).press("Enter");
        await expect(page.getByRole("log").getByText("Chào Minh")).toBeVisible();
        await page.getByRole("button", { name: "Chơi hay đấy" }).click();
        await expect(page.getByRole("log").getByText("Chơi hay đấy")).toHaveCount(2);
        await expectNoAxeViolations(page, "chat-open");

        room.setChatAnswers(false);
        await page.getByRole("button", { name: "Cảm ơn" }).click();
        await expect(page.locator("#room-chat").getByRole("alert")).toBeVisible({
          timeout: 10_000,
        });
        await expectNoAxeViolations(page, "chat-not-sent");

        await page.getByRole("switch", { name: "Tắt chat" }).click();
        await expect(page.getByText(/Chat đang tắt:/u)).toBeVisible();
        await expectNoAxeViolations(page, "chat-muted");

        await page.getByRole("button", { name: "Đóng chat" }).click();
        await expect(page.getByRole("button", { name: "Chat đã tắt" })).toBeVisible();
        await expectNoAxeViolations(page, "chat-muted-closed");

        await room.loseConnection();
        await page.getByRole("button", { name: "Chat đã tắt" }).click();
        await expect(page.getByText(/Mất kết nối, chưa gửi được/u)).toBeVisible();
        await expectNoAxeViolations(page, "chat-offline");
      });

      test("the chat in the lobby", async ({ page }) => {
        const lobby = await openFakeRoom(page, {
          gameId: "ludo",
          seats: [
            { kind: "human", name: "Lan", standIn: false },
            { kind: "human", name: "Minh", standIn: false },
            null,
          ],
          record: ludoRecord(3, []),
        });
        await expect(page.getByRole("button", { name: "Chat" })).toBeVisible();
        lobby.receive({ kind: "text", text: "Chờ thêm một bạn nữa là đủ" });
        await page.getByRole("button", { name: /^Chat 1/u }).click();
        await expect(page.getByRole("log")).toBeVisible();
        await expectNoAxeViolations(page, "chat-lobby");
      });

      test("the chat over a Cờ cá ngựa game", async ({ page }) => {
        const room = await openFakeRoom(page, {
          gameId: "ludo",
          seats: [
            { kind: "human", name: "Lan", standIn: false },
            { kind: "human", name: "Minh", standIn: false },
            { kind: "ai" },
            { kind: "ai" },
          ],
          record: ludoRecord(4, []),
        });
        await expect(page.getByRole("button", { name: "Chat" })).toBeAttached();
        room.receive({ kind: "reaction", reaction: "fire" });
        await expect(page.locator("[data-chat-reaction]")).toBeVisible();
        await expectNoAxeViolations(page, "chat-reaction");
        await expect(
          page.locator("[data-chat-peek]").or(page.locator("[data-chat-button]")).first(),
        ).toBeVisible();
        await page.getByRole("button", { name: /^Chat 1/u }).click();
        await expect(page.getByRole("log")).toBeVisible();
        await expectNoAxeViolations(page, "chat-ludo-open");
      });

      test("an online Cờ cá ngựa game, the computer playing for Minh", async ({ page }) => {
        await openFakeRoom(
          page,
          {
            gameId: "ludo",
            seats: [
              { kind: "human", name: "Lan", standIn: false },
              { kind: "human", name: "Minh", standIn: true },
              { kind: "human", name: "An", standIn: false },
            ],
            record: ludoRecord(3, [{ roll: 3 }, { roll: 3 }]),
            turnIdleMs: 0,
          },
          2,
        );
        await expect(status(page)).toHaveText(/^Máy \(thay Minh\)/u);
        await expectNoAxeViolations(page, "online-ludo-stand-in");
      });

      test("the lobby: asking a visitor for a name, an AI seat, a room not found", async ({
        page,
        browser,
      }) => {
        const context = await browser.newContext();
        const host = await context.newPage();
        await host.goto("/play/ludo");
        await choose(host, "Chế độ", "Online");
        await choose(host, "Số người chơi", "4 người");
        await nameField(host).fill("Minh");
        await host.getByRole("button", { name: "Tạo phòng" }).click();
        await expect(host).toHaveURL(ROOM_URL);
        await host.getByRole("button", { name: "Cho máy chơi ghế 2" }).click();
        await expect(host.getByRole("button", { name: "Bỏ máy ở ghế 2" })).toBeVisible();
        await expectNoAxeViolations(host, "lobby-ai-seat");

        await page.goto(host.url());
        await expect(nameField(page)).toBeFocused();
        await expectNoAxeViolations(page, "lobby-ask-name");
        await context.close();

        await page.goto("/room/ZZZ234");
        await expect(page.getByRole("heading", { name: "Không tìm thấy phòng" })).toBeVisible();
        await expectNoAxeViolations(page, "room-not-found");
      });
    });

    test.describe("(G) Gom thạch", () => {
      test("the level list, a level with its hint, a stuck coconut, solved, and no such level", async ({
        page,
      }) => {
        await page.goto("/puzzles/jelly-gather");
        await expect(page.getByRole("link", { name: /^Bắt đầu/ })).toBeVisible();
        await expectNoAxeViolations(page, "jelly-gather-list");

        await page.goto("/puzzles/jelly-gather/2-1");
        await expect(page.getByRole("button", { name: "Lên" })).toHaveAttribute(
          "aria-disabled",
          "false",
        );
        await expectNoAxeViolations(page, "jelly-gather-level");

        await page.goto("/puzzles/jelly-gather/3-2");
        await expect(page.getByRole("button", { name: "Lên" })).toHaveAttribute(
          "aria-disabled",
          "false",
        );
        await expectNoAxeViolations(page, "jelly-gather-coconut");

        await page.goto("/puzzles/jelly-gather/4-8");
        await expect(page.getByRole("button", { name: "Lên" })).toHaveAttribute(
          "aria-disabled",
          "false",
        );
        await expectNoAxeViolations(page, "jelly-gather-molds");

        await page.goto("/puzzles/jelly-gather/5-1");
        await expect(page.getByRole("button", { name: "Lên" })).toHaveAttribute(
          "aria-disabled",
          "false",
        );
        await expectNoAxeViolations(page, "jelly-gather-depot");

        await page.goto("/puzzles/jelly-gather/1-1");
        await expect(page.getByRole("button", { name: "Lên" })).toHaveAttribute(
          "aria-disabled",
          "false",
        );
        for (const key of ["ArrowLeft", "ArrowLeft", "ArrowUp", "ArrowRight"])
          await page.keyboard.press(key);
        await expect(page.getByRole("region", { name: "Gom xong!" })).toBeVisible();
        await expectNoAxeViolations(page, "jelly-gather-solved");

        await page.goto("/puzzles/jelly-gather");
        await expect(page.getByRole("link", { name: "Màn 1-1, đã giải, 4 bước" })).toBeVisible();
        await expectNoAxeViolations(page, "jelly-gather-list-progress");

        await page.goto("/puzzles/jelly-gather/9-9");
        await expect(page.getByRole("heading", { name: "Không có màn này" })).toBeVisible();
        await expectNoAxeViolations(page, "jelly-gather-not-found");
      });
    });

    test.describe("(F) the toolbox", () => {
      test("the toolbox, the empty list and the forms", async ({ page }) => {
        await page.goto("/tools");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoAxeViolations(page, "toolbox");

        await page.goto("/tools/card-score");
        await expect(page.getByRole("heading", { name: "Chưa có nhóm nào" })).toBeVisible();
        await expectNoAxeViolations(page, "card-score-empty");

        await page.goto("/tools/card-score/new");
        await page.getByRole("textbox", { name: "Người chơi 1" }).fill("Lan");
        await page.getByRole("textbox", { name: "Người chơi 2" }).fill("lan");
        await page.getByRole("button", { name: "Tạo nhóm" }).click();
        await expect(page.getByText("Tên này đã có trong nhóm.")).toBeVisible();
        await expectNoAxeViolations(page, "card-score-form");

        await page.goto("/tools/card-score/khong-co");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoAxeViolations(page, "card-score-not-found");
      });

      test("Quét màn hình nhập ván: the board, the round in every state, and the questions", async ({
        page,
      }) => {
        await createCardGroup(page, ["Lan", "Minh", "Hùng", "Tú"], "Team Dev");
        await expectNoAxeViolations(page, "card-score-board-empty");

        await enterRound(page, ["-10", "-20", "-5"]);
        await expect(page.getByText("Tú được tự tính: +35")).toBeVisible();
        await expectNoAxeViolations(page, "card-score-round-auto");
        await page.getByRole("button", { name: "Lưu ván" }).click();
        await expect(page.getByRole("status").getByText("Đã lưu ván 1.")).toBeVisible();
        await expectNoAxeViolations(page, "card-score-board");

        await page.getByRole("button", { name: "Xoá nhóm" }).click();
        await expect(page.getByRole("dialog", { name: /^Xoá nhóm/ })).toBeVisible();
        await expectNoAxeViolations(page, "card-score-delete-group");
        await page.getByRole("button", { name: "Huỷ" }).click();

        await enterRound(page, ["5", "5", "5", "5"]);
        await expect(page.getByText("Tổng đang lệch +20")).toBeVisible();
        await expectNoAxeViolations(page, "card-score-round-mismatch");
        await page.getByRole("button", { name: "Đóng" }).click();
        await expect(page.getByRole("heading", { name: "Bỏ ván đang nhập?" })).toBeVisible();
        await expectNoAxeViolations(page, "card-score-round-ask");
        await page.getByRole("button", { name: "Bỏ ván" }).click();

        await page.getByRole("button", { name: "Sửa ván 1" }).first().click();
        await expect(page.getByRole("button", { name: "Xoá ván này" })).toBeVisible();
        await expectNoAxeViolations(page, "card-score-round-edit");
        await page.getByRole("button", { name: "Đóng" }).click();

        await page.getByRole("link", { name: "Sửa nhóm" }).click();
        await page.getByRole("button", { name: "Cho nghỉ: Tú" }).click();
        await expect(page.getByRole("button", { name: "Chơi lại: Tú" })).toBeVisible();
        await expectNoAxeViolations(page, "card-score-edit");
        await page.getByRole("link", { name: "Xong" }).click();
        await page.getByRole("banner").getByRole("link", { name: "Các nhóm" }).click();
        await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1);
        await expectNoAxeViolations(page, "card-score-list");
      });

      test("eight long names", async ({ page }) => {
        await createCardGroup(page, CARD_SCORE_LONG_NAMES);
        await enterRound(page, ["1", "1", "1", "1", "1", "1", "-6"]);
        await page.getByRole("button", { name: "Lưu ván" }).click();
        await expect(page.getByRole("region", { name: "Bảng các ván" })).toBeVisible();
        await expectNoAxeViolations(page, "card-score-board-eight");
      });
    });

    test.describe("(E) rules pages", () => {
      test("the rules of every game", async ({ page }) => {
        for (const gameId of ["tictactoe", "caro", "ludo", "chess", "fence-race"]) {
          await page.goto(`/rules/${gameId}`);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await expectNoAxeViolations(page, `rules-${gameId}`);
        }
      });
    });
  });
}

test.describe("every best practice, once", () => {
  test.use({ colorScheme: "light", reducedMotion: "reduce" });

  test("on the main screens (desktop, light)", async ({ page, isMobile }) => {
    test.skip(isMobile, "once, on the desktop");
    await page.goto("/");
    await reportBestPractices(page, "menu");
    await page.goto("/play/ludo");
    await reportBestPractices(page, "setup");
    await openSaved(page, "ludo", savedLudoGame(4, LUDO_FOUR_CHOICES));
    await reportBestPractices(page, "play-ludo");
    await openSaved(page, "chess", savedChessGame(["e2e4"]));
    await reportBestPractices(page, "play-chess");
    await page.goto("/rules/chess");
    await reportBestPractices(page, "rules-chess");
    await page.goto("/khong-co");
    await reportBestPractices(page, "not-found");
  });
});
