import { applyEntry, createSession, type GameRecord, toRecord } from "@board-games/engine";
import {
  chess,
  type ChessMove,
  type Fence,
  fenceRace,
  type FenceRaceMove,
  ludo,
  LUDO_DEFAULT_OPTIONS,
} from "@board-games/games";
import {
  type ChatBody,
  CLOSE_CODE,
  type RoomCode,
  type RoomView,
  type ServerMessage,
} from "@board-games/protocol";
import {
  type Browser,
  type BrowserContext,
  expect,
  type Locator,
  type Page,
  type WebSocketRoute,
} from "@playwright/test";

// Shared by the E2E specs. The browser language is pinned to Vietnamese in playwright.config.ts.

/** The menu's level-1 heading, its hero: how a test knows it is back on the menu. */
export const MENU_HEADING = "Chơi cờ cùng bạn bè, ngay trên trình duyệt";

export const cell = (page: Page, row: number, col: number) =>
  page.getByRole("button", { name: new RegExp(`^Hàng ${row}, cột ${col},`) });
export const status = (page: Page) => page.getByRole("status");
/** The board of any game: a group of cells (Tic-tac-toe) or a grid (Cờ caro). */
export const board = (page: Page) =>
  page.getByRole("group", { name: "Bàn cờ" }).or(page.getByRole("grid", { name: "Bàn cờ" }));

export async function play(page: Page, ...cells: readonly (readonly [number, number])[]) {
  for (const [row, col] of cells) await cell(page, row, col).click();
}

/** The accessible name of every cell, row by row: what a screen reader hears of the board. */
export function boardCells(page: Page): Promise<string[]> {
  return board(page)
    .getByRole("button")
    .evaluateAll((cells) => cells.map((element) => element.getAttribute("aria-label") ?? ""));
}

/** How many cells hold `mark` ("X", "O"). */
export async function countMarks(page: Page, mark: string): Promise<number> {
  return (await boardCells(page)).filter((name) => name.endsWith(`, ${mark}`)).length;
}

/** Clicks the first empty cell, row by row. */
export async function playFirstEmptyCell(page: Page): Promise<void> {
  await board(page)
    .getByRole("button", { name: /, trống$/ })
    .first()
    .click();
}

/** The status line once the AI has moved: where it played, then the player's turn as `mark`. */
export const afterAiMove = (mark: "X" | "O") =>
  new RegExp(`^Máy đánh hàng \\d, cột \\d\\. Đến lượt bạn \\(${mark}\\)$`);

/**
 * Against the AI: plays the first empty cell as `mark` and waits until the AI has answered and it
 * is the player's turn again.
 */
export async function playAndWaitForAi(page: Page, mark: "X" | "O"): Promise<void> {
  const aiMark = mark === "X" ? "O" : "X";
  const aiMoves = await countMarks(page, aiMark);
  await playFirstEmptyCell(page);
  await expect.poll(() => countMarks(page, aiMark)).toBe(aiMoves + 1);
  await expect(status(page)).toHaveText(afterAiMove(mark));
}

/** The mode label next to the game's name on the play screen, e.g. "Với máy · Khó". */
export const modeLabel = (page: Page, label: string) =>
  page.getByRole("main").getByText(label, { exact: true });

// Names from src/config/storage-keys.ts.
const SAVED_GAMES_DB = "board-games-saved-games";
const SAVED_GAMES_STORE = "saved-games";

/** Keys of the saved games (src/transport/saved-game.ts `slotKey`, and M1's bare game id). */
export const SLOT = {
  local: "tictactoe:local",
  ai: "tictactoe:ai",
  legacy: "tictactoe",
} as const;

/** A page of the app that does not touch IndexedDB, to prepare storage before the game opens. */
export const PAGE_WITHOUT_STORAGE = "/play/khong-co-game-nay";

