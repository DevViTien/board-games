import type { ChatBody } from "@board-games/protocol";
import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
  type WebSocket,
} from "@playwright/test";

import {
  board,
  cell,
  chessRecord,
  chessSquare,
  choose,
  horseChoices,
  LUDO_FOUR_CHOICES,
  ludoRecord,
  nameField,
  openAsNewPlayer,
  openAsStranger,
  openFakeRoom,
  playFirstEmptyCell,
  rollButton,
  ROOM_URL,
  status,
} from "./helpers";

// The chat of a room (spec `room-chat`). Two browsers on the real realtime server for what crosses
// the network; a room whose server is the test for what is about the screen.

const chatButton = (page: Page) => page.getByRole("button", { name: /^Chat/u });
const field = (page: Page) => page.getByRole("textbox", { name: "Viết tin nhắn" });
const log = (page: Page) => page.getByRole("log", { name: "Tin nhắn trong phòng" });
const bubble = (page: Page) => page.locator("[data-chat-bubble]");
const closeChat = (page: Page) => page.getByRole("button", { name: "Đóng chat" });

/** Lan creates a room of `gameId`; Minh opens the link and sits. */
async function startRoom(page: Page, browser: Browser, gameId = "tictactoe", locale?: string) {
  await page.goto(`/play/${gameId}?mode=online`);
  await nameField(page).fill("Lan");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  const minh = locale === undefined ? await openAsNewPlayer(browser, page.url(), "Minh") : null;
  return { minh, url: page.url() };
}

async function twoPlayers(page: Page, browser: Browser) {
  const { minh } = await startRoom(page, browser);
  if (minh === null) throw new Error("No second player");
  await minh.page.getByRole("button", { name: "Vào chơi" }).click();
  await expect(board(page)).toBeVisible();
  await expect(board(minh.page)).toBeVisible();
  return minh;
}

async function send(page: Page, text: string) {
  await field(page).fill(text);
  await field(page).press("Enter");
  await expect(field(page)).toHaveValue("");
}

test("Chat trong ván online: a message reaches the other player, as a bubble and in the list", async ({
  page,
  browser,
}) => {
  const minh = await twoPlayers(page, browser);

  await chatButton(page).click();
  await send(page, "Chào Minh");

  // On both sides: for the sender once written, for the other at once, as a bubble and a count.
  await expect(log(page).getByText("Chào Minh")).toBeVisible();
  await expect(bubble(minh.page)).toContainText("Lan");
  await expect(bubble(minh.page)).toContainText("Chào Minh");
  await expect(
    minh.page.getByRole("button", { name: "Chat 1 tin chưa đọc", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Chat \d/u })).toHaveCount(0);

  // A tap on the bubble opens the chat, and nothing is unread any more.
  await bubble(minh.page).click();
  await expect(log(minh.page).getByText("Chào Minh")).toBeVisible();
  await expect(chatButton(minh.page)).toHaveAccessibleName("Chat");
  await expect(bubble(minh.page)).toHaveCount(0);

  // Going back the other way, while the game goes on in both browsers.
  await send(minh.page, "Chào Lan");
  await expect(log(page).getByText("Chào Lan")).toBeVisible();
  await expect(log(minh.page).getByText("Chào Lan")).toBeVisible();
  await playFirstEmptyCell(page);
  await expect(status(minh.page)).toHaveText(/Lan vừa đánh/u);

  await minh.context.close();
});