/**
 * The value stored under `key` in the saved games' IndexedDB, or `null` when there is none. It
 * never creates the database: opening a missing one would create it empty, and idb-keyval only
 * creates its store when it creates the database, so the app could never save again. The upgrade
 * is aborted instead.
 */
export function readSaved(page: Page, key: string): Promise<unknown> {
  return page.evaluate(
    ([dbName, storeName, slot]) =>
      new Promise<unknown>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onupgradeneeded = () => {
          request.transaction?.abort();
        };
        request.onerror = () => {
          if (request.error?.name === "AbortError") resolve(null);
          else reject(new Error(`cannot open ${dbName}: ${String(request.error)}`));
        };
        request.onsuccess = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(storeName)) {
            database.close();
            resolve(null);
            return;
          }
          const read = database.transaction(storeName, "readonly").objectStore(storeName).get(slot);
          read.onsuccess = () => {
            database.close();
            resolve(read.result ?? null);
          };
          read.onerror = () => {
            database.close();
            reject(new Error("cannot read the saved game"));
          };
        };
      }),
    [SAVED_GAMES_DB, SAVED_GAMES_STORE, key] as const,
  );
}

interface SavedShape {
  readonly inProgress?: boolean;
  readonly mode?: { readonly kind?: string; readonly seats?: readonly { kind?: string }[] };
  readonly record?: { readonly entries?: readonly unknown[] };
}

/** The saved game under `key` as far as the tests look at it, or `null` when there is none. */
export async function readSavedGame(page: Page, key: string): Promise<SavedShape | null> {
  return (await readSaved(page, key)) as SavedShape | null;
}

/** Number of moves of the game saved under `key` (0 when none is saved). */
export async function savedMoveCount(page: Page, key: string): Promise<number> {
  return (await readSavedGame(page, key))?.record?.entries?.length ?? 0;
}

/** Stores `value` under `key`, creating the database the way idb-keyval does. */
export function writeSaved(page: Page, key: string, value: unknown): Promise<void> {
  return page.evaluate(
    ([dbName, storeName, slot, saved]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(storeName);
        };
        request.onerror = () => {
          reject(new Error(`cannot open ${dbName}`));
        };
        request.onsuccess = () => {
          const database = request.result;
          const write = database.transaction(storeName, "readwrite");
          write.objectStore(storeName).put(saved, slot);
          write.oncomplete = () => {
            database.close();
            resolve();
          };
          write.onerror = () => {
            database.close();
            reject(new Error("cannot write the saved game"));
          };
        };
      }),
    [SAVED_GAMES_DB, SAVED_GAMES_STORE, key, value] as const,
  );
}

/** Opens the Tic-tac-toe setup screen from the menu's card. */
export async function openSetupFromMenu(page: Page): Promise<void> {
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Tic-tac-toe" }) })
    .getByRole("link", { name: "Chơi", exact: true })
    .click();
  await expect(page).toHaveURL(/\/play\/tictactoe$/);
}

const startButton = (page: Page) => page.getByRole("button", { name: "Bắt đầu" });

/** Picks `option` in the setup screen's group named `group` ("Chế độ", "Mức độ", "Ai đi trước"). */
export async function choose(page: Page, group: string, option: string): Promise<void> {
  const options = page.getByRole("group", { name: group });
  // The radios are visually hidden: a player clicks the option's label, which shows the choice.
  await options
    .locator("label")
    .filter({ hasText: new RegExp(`^${option}$`) })
    .click();
  await expect(options.getByRole("radio", { name: option })).toBeChecked();
}

/**
 * Presses "Start" once the setup screen knows the games in progress ("Start" is not pressable
 * before), so a press is never ignored.
 */
export async function pressStart(page: Page): Promise<void> {
  await expect(startButton(page)).toHaveAttribute("aria-disabled", "false");
  await startButton(page).click();
}

/** From the menu, starts a new Tic-tac-toe game on this device and waits for its board. */
export async function startLocalGame(page: Page): Promise<void> {
  await openSetupFromMenu(page);
  await choose(page, "Chế độ", "Cùng máy");
  await pressStart(page);
  // The start request is removed from the address once read.
  await expect(page).toHaveURL(/\/play\/tictactoe\/local$/);
  await expect(board(page)).toBeVisible();
}

/** From the menu, starts a new Tic-tac-toe game against the AI and waits for its board. */
export async function startAiGame(
  page: Page,
  { level = "Vừa", first = "Tôi" }: { readonly level?: string; readonly first?: string } = {},
): Promise<void> {
  await openSetupFromMenu(page);
  await choose(page, "Chế độ", "Đấu với máy");
  await choose(page, "Mức độ", level);
  await choose(page, "Ai đi trước", first);
  await pressStart(page);
  await expect(page).toHaveURL(/\/play\/tictactoe\/ai$/);
  await expect(board(page)).toBeVisible();
}

/** The "Continue a game" section of the menu. */
export const continueSection = (page: Page) =>
  page.getByRole("region", { name: "Tiếp tục ván dở" });

// --- Cờ cá ngựa -------------------------------------------------------------------------------

/** One step of a Cờ cá ngựa game: a roll locked to a face, or a horse (numbered from 0) moved. */
export type LudoStep = { readonly roll: 1 | 2 | 3 | 4 | 5 | 6 } | { readonly horse: number };

/**
 * The record of a Cờ cá ngựa game played with the steps given, the dice decided in advance: built
 * with the engine's `applyEntry`, so a step the rules refuse fails here, not in the app.
 */
export function ludoRecord(playerCount: 2 | 3 | 4, steps: readonly LudoStep[]): GameRecord {
  const created = createSession(ludo, { playerCount, options: LUDO_DEFAULT_OPTIONS });
  if (!created.ok) throw new Error(created.error);
  let session = created.value;
  for (const [index, step] of steps.entries()) {
    const entry =
      "roll" in step
        ? { move: { type: "roll" }, outcome: step.roll }
        : { move: { type: "move", horse: step.horse } };
    const played = applyEntry(ludo, session, entry);
    if (!played.ok) throw new Error(`step ${index + 1}: ${played.error}`);
    session = played.value;
  }
  return JSON.parse(JSON.stringify(toRecord(session))) as GameRecord;
}

/** A saved same-device Cờ cá ngựa game (slot "ludo:local") with the steps given. */
export function savedLudoGame(playerCount: 2 | 3 | 4, steps: readonly LudoStep[]): unknown {
  return {
    version: 2,
    savedAt: "2026-11-03T08:00:00.000Z",
    inProgress: true,
    mode: { kind: "local" },
    record: ludoRecord(playerCount, steps),
  };
}

export const rollButton = (page: Page) => page.getByRole("button", { name: "Gieo xúc xắc" });
/**
 * The horses that may move: see-through buttons laid over them, for the keyboard and screen
 * readers. A touch or a click goes through them to the board (`tapHorse`).
 */
export const horseChoices = (page: Page) =>
  page.getByRole("group", { name: "Chọn ngựa" }).getByRole("button");

/** The horses that may move, by what they are read as ("Ngựa 1: ra chuồng"), in order. */
export async function expectHorseChoices(page: Page, names: readonly string[]): Promise<void> {
  await expect(horseChoices(page)).toHaveCount(names.length);
  for (const [index, name] of names.entries()) {
    await expect(horseChoices(page).nth(index)).toHaveAccessibleName(name);
  }
}

/**
 * Touches (or clicks) the horse a choice is laid over, at the centre of its figure, as a finger
 * would: the board takes the horse nearest the touch.
 */
export async function tapHorse(page: Page, choice: Locator, touch = false): Promise<void> {
  const box = await choice.boundingBox();
  if (box === null) throw new Error("The horse is not on screen");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}
export const die = (page: Page) => page.getByRole("img", { name: /^Xúc xắc/ });
/** The roll before, shown beside the die once it waits for the next roll. */
export const lastRoll = (page: Page) => page.locator("[data-ludo-last-roll]");