test("Câu có sẵn theo ngôn ngữ người đọc: a preset goes by id, read in the reader's language", async ({
  page,
  browser,
}) => {
  await page.goto("/play/tictactoe?mode=online");
  await nameField(page).fill("Lan");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  const english = await browser.newContext({ locale: "en-US" });
  const other = await english.newPage();
  await other.goto(page.url());
  await other.getByRole("textbox", { name: "Your name" }).fill("Sam");
  await other.getByRole("button", { name: "Join game" }).click();
  await expect(board(page)).toBeVisible();

  await chatButton(page).click();
  await page.getByRole("button", { name: "Chơi hay đấy" }).click();

  await expect(log(page).getByText("Chơi hay đấy")).toBeVisible();
  await expect(bubble(other)).toContainText("Nice move");

  // A reaction's name is in each reader's language too.
  await other.getByRole("button", { name: /^Chat 1 unread message/u }).click();
  await other.getByRole("button", { name: "Send Like" }).click();
  await expect(other.getByRole("img", { name: "Like" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Thích" })).toBeVisible();

  await english.close();
});

test("Người chưa có ghế không thấy tin: no message reaches a visitor, and sitting shows them", async ({
  page,
  browser,
}) => {
  await page.goto("/play/ludo?mode=online");
  await nameField(page).fill("Lan");
  await choose(page, "Số người chơi", "3 người");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  const url = page.url();

  // Alone: no chat, until someone sits.
  await expect(page.getByRole("region", { name: "Người chơi" })).toBeVisible();
  await expect(chatButton(page)).toHaveCount(0);
  const minh = await openAsNewPlayer(browser, url, "Minh");
  await minh.page.getByRole("button", { name: "Vào chơi" }).click();
  await expect(chatButton(page)).toBeVisible();
  await chatButton(page).click();
  await send(page, "Bí mật của phòng");
  await send(page, "Tin thứ hai");
  await expect(log(minh.page).or(chatButton(minh.page)).first()).toBeVisible();

  // The visitor's socket carries the room, without its messages.
  const context = await browser.newContext();
  const visitor = await context.newPage();
  const frames: string[] = [];
  visitor.on("websocket", (socket: WebSocket) => {
    socket.on("framereceived", ({ payload }) => {
      frames.push(String(payload));
    });
  });
  await visitor.goto(url);
  await expect(visitor.getByRole("button", { name: "Vào chơi" })).toBeVisible();
  await expect(chatButton(visitor)).toHaveCount(0);
  expect(frames.join("")).not.toContain("Bí mật");
  expect(frames.join("")).not.toContain("playerId");

  // Sitting down brings them, read: no bubble, no count.
  await nameField(visitor).fill("Hùng");
  await visitor.getByRole("button", { name: "Vào chơi" }).click();
  await expect(chatButton(visitor)).toHaveAccessibleName("Chat");
  await expect(bubble(visitor)).toHaveCount(0);
  await chatButton(visitor).click();
  await expect(log(visitor).getByText("Bí mật của phòng")).toBeVisible();
  await expect(log(visitor).getByText("Tin thứ hai")).toBeVisible();

  await context.close();
  await minh.context.close();
});

test("Tải lại trang: the messages are still there, with no bubble", async ({ page, browser }) => {
  const minh = await twoPlayers(page, browser);
  await chatButton(page).click();
  await send(page, "Một");
  await send(page, "Hai");
  await expect(bubble(minh.page)).toContainText("Hai");

  await minh.page.reload();

  await expect(board(minh.page)).toBeVisible();
  await expect(bubble(minh.page)).toHaveCount(0);
  // Still unread: reloading is not reading.
  await expect(chatButton(minh.page)).toHaveAccessibleName("Chat 2 tin chưa đọc");
  await chatButton(minh.page).click();
  await expect(log(minh.page).getByText("Một")).toBeVisible();
  await expect(log(minh.page).getByText("Hai")).toBeVisible();
  await minh.page.reload();
  await expect(chatButton(minh.page)).toHaveAccessibleName("Chat");

  await minh.context.close();
});

test("Nối lại vẫn còn tin: what was sent while the connection was lost is there", async ({
  page,
  browser,
}) => {
  const minh = await twoPlayers(page, browser);
  await chatButton(minh.page).click();
  await chatButton(page).click();
  await send(page, "Trước khi mất mạng");
  await expect(log(minh.page).getByText("Trước khi mất mạng")).toBeVisible();

  await minh.context.setOffline(true);
  await send(page, "Trong lúc mất mạng");
  // The chat says why nothing can be sent, and sends nothing.
  await expect(minh.page.getByText(/Mất kết nối, chưa gửi được/u)).toBeVisible();
  await expect(minh.page.getByRole("button", { name: "Gửi", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  await minh.context.setOffline(false);

  await expect(log(minh.page).getByText("Trong lúc mất mạng")).toBeVisible();
  await expect(log(minh.page).getByText("Trước khi mất mạng")).toBeVisible();
  await minh.context.close();
});

test("Chạm liên tục vào emoji: the connection stays, the screen says to slow down, and the game goes on", async ({
  page,
  browser,
}) => {
  // The page's clock is the test's: 15 seconds of tapping without waiting for them.
  await page.clock.install();
  const minh = await twoPlayers(page, browser);
  await chatButton(page).click();
  let reconnections = 0;
  page.on("websocket", () => {
    reconnections += 1;
  });
  const reaction = page.getByRole("button", { name: "Gửi Thích" });

  // Faster than the limit, for the first 5 seconds of it: at most 5 go out.
  for (let tap = 0; tap < 25; tap += 1) {
    await reaction.dispatchEvent("click");
    await page.clock.runFor(200);
  }

  await expect(page.locator("#room-chat").getByRole("alert")).toHaveText("Gửi chậm lại một chút");
  const firstBurst = await log(page).getByRole("img", { name: "Thích" }).count();
  expect(firstBurst).toBe(5);

  // Enter held down in the field: repeats, with `event.repeat`, send nothing more.
  await field(page).fill("giữ phím");
  for (let repeat = 0; repeat < 5; repeat += 1) await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await expect(field(page)).toHaveValue("giữ phím");
  await expect(log(page).getByText("giữ phím")).toHaveCount(0);

  // On to 15 seconds of tapping: the server keeps its own limit, and the connection stays.
  for (let tap = 0; tap < 50; tap += 1) {
    await reaction.dispatchEvent("click");
    await page.clock.runFor(200);
  }

  // The game still plays, on the same connection.
  await cell(page, 1, 1).click();
  await expect(status(minh.page)).toHaveText(/Lan vừa đánh/u);
  expect(reconnections).toBe(0);

  await minh.context.close();
});

test("Gửi và đóng bằng bàn phím: Enter sends, Esc closes and gives the focus back", async ({
  page,
  browser,
}) => {
  test.skip(test.info().project.name === "mobile", "a keyboard");
  const minh = await twoPlayers(page, browser);

  await chatButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(field(page)).toBeFocused();
  await page.keyboard.type("Chào cả nhà");
  await page.keyboard.press("Enter");
  await expect(log(page).getByText("Chào cả nhà")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(log(page)).toHaveCount(0);
  await expect(chatButton(page)).toBeFocused();
  await minh.context.close();
});

test("Tắt rồi có tin mới: no bubble and no count; remembered; nothing unread when back on", async ({
  page,
  browser,
}) => {
  const minh = await twoPlayers(page, browser);
  await chatButton(minh.page).click();
  await minh.page.getByRole("switch", { name: "Tắt chat" }).click();
  await expect(minh.page.getByText(/Chat đang tắt:/u)).toBeVisible();
  await closeChat(minh.page).click();
  await expect(chatButton(minh.page)).toHaveAccessibleName("Chat đã tắt");

  await chatButton(page).click();
  await send(page, "Có ai không");
  await expect(log(page).getByText("Có ai không")).toBeVisible();

  await expect(bubble(minh.page)).toHaveCount(0);
  await expect(chatButton(minh.page)).toHaveAccessibleName("Chat đã tắt");

  // Remembered on this browser, after a reload too.
  await minh.page.reload();
  await expect(chatButton(minh.page)).toHaveAccessibleName("Chat đã tắt");

  // Muted is this browser's business: Lan never knew. Back on: read, and in the list.
  await chatButton(minh.page).click();
  await expect(log(minh.page).getByText("Có ai không")).toBeVisible();
  await minh.page.getByRole("switch", { name: "Tắt chat" }).click();
  await closeChat(minh.page).click();
  await expect(chatButton(minh.page)).toHaveAccessibleName("Chat");
  await minh.context.close();
});

test("Đủ người khi đang gõ: the chat stays open, with the words and the focus", async ({
  page,
  browser,
}) => {
  test.skip(test.info().project.name === "mobile", "the focus goes to the close button on a touch");
  const { minh, url } = await startRoomOfThree(page, browser);
  await minh.page.getByRole("button", { name: "Vào chơi" }).click();
  await chatButton(page).click();
  await field(page).pressSequentially("đang gõ dở");
  await expect(field(page)).toBeFocused();

  const third = await openAsNewPlayer(browser, url, "Hùng");
  await third.page.getByRole("button", { name: "Vào chơi" }).click();

  await expect(page.getByRole("button", { name: "Đầu hàng" })).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue("đang gõ dở");
  await expect(log(page)).toBeVisible();
  await third.context.close();
  await minh.context.close();
});

async function startRoomOfThree(page: Page, browser: Browser) {
  await page.goto("/play/ludo?mode=online");
  await nameField(page).fill("Lan");
  await choose(page, "Số người chơi", "3 người");
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await expect(page).toHaveURL(ROOM_URL);
  const minh = await openAsNewPlayer(browser, page.url(), "Minh");
  return { minh, url: page.url() };
}

test.describe("the same stranger", () => {
  test("Người chưa có ghế gửi tin: a visitor has no way to send, and the room stays as it is", async ({
    page,
    browser,
  }) => {
    await page.goto("/play/tictactoe?mode=online");
    await nameField(page).fill("Lan");
    await page.getByRole("button", { name: "Tạo phòng" }).click();
    await expect(page).toHaveURL(ROOM_URL);

    const visitor = await openAsStranger(browser, page.url());
    await expect(nameField(visitor.page)).toBeVisible();
    await expect(chatButton(visitor.page)).toHaveCount(0);
    await visitor.context.close();
  });
});

// --- What the chat does to the screen ------------------------------------------------------------

const CHESS_ROOM = {
  gameId: "chess",
  seats: [
    { kind: "human", name: "Lan", standIn: false },
    { kind: "human", name: "Minh", standIn: false },
  ],
  record: chessRecord(["e2e4", "e7e5"]),
} as const;

const LUDO_ROOM = {
  gameId: "ludo",
  seats: [
    { kind: "human", name: "Lan", standIn: false },
    { kind: "human", name: "Minh", standIn: false },
    { kind: "ai" },
    { kind: "ai" },
  ],
  record: ludoRecord(4, LUDO_FOUR_CHOICES),
} as const;

const SOME_WORDS: readonly ChatBody[] = [
  { kind: "preset", preset: "hello" },
  { kind: "text", text: "Mình gọi Tuấn vào rồi, đợi xíu" },
  { kind: "reaction", reaction: "like" },
];

/** Where the board is, to the pixel: it must never move for the chat. */
const boardBox = (page: Page) => page.locator("[data-ply]").or(board(page)).first().boundingBox();

async function expectNoSideScroll(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
}

type Box = Awaited<ReturnType<typeof boardBox>>;

/** The area two boxes share, in px². */
function overlap(one: Box, other: Box): number {
  if (one === null || other === null) return 0;
  const width = Math.min(one.x + one.width, other.x + other.width) - Math.max(one.x, other.x);
  const height = Math.min(one.y + one.height, other.y + other.height) - Math.max(one.y, other.y);
  return width > 0 && height > 0 ? width * height : 0;
}

const SIZES = [
  { width: 360, height: 740 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
] as const;

for (const size of SIZES) {
  for (const [name, room] of [
    ["Cờ vua", CHESS_ROOM],
    ["Cờ cá ngựa", LUDO_ROOM],
  ] as const) {
    test(`Bàn đứng yên, ${name} ở ${String(size.width)} × ${String(size.height)}: opening, closing and a message move nothing`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      const fake = await openFakeRoom(page, room, 0);
      await expect(chatButton(page)).toBeAttached();
      const start = await boardBox(page);
      expect(start).not.toBeNull();

      // A message while closed.
      fake.receive({ kind: "text", text: "Chào" });
      await expect(bubble(page)).toBeVisible();
      expect(await boardBox(page)).toEqual(start);
      expect(overlap(await bubble(page).boundingBox(), start)).toBe(0);
      await expectNoSideScroll(page);

      // Opening it, by the bubble.
      await bubble(page).click();
      await expect(log(page)).toBeVisible();
      expect(await boardBox(page)).toEqual(start);
      await expectNoSideScroll(page);

      // Messages while open, one a long word.
      fake.receive(...SOME_WORDS, { kind: "text", text: "a".repeat(200) });
      await expect(log(page).getByText("a".repeat(200))).toBeVisible();
      expect(await boardBox(page)).toEqual(start);
      await expectNoSideScroll(page);

      // Closing.
      await closeChat(page).click();
      await expect(log(page)).toHaveCount(0);
      expect(await boardBox(page)).toEqual(start);
      await expectNoSideScroll(page);
    });
  }
}

test("Dấu chồng quá nhiều: stays inside its message, which clips what is left of it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const fake = await openFakeRoom(page, CHESS_ROOM, 0);
  await expect(chatButton(page)).toBeAttached();
  // Four marks a letter: what the server keeps at most, written as it would have written them.
  const stacked = `a\u{301}\u{316}\u{317}\u{318}`.repeat(40);
  fake.receive({ kind: "text", text: stacked }, { kind: "text", text: "Tin sau" });
  await page.locator("[data-chat-button]").focus();
  await page.keyboard.press("Enter");

  const words = log(page).locator("[data-chat-message] p").first();
  await expect(words).toHaveCSS("overflow-x", "clip");
  await expect(words).toHaveCSS("overflow-y", "clip");
  const box = await words.boundingBox();
  const list = await log(page).boundingBox();
  expect(box?.width).toBeLessThanOrEqual(list?.width ?? 0);
  // What follows it is not written over. Both read in one go: the panel may still be sliding in.
  const [one, next] = await log(page)
    .locator("[data-chat-message] p")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
  expect(overlap(one ?? null, next ?? null)).toBe(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("Giảm chuyển động: a bubble and a reaction appear without moving", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const fake = await openFakeRoom(page, CHESS_ROOM, 0);
    await expect(chatButton(page)).toBeAttached();

    fake.receive({ kind: "text", text: "Chào" });
    await expect(bubble(page)).toHaveCSS("animation-name", "chat-fade");
    fake.receive({ kind: "reaction", reaction: "fire" });
    await expect(page.locator("[data-chat-reaction]")).toHaveCSS(
      "animation-name",
      "chat-reaction-still",
    );
  });

  test("without moving on opening either", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openFakeRoom(page, CHESS_ROOM, 0);
    await page.locator("[data-chat-button]").focus();
    await page.keyboard.press("Enter");

    await expect(page.locator("#room-chat")).toHaveCSS("animation-name", "chat-fade");
  });
});

test("Tin dài liền nhau: wraps inside its bubble at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const fake = await openFakeRoom(page, CHESS_ROOM, 0);
  await expect(chatButton(page)).toBeAttached();
  fake.receive({ kind: "text", text: "a".repeat(200) });
  await bubble(page).click();

  const words = log(page).getByText("a".repeat(200));
  const box = await words.boundingBox();
  const list = await log(page).boundingBox();
  expect(box?.width).toBeLessThanOrEqual(list?.width ?? 0);
  await expectNoSideScroll(page);
});

for (const [name, room] of [
  ["Cờ vua", CHESS_ROOM],
  ["Cờ cá ngựa", LUDO_ROOM],
] as const) {
  test(`Điện thoại ngang, ${name}: the chat covers no square of the board`, async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openFakeRoom(page, room, 0);
    await chatButton(page).focus();
    await page.keyboard.press("Enter");

    const panel = await page.locator("#room-chat").boundingBox();
    const area = await boardBox(page);

    expect(panel).not.toBeNull();
    expect(area).not.toBeNull();
    expect(overlap(panel, area)).toBe(0);
    await expectNoSideScroll(page);
  });
}

test("Máy tính vẫn đi được khi chat mở, Cờ vua: a move with the chat open, the turn line in it", async ({
  page,
}) => {
  test.skip(test.info().project.name === "mobile", "a laptop");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openFakeRoom(page, CHESS_ROOM, 0);
  await chatButton(page).click();

  const panel = page.locator("#room-chat");
  await expect(panel.getByText(/Đến lượt bạn/u)).toBeVisible();
  // The page does not scroll: the chat adds nothing to it.
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(800);

  await chessSquare(page, "g1").click();
  await chessSquare(page, "f3").click();

  // The whole move list goes on in the column: flipping the board is still in reach too.
  await expect(log(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Lật bàn" })).toBeInViewport();
});

test("Máy tính vẫn đi được khi chat mở, Cờ cá ngựa: the die and the roll button stay uncovered", async ({
  page,
}) => {
  test.skip(test.info().project.name === "mobile", "a laptop");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openFakeRoom(page, LUDO_ROOM, 0);
  await expect(horseChoices(page)).toHaveCount(4);
  await chatButton(page).click();
  await expect(log(page)).toBeVisible();

  const panel = await page.locator("#room-chat").boundingBox();
  const roll = await rollButton(page).boundingBox();
  expect(panel).not.toBeNull();
  expect(roll).not.toBeNull();
  expect((panel?.y ?? 0) + (panel?.height ?? 0)).toBeLessThanOrEqual(roll?.y ?? 0);
  // Nor does the board lie under it.
  const area = await boardBox(page);
  expect((area?.x ?? 0) + (area?.width ?? 0)).toBeLessThanOrEqual(panel?.x ?? 0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(800);
});

test("Sau khi ván kết thúc, trên máy tính: the panel goes under the result card, and leaves Chơi lại", async ({
  page,
}) => {
  test.skip(test.info().project.name === "mobile", "a laptop");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openFakeRoom(
    page,
    {
      ...CHESS_ROOM,
      record: { ...chessRecord(["e2e4", "e7e5"]), ending: { reason: "resigned", player: 1 } },
    },
    0,
  );
  const again = page.getByRole("button", { name: "Chơi lại" });
  await expect(again).toBeVisible();
  await chatButton(page).click();

  const panel = await page.locator("#room-chat").boundingBox();
  const button = await again.boundingBox();
  expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThanOrEqual(panel?.y ?? 0);
  await expect(again).toBeInViewport();
});

test("Nút chat ngoài màn hình: a tab with the count once the bubble has gone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const fake = await openFakeRoom(page, LUDO_ROOM, 0);
  await expect(horseChoices(page)).toHaveCount(4);

  fake.receive({ kind: "text", text: "Ngựa mình sắp về đích rồi" });
  await expect(bubble(page)).toBeVisible();
  await expect(page.locator("[data-chat-peek]")).toHaveCount(0);
  await expect(bubble(page)).toHaveCount(0, { timeout: 6000 });

  const tab = page.locator("[data-chat-peek]");
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(log(page).getByText("Ngựa mình sắp về đích rồi")).toBeVisible();
  await expect(tab).toHaveCount(0);
});

test("Bàn phím ảo mở: the field and the latest message stay in what the keyboard leaves", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const fake = await openFakeRoom(page, CHESS_ROOM, 0);
  await chatButton(page).focus();
  await page.keyboard.press("Enter");
  fake.receive(...SOME_WORDS, { kind: "text", text: "Tin mới nhất" });
  await expect(log(page).getByText("Tin mới nhất")).toBeVisible();

  // Playwright has no on-screen keyboard: the visual viewport as one leaves it.
  await page.evaluate(() => {
    const viewport = window.visualViewport;
    if (viewport === null) throw new Error("No visual viewport");
    Object.defineProperty(viewport, "height", { configurable: true, value: 470 });
    viewport.dispatchEvent(new Event("resize"));
  });

  await expect(page.getByRole("group", { name: "Gửi nhanh" })).toHaveCount(0);
  const input = await field(page).boundingBox();
  const latest = await log(page).getByText("Tin mới nhất").boundingBox();
  expect((input?.y ?? 999) + (input?.height ?? 0)).toBeLessThanOrEqual(470);
  expect((latest?.y ?? 999) + (latest?.height ?? 0)).toBeLessThanOrEqual(input?.y ?? 0);
  expect(latest?.y).toBeGreaterThan(740 - 270 - 226);
});

// --- Where the chat must keep out of the way ---------------------------------------------------------

/** Its box, without waiting for it to appear: most of these are about it not being there. */
const boxIfThere = async (locator: Locator) =>
  (await locator.count()) > 0 ? locator.boundingBox() : null;

const scrollToEnd = (page: Page) =>
  page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

for (const size of [
  { width: 360, height: 640 },
  { width: 320, height: 568 },
]) {
  for (const [name, room] of [
    ["Cờ vua", CHESS_ROOM],
    ["Cờ cá ngựa", LUDO_ROOM],
  ] as const) {
    test(`Trang đã cuộn tới bàn, ${name} ở ${String(size.width)} × ${String(size.height)}: no bubble or tab over the board; the count stays`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      const fake = await openFakeRoom(page, room, 0);
      await expect(page.locator("[data-chat-button]")).toBeAttached();
      await scrollToEnd(page);
      await page.waitForTimeout(100);

      fake.receive({ kind: "text", text: "Chào" });
      await expect(page.locator("[data-chat-button]")).toHaveAccessibleName("Chat 1 tin chưa đọc");
      await page.waitForTimeout(100);

      const area = await boardBox(page);
      expect(overlap(await boxIfThere(bubble(page)), area)).toBe(0);
      const tab = page.locator("[data-chat-peek]");
      if (await tab.isVisible()) expect(overlap(await tab.boundingBox(), area)).toBe(0);
    });
  }
}

test("Đóng chat sau khi cuộn cả bàn lên: a message then shows no bubble over the board", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const fake = await openFakeRoom(page, LUDO_ROOM, 0);
  await expect(page.locator("[data-chat-button]")).toBeAttached();
  await page.locator("[data-chat-button]").focus();
  await page.keyboard.press("Enter");
  await scrollToEnd(page);
  await page.waitForTimeout(100);
  await closeChat(page).click();
  await page.waitForTimeout(100);

  fake.receive({ kind: "text", text: "Chào" });
  await expect(page.locator("[data-chat-button]")).toHaveAccessibleName("Chat 1 tin chưa đọc");
  await page.waitForTimeout(100);

  expect(overlap(await boxIfThere(bubble(page)), await boardBox(page))).toBe(0);
});

test("a bubble on screen goes as soon as scrolling would put it over the board", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const fake = await openFakeRoom(page, LUDO_ROOM, 0);
  await expect(page.locator("[data-chat-button]")).toBeAttached();
  fake.receive({ kind: "text", text: "Chào" });
  await expect(bubble(page)).toBeVisible();

  await scrollToEnd(page);

  // Well before it would have timed out.
  await expect(bubble(page)).toHaveCount(0, { timeout: 1000 });
});

const LUDO_LOBBY = {
  gameId: "ludo",
  seats: [
    { kind: "human", name: "Lan", standIn: false },
    { kind: "human", name: "Minh", standIn: false },
    null,
  ],
  record: ludoRecord(3, []),
} as const;

for (const width of [1024, 1100, 1280]) {
  test(`Sảnh chờ ở ${String(width)} px: the chat covers neither the players nor its own button`, async ({
    page,
  }) => {
    test.skip(test.info().project.name === "mobile", "a laptop");
    await page.setViewportSize({ width, height: 768 });
    await openFakeRoom(page, LUDO_LOBBY, 0);
    await expect(page.locator("[data-chat-button]")).toBeVisible();
    await page.locator("[data-chat-button]").click();
    await expect(log(page)).toBeVisible();

    const panel = await page.locator("#room-chat").boundingBox();
    expect(overlap(panel, await page.locator("[data-chat-button]").boundingBox())).toBe(0);
    if (width >= 1264) {
      expect(
        overlap(panel, await page.getByRole("region", { name: "Người chơi" }).boundingBox()),
      ).toBe(0);
      return;
    }
    // A sheet from below: all of the lobby stays within reach above it, by scrolling.
    await scrollToEnd(page);
    await page.waitForTimeout(100);
    const seats = await page.getByRole("region", { name: "Người chơi" }).boundingBox();
    expect(overlap(await page.locator("#room-chat").boundingBox(), seats)).toBe(0);
  });
}

test("Đủ người khi chat đang mở: the sheet makes room for part of the board", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const fake = await openFakeRoom(page, LUDO_LOBBY, 0);
  await page.locator("[data-chat-button]").focus();
  await page.keyboard.press("Enter");
  await expect(log(page)).toBeVisible();

  fake.update({
    seats: [...LUDO_LOBBY.seats.slice(0, 2), { kind: "human", name: "Chi", standIn: false }],
  });
  await expect(page.locator("[data-ply]")).toBeVisible();
  await page.waitForTimeout(100);

  const panel = await page.locator("#room-chat").boundingBox();
  const area = await boardBox(page);
  expect(panel).not.toBeNull();
  expect((panel?.y ?? 0) - (area?.y ?? 0)).toBeGreaterThanOrEqual(96);
});