/**
 * The number of the roll just made, from the board's hint ("Đỏ gieo được 3…"): the die itself
 * waits for the next roll as soon as the turn moves on.
 */
export async function lastRolledFace(page: Page): Promise<number> {
  const hint = page.locator("[data-ludo-hint]");
  await expect(hint).toHaveText(/gieo được [1-6]/);
  return Number(/gieo được ([1-6])/.exec((await hint.textContent()) ?? "")?.[1]);
}
export const horsePositions = (page: Page) =>
  page.getByRole("list", { name: "Vị trí các ngựa" }).getByRole("listitem");

/** Moves played in the game on the board, rolls included (the board's `data-ply`). */
export async function ludoPly(page: Page): Promise<number> {
  return Number(await page.locator("[data-ply]").getAttribute("data-ply"));
}

/**
 * Plays one turn with the keyboard: Enter on "Roll the die", then Enter on the first choice if the
 * roll left any (the focus goes there by itself). Waits until each move is in, counted by the
 * number of moves played, so two alike moves in a row are told apart. Returns the face rolled.
 */
export async function playLudoTurnWithKeyboard(page: Page): Promise<number> {
  await expect(rollButton(page)).toHaveAttribute("aria-disabled", "false");
  const before = await ludoPly(page);
  await rollButton(page).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => ludoPly(page)).toBe(before + 1);
  const face = await lastRolledFace(page);
  if ((await horseChoices(page).count()) > 0) {
    await expect(horseChoices(page).first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => ludoPly(page)).toBe(before + 2);
    await expect(rollButton(page)).toBeFocused();
  }
  return face;
}

// Online rooms.

/** The address of a room page. */
export const ROOM_URL = /\/room\/[2-9A-HJKMNP-Z]{6}$/;

/** The seats in a room's lobby. */
export const players = (page: Page) =>
  page.getByRole("region", { name: "Người chơi" }).getByRole("listitem");
export const nameField = (page: Page) => page.getByRole("textbox", { name: "Tên của bạn" });

interface Friend {
  readonly context: BrowserContext;
  readonly page: Page;
}

/**
 * Someone who has never played online opens `url` in their own browser: the page enters the room
 * at once, asking nothing (change `ask-name-in-lobby`).
 */
export async function openAsStranger(browser: Browser, url: string): Promise<Friend> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  return { context, page };
}

/**
 * Asks for a name in the lobby of a page with none yet: the field is empty and has the focus; types
 * `name` there, not joining yet.
 */
export async function giveNameInLobby(page: Page, name: string): Promise<void> {
  await expect(nameField(page)).toBeFocused();
  await expect(nameField(page)).toHaveValue("");
  await nameField(page).fill(name);
}

/** A stranger opens `url` and gives their name in the lobby, before "Join game". */
export async function openAsNewPlayer(
  browser: Browser,
  url: string,
  name: string,
): Promise<Friend> {
  const friend = await openAsStranger(browser, url);
  await giveNameInLobby(friend.page, name);
  return friend;
}

/**
 * Red has just rolled a 6 in a Cờ cá ngựa game for four, and all four of its horses can move: three
 * on the track, far enough apart, and one still in its stable (the others lost every turn).
 */
export const LUDO_FOUR_CHOICES: readonly LudoStep[] = [
  // Red: three 6s for horse 1, then a 5; the others lose their turns.
  { roll: 6 },
  { horse: 0 },
  { roll: 6 },
  { horse: 0 },
  { roll: 6 },
  { horse: 0 },
  { roll: 5 },
  { horse: 0 },
  { roll: 2 },
  { roll: 2 },
  { roll: 2 },
  // Red: horse 2 out and on by 6, then 4.
  { roll: 6 },
  { horse: 1 },
  { roll: 6 },
  { horse: 1 },
  { roll: 4 },
  { horse: 1 },
  { roll: 2 },
  { roll: 2 },
  { roll: 2 },
  // Red: horse 3 out and on by 3.
  { roll: 6 },
  { horse: 2 },
  { roll: 3 },
  { horse: 2 },
  { roll: 2 },
  { roll: 2 },
  { roll: 2 },
  // Red rolls a 6: horses 1–3 move on, horse 4 comes out.
  { roll: 6 },
];

/** Sends a message of the protocol, as the server would. */
function send(socket: WebSocketRoute, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

/** A game of Cờ rào with the moves given, as a record. */
export function fenceRaceRecord(
  playerCount: 2 | 3 | 4,
  moves: readonly FenceRaceMove[],
): GameRecord {
  const created = createSession(fenceRace, { playerCount });
  if (!created.ok) throw new Error(created.error);
  let session = created.value;
  for (const [index, move] of moves.entries()) {
    const played = applyEntry(fenceRace, session, { move });
    if (!played.ok) throw new Error(`move ${index + 1}: ${played.error}`);
    session = played.value;
  }
  return JSON.parse(JSON.stringify(toRecord(session))) as GameRecord;
}

/** A saved same-device Cờ rào game (slot "fence-race:local") with the moves given. */
export function savedFenceRaceGame(
  playerCount: 2 | 3 | 4,
  moves: readonly FenceRaceMove[],
): unknown {
  return {
    version: 2,
    savedAt: "2026-11-06T08:00:00.000Z",
    inProgress: true,
    mode: { kind: "local" },
    record: fenceRaceRecord(playerCount, moves),
  };
}

export const fenceFrame = (page: Page) => page.locator("[data-fence-race-frame]");
export const fenceLayer = (page: Page) => page.locator("[data-fence-race-layer]");
export const fencePreview = (page: Page) => page.locator("[data-preview]");
export const fenceCell = (page: Page, name: string) => page.locator(`[data-cell="${name}"]`);
export const fenceMode = (page: Page, name: string) =>
  page.getByRole("group", { name: "Chế độ" }).getByRole("button", { name: new RegExp(`^${name}`) });

/**
 * Where a touch means this fence, on screen: on its line, a little along it, so the nearest line
 * is the fence's own. `turned`: the board is the second seat's.
 */
export async function fencePoint(
  page: Page,
  { row, col, dir }: Fence,
  turned = false,
): Promise<{ x: number; y: number }> {
  const grid = await page.locator("[data-fence-race-grid]").boundingBox();
  if (grid === null) throw new Error("no board");
  const columns = await page.locator("[data-fence-race-grid]").evaluate((element) => {
    return getComputedStyle(element).gridTemplateColumns.split(" ").length;
  });
  const cell = grid.width / columns;
  const rows = Math.round(grid.height / cell);
  const a = col + 1 + (dir === "h" ? 0.3 : 0);
  const b = row + 1 + (dir === "v" ? 0.3 : 0);
  return {
    x: grid.x + (turned ? columns - a : a) * cell,
    y: grid.y + (turned ? rows - b : b) * cell,
  };
}

/** A press and a lift at the place of this fence: tries it, or chooses it to break. */
export async function tryFenceAt(page: Page, fence: Fence, turned = false): Promise<void> {
  const layer = fenceLayer(page);
  await layer.scrollIntoViewIfNeeded();
  const point = await fencePoint(page, fence, turned);
  const box = await layer.boundingBox();
  if (box === null) throw new Error("no layer");
  await layer.click({ position: { x: point.x - box.x, y: point.y - box.y } });
}

/** The room code of `openFakeRoom`. */
const FAKE_ROOM_CODE = "ABC234" as RoomCode;

/**
 * Opens a room whose server is the test: it answers the greeting with `room` (a game with every seat
 * taken, so the game shows at once) seen from seat `you`, and answers pings. `loseConnection` drops
 * the socket and leaves the client's reconnections unanswered, as when the network is gone, until
 * `restoreConnection`. It only writes down the moves the page sends (`movesSent`). The browser
 * already remembers a name (Lan), so no name is asked for. A chat message the page sends is
 * written at once, unless `chatAnswers` is off; `receive` brings new messages from other people.
 */
export async function openFakeRoom(
  page: Page,
  room: Pick<RoomView, "gameId" | "seats" | "record"> &
    Partial<Pick<RoomView, "turnIdleMs" | "chat">>,
  you = 0,
): Promise<{
  loseConnection: () => Promise<void>;
  /** The network is back: the reconnection waiting, or the next one, is answered. */
  restoreConnection: () => void;
  /** The moves the page has sent, oldest first. */
  movesSent: () => readonly unknown[];
  receive: (...messages: readonly ChatBody[]) => void;
  /** Whether a chat message is answered; `false`, as a server that lost it. */
  setChatAnswers: (answers: boolean) => void;
  /** The room as it is now: send it again with new fields (a new game, a player gone). */
  update: (changes: Partial<RoomView>) => void;
}> {
  let answering = true;
  let chatAnswers = true;
  const moves: unknown[] = [];
  const sockets: WebSocketRoute[] = [];
  let current: RoomView = {
    code: FAKE_ROOM_CODE,
    revision: 1,
    gameNumber: 1,
    host: 0,
    turnIdleMs: null,
    chat: [],
    ...room,
  };
  const broadcast = () => {
    for (const socket of sockets) send(socket, { type: "room", room: current, you });
  };
  const write = (body: ChatBody, sender: { id: string; name: string; mine: boolean }) => {
    const revision = current.revision + 1;
    current = {
      ...current,
      revision,
      chat: [...current.chat, { seq: revision, body, ...sender }].slice(-30),
    };
    broadcast();
  };
  await page.routeWebSocket(/\/api\/realtime$/, (socket) => {
    sockets.push(socket);
    socket.onMessage((message) => {
      if (!answering) return;
      const data = JSON.parse(String(message)) as {
        type?: string;
        id?: string;
        body?: ChatBody;
        move?: unknown;
      };
      if (data.type === "join") {
        send(socket, { type: "room", room: current, you });
      } else if (data.type === "move") {
        moves.push(data.move);
      } else if (data.type === "chat" && chatAnswers && data.body !== undefined) {
        write(data.body, { id: data.id ?? "", name: "Lan", mine: true });
      } else if (data.type === "ping") {
        send(socket, { type: "pong" });
      }
    });
  });
  // A player who has played online before (src/features/identity): no name to give, in any language.
  await page.addInitScript(
    (identity) => {
      window.localStorage.setItem("board-games:identity", identity);
    },
    JSON.stringify({ playerId: "e2e-fake-room-player-0001", name: "Lan" }),
  );
  await page.goto(`/room/${FAKE_ROOM_CODE}`);
  return {
    loseConnection: async () => {
      answering = false;
      // A code the client reconnects after, as after any lost connection.
      await Promise.all(
        sockets.map((socket) => socket.close({ code: CLOSE_CODE.GreetingTimeout })),
      );
    },
    restoreConnection: () => {
      answering = true;
      // A reconnection already open is still waiting for its greeting to be answered.
      broadcast();
    },
    movesSent: () => moves,
    receive: (...messages) => {
      for (const body of messages) {
        write(body, { id: `other-${String(current.revision)}-chat`, name: "Minh", mine: false });
      }
    },
    setChatAnswers: (answers) => {
      chatAnswers = answers;
    },
    update: (changes) => {
      current = { ...current, revision: current.revision + 1, ...changes };
      broadcast();
    },
  };
}

/** A Chess move by its squares (`e2e4`, `b7b8n`), or "claim": the claim of a draw. */
function chessMove(move: string): ChessMove {
  if (move === "claim") return { type: "claim-draw" };
  // Unchecked here: the rules check it when it is applied.
  const squares = { from: move.slice(0, 2), to: move.slice(2, 4) };
  const promotion = move[4];
  return (promotion === undefined ? squares : { ...squares, promotion }) as unknown as ChessMove;
}

/**
 * The record of a Cờ vua game of `moves` (UCI), built with the engine's `applyEntry`, so a move the
 * rules refuse fails here, not in the app.
 */
export function chessRecord(moves: readonly string[]): GameRecord {
  const created = createSession(chess, { playerCount: 2, options: {} });
  if (!created.ok) throw new Error(created.error);
  let session = created.value;
  for (const [index, move] of moves.entries()) {
    const played = applyEntry(chess, session, { move: chessMove(move) });
    if (!played.ok) throw new Error(`move ${index + 1} (${move}): ${played.error}`);
    session = played.value;
  }
  return JSON.parse(JSON.stringify(toRecord(session))) as GameRecord;
}

/** A saved same-device Cờ vua game (slot "chess:local") of `moves` (UCI). */
export function savedChessGame(moves: readonly string[]): unknown {
  return {
    version: 2,
    savedAt: "2026-11-04T08:00:00.000Z",
    inProgress: true,
    mode: { kind: "local" },
    record: chessRecord(moves),
  };
}

/**
 * `plies` legal half-moves (UCI) that end nothing: each the first legal move, in an order turning
 * with the ply, that leaves the game on (no mate, no draw). For a long score sheet.
 */
export function longChessGame(plies: number): readonly string[] {
  const moves: string[] = [];
  let state = chess.setup();
  for (let ply = 0; ply < plies; ply += 1) {
    const legal = chess
      .legalMoves(state)
      .filter((move): move is Extract<ChessMove, { from: string }> => "from" in move);
    const next = legal
      .map((_move, index) => legal[(index + ply * 7) % legal.length])
      .find((move) => move !== undefined && chess.result(chess.applyMove(state, move)) === null);
    if (next === undefined) throw new Error(`no move to keep the game on at ply ${ply}`);
    moves.push(`${next.from}${next.to}${next.promotion ?? ""}`);
    state = chess.applyMove(state, next);
  }
  return moves;
}

/** The button of a chess square by its coordinates, whatever stands on it. */
export const chessSquare = (page: Page, square: string) =>
  page.locator(`[data-square="${square}"]`);

/** Plays `moves` (UCI, no promotion) with the mouse: a click on the piece, then on its square. */
export async function playChess(page: Page, ...moves: readonly string[]): Promise<void> {
  for (const move of moves) {
    await chessSquare(page, move.slice(0, 2)).click();
    await chessSquare(page, move.slice(2, 4)).click();
  }
}

/** The top bar's theme button, named by the theme chosen ("Giao diện: Theo hệ thống"). */
export const themeButton = (page: Page) =>
  page.getByRole("banner").getByRole("button", { name: /^Giao diện: / });
/** The top bar's language button, named by the language in use ("Ngôn ngữ: Tiếng Việt, VI"). */
export const languageButton = (page: Page) =>
  page.getByRole("banner").getByRole("button", { name: /^(Ngôn ngữ|Language|言語): / });

/** Picks a theme from the top bar's menu, as a player does with a mouse or a finger. */
export async function pickTheme(page: Page, name: "Sáng" | "Tối" | "Theo hệ thống") {
  await themeButton(page).click();
  await page.getByRole("menuitemradio", { name }).click();
  await expect(page.getByRole("menu")).toBeHidden();
}

/** Picks a language from the top bar's menu, then waits for the page to show it. */
export async function pickLanguage(page: Page, name: "Tiếng Việt" | "English" | "日本語") {
  const lang = { "Tiếng Việt": "vi", English: "en", 日本語: "ja" }[name];
  await languageButton(page).click();
  await page.getByRole("menuitemradio", { name }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await expect(languageButton(page)).not.toHaveAttribute("aria-busy");
}