test("Cờ vua trên máy tính: the panel has its height, and says what it covers", async ({
  page,
}) => {
  test.skip(test.info().project.name === "mobile", "a laptop");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openFakeRoom(page, { ...CHESS_ROOM, record: chessRecord(["e2e4", "f7f6", "d1h5"]) }, 1);
  await expect(chatButton(page)).toBeVisible();
  const sheetBefore = await page.getByRole("button", { name: "Lật bàn" }).boundingBox();
  await chatButton(page).click();
  await expect(log(page)).toBeVisible();

  const panel = page.locator("#room-chat");
  const box = await panel.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(320);
  // Its controls did not move, and it stays off them.
  const flip = page.getByRole("button", { name: "Lật bàn" });
  expect(await flip.boundingBox()).toEqual(sheetBefore);
  expect(overlap(box, sheetBefore)).toBe(0);
  // The line about the check, read in the panel: where it was is covered.
  await expect(panel.getByText("Chiếu!", { exact: true })).toBeVisible();
  expect(overlap(box, await page.getByText("Sổ ghi").boundingBox())).toBe(0);
});

test("Cờ vua trên máy tính: what is selected shows in the panel, told once", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "a laptop");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openFakeRoom(page, CHESS_ROOM, 0);
  await chatButton(page).click();
  await expect(log(page)).toBeVisible();

  await chessSquare(page, "g1").click();

  const panel = page.locator("#room-chat");
  await expect(panel.getByText(/Mã.*g1/u).first()).toBeVisible();
  // Under the panel it keeps its room, out of the way of screen readers.
  await expect(page.locator('[data-chat-covered] [aria-live="polite"]').first()).toBeHidden();
});

for (const size of [
  { width: 1280, height: 720 },
  { width: 1024, height: 600 },
]) {
  for (const [name, room] of [
    ["Cờ vua", CHESS_ROOM],
    ["Cờ cá ngựa", LUDO_ROOM],
  ] as const) {
    test(`${name} ở ${String(size.width)} × ${String(size.height)}: the panel covers none of the game's buttons`, async ({
      page,
    }) => {
      test.skip(test.info().project.name === "mobile", "a laptop");
      await page.setViewportSize(size);
      await openFakeRoom(page, room, 0);
      await expect(chatButton(page)).toBeVisible();
      await chatButton(page).click();
      await expect(log(page)).toBeVisible();

      const panel = await page.locator("#room-chat").boundingBox();
      for (const button of [
        chatButton(page),
        page.getByRole("button", { name: "Đầu hàng" }),
        page.getByRole("button", { name: "Lật bàn" }),
        rollButton(page),
      ]) {
        if ((await button.count()) > 0) expect(overlap(panel, await button.boundingBox())).toBe(0);
      }
      // The field is on screen, and the list has room to read.
      expect(overlap(panel, await boardBox(page))).toBe(0);
      expect((await log(page).boundingBox())?.height).toBeGreaterThanOrEqual(60);
    });
  }
}

test("Số điện thoại trong tin không thành link trên iOS: the page says so", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="format-detection"]')).toHaveAttribute(
    "content",
    "telephone=no",
  );
});
