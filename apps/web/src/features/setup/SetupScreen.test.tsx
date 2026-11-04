import type { RoomCode } from "@board-games/protocol";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SETUP_CHOICE_KEY_PREFIX } from "@/config/storage-keys";
import { readIdentity, saveName } from "@/features/identity/identity";
import type { CreateRoomResult } from "@/features/room/create-room";
import { loadFreshIdentity } from "@/test/fresh-identity";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";
import type { ModeSettings, SavedGameStore } from "@/transport/types";

import { readStartRequest } from "./play-setup";
import { SetupScreen } from "./SetupScreen";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/identity/identity", () =>
  import("@/test/fresh-identity").then((module) => module.freshIdentity),
);

beforeEach(loadFreshIdentity);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  router.push.mockReset();
  window.localStorage.clear();
});

const AI_HARD: ModeSettings = {
  kind: "ai",
  first: "human",
  seats: [{ kind: "human" }, { kind: "ai", level: "hard" }],
};
const AI_MEDIUM: ModeSettings = {
  kind: "ai",
  first: "human",
  seats: [{ kind: "human" }, { kind: "ai", level: "medium" }],
};
const LOCAL: ModeSettings = { kind: "local" };
const TWO_PLAYERS = { min: 2, max: 2 } as const;

const radio = (name: string) => screen.getByRole("radio", { name });
const startButton = () => screen.getByRole("button", { name: "Bắt đầu" });

/** Renders the setup screen and waits until the games in progress have been read. */
async function renderSetup({
  store = createMemoryStore(),
  supportsAI = true,
}: {
  store?: SavedGameStore;
  supportsAI?: boolean;
} = {}) {
  const view = renderWithIntl(
    <SetupScreen
      gameId="tictactoe"
      supportsAI={supportsAI}
      players={TWO_PLAYERS}
      realtimeUrl={null}
      store={store}
    />,
  );
  await waitFor(() => {
    expect(startButton()).toHaveAttribute("aria-disabled", "false");
  });
  return view;
}

/** The play screen the last "Start" opened, with the game it asked for. */
function opened() {
  expect(router.push).toHaveBeenCalledOnce();
  const url = new URL(String(router.push.mock.calls[0]?.[0]), "http://localhost");
  const mode = url.pathname.split("/").at(-1) === "ai" ? "ai" : "local";
  return { path: url.pathname, setup: readStartRequest(url.searchParams, mode) };
}

describe("SetupScreen", () => {
  it("offers the AI at Medium, the player moving first, the first time", async () => {
    await renderSetup();

    expect(screen.getByRole("heading", { level: 1, name: "Tic-tac-toe" })).toBeInTheDocument();
    expect(radio("Đấu với máy")).toBeChecked();
    expect(radio("Vừa")).toBeChecked();
    expect(radio("Tôi")).toBeChecked();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });

  it("Từ màn hình bắt đầu ván: a link opens the game's rules", async () => {
    await renderSetup();

    expect(screen.getByRole("link", { name: "Luật chơi" })).toHaveAttribute(
      "href",
      "/rules/tictactoe",
    );
  });

  it("starts a game against the AI at Hard, the AI moving first", async () => {
    await renderSetup();

    await userEvent.click(radio("Khó"));
    await userEvent.click(radio("Máy"));
    await userEvent.click(startButton());

    expect(router.push).toHaveBeenCalledWith("/play/tictactoe/ai?new=1&level=hard&first=ai");
    expect(opened()).toEqual({
      path: "/play/tictactoe/ai",
      setup: { mode: "ai", level: "hard", first: "ai" },
    });
  });

  it("starts a same-device game, where the level and who moves first do not apply", async () => {
    await renderSetup();

    await userEvent.click(radio("Cùng máy"));

    expect(screen.queryByRole("group", { name: "Mức độ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Ai đi trước" })).not.toBeInTheDocument();
    await userEvent.click(startButton());
    expect(router.push).toHaveBeenCalledWith("/play/tictactoe/local?new=1");
  });

  it("offers the same-device and online modes only for a game without an AI", async () => {
    await renderSetup({ supportsAI: false });

    expect(
      screen.getAllByRole("radio").map((option) => option.closest("label")?.textContent),
    ).toEqual(["Cùng máy", "Online"]);
    expect(radio("Cùng máy")).toBeChecked();
    expect(screen.queryByRole("group", { name: "Mức độ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Ai đi trước" })).not.toBeInTheDocument();
    await userEvent.click(startButton());
    expect(opened()).toEqual({ path: "/play/tictactoe/local", setup: { mode: "local" } });
  });

  it("shows the choices of the last game started next time", async () => {
    const first = await renderSetup();
    await userEvent.click(radio("Khó"));
    await userEvent.click(radio("Máy"));
    await userEvent.click(startButton());
    first.unmount();

    await renderSetup();

    expect(radio("Đấu với máy")).toBeChecked();
    expect(radio("Khó")).toBeChecked();
    expect(radio("Máy")).toBeChecked();
  });

  it("shows the defaults, without any error, when the remembered choice is corrupt", async () => {
    window.localStorage.setItem(`${SETUP_CHOICE_KEY_PREFIX}tictactoe`, "{corrupt");

    await renderSetup();

    expect(radio("Đấu với máy")).toBeChecked();
    expect(radio("Vừa")).toBeChecked();
    expect(radio("Tôi")).toBeChecked();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lists a game in progress against the AI, with a way to continue it named by its mode", async () => {
    await renderSetup({
      store: createMemoryStore({ "tictactoe:ai": { settings: AI_HARD, record: {} } }),
    });

    const list = screen.getByRole("region", { name: "Ván đang dở" });
    expect(within(list).getByText("Với máy · Khó")).toBeInTheDocument();
    expect(within(list).getByRole("link", { name: "Tiếp tục: Với máy · Khó" })).toHaveAttribute(
      "href",
      "/play/tictactoe/ai",
    );
  });

  it("gives each game in progress its own way to continue", async () => {
    await renderSetup({
      store: createMemoryStore({
        "tictactoe:local": { settings: LOCAL, record: {} },
        "tictactoe:ai": { settings: AI_HARD, record: {} },
        "chess:local": { settings: LOCAL, record: {} },
      }),
    });

    expect(
      screen.getAllByRole("link", { name: /^Tiếp tục/ }).map((link) => link.getAttribute("href")),
    ).toEqual(["/play/tictactoe/ai", "/play/tictactoe/local"]);
    expect(screen.getByRole("link", { name: "Tiếp tục: Cùng máy" })).toBeInTheDocument();
  });

  it("lists nothing when no game is in progress", async () => {
    await renderSetup({
      store: createMemoryStore({
        "tictactoe:ai": { settings: AI_HARD, record: {}, inProgress: false },
      }),
    });

    expect(screen.queryByRole("region", { name: "Ván đang dở" })).not.toBeInTheDocument();
  });

  it("keeps the game in progress when the player cancels", async () => {
    const store = createMemoryStore({ "tictactoe:ai": { settings: AI_MEDIUM, record: {} } });
    await renderSetup({ store });

    await userEvent.click(startButton());
    const dialog = screen.getByRole("dialog", { name: "Bỏ ván đang dở?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Giữ ván dở" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    expect(store.entries.has("tictactoe:ai")).toBe(true);
  });

  it("starts the new game chosen once the player agrees to drop the one in progress", async () => {
    const store = createMemoryStore({ "tictactoe:ai": { settings: AI_MEDIUM, record: {} } });
    await renderSetup({ store });

    await userEvent.click(radio("Khó"));
    await userEvent.click(startButton());
    const dialog = screen.getByRole("dialog", { name: "Bỏ ván đang dở?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Bắt đầu ván mới" }));

    expect(opened().setup).toEqual({ mode: "ai", level: "hard", first: "human" });
    // The play screen drops it when the new game starts; this screen writes nothing.
    expect(store.entries.has("tictactoe:ai")).toBe(true);
  });

  it("does not ask about, nor touch, a game in progress in the other mode", async () => {
    const store = createMemoryStore({ "tictactoe:local": { settings: LOCAL, record: {} } });
    await renderSetup({ store });

    await userEvent.click(startButton());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opened().path).toBe("/play/tictactoe/ai");
    expect(store.entries.has("tictactoe:local")).toBe(true);
  });

  it("still asks, and deletes nothing, when the saved games cannot be read", async () => {
    const store = createMemoryStore({ "tictactoe:ai": { settings: AI_MEDIUM, record: {} } });
    const clear = vi.spyOn(store, "clear");
    await renderSetup({
      store: { ...store, listInProgress: () => Promise.reject(new Error("blocked")) },
    });

    await userEvent.click(startButton());
    const dialog = screen.getByRole("dialog", { name: "Bỏ ván đang dở?" });
    expect(dialog).toHaveAccessibleDescription(
      "Không đọc được các ván đã lưu. Nếu đang có ván dở ở chế độ này, ván đó sẽ bị bỏ.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Bắt đầu ván mới" }));

    expect(opened().path).toBe("/play/tictactoe/ai");
    expect(clear).not.toHaveBeenCalled();
    expect(store.entries.has("tictactoe:ai")).toBe(true);
  });

  it("changes the level with the keyboard, and says which one is chosen", async () => {
    await renderSetup();
    const user = userEvent.setup();

    radio("Cùng máy").focus();
    await user.tab();
    expect(radio("Vừa")).toHaveFocus();
    await user.keyboard("{ArrowRight}");

    const levels = screen.getByRole("group", { name: "Mức độ" });
    expect(within(levels).getByRole("radio", { checked: true })).toHaveAccessibleName("Khó");
  });

  it("cannot start before the games in progress are known", async () => {
    renderWithIntl(
      <SetupScreen
        gameId="tictactoe"
        supportsAI
        players={TWO_PLAYERS}
        realtimeUrl={null}
        store={{ ...createMemoryStore(), listInProgress: () => new Promise(() => undefined) }}
      />,
    );

    expect(startButton()).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(startButton(), { pointerEventsCheck: 0 });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("asks before starting once the saved games have not answered for 3 seconds", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithIntl(
      <SetupScreen
        gameId="tictactoe"
        supportsAI
        players={TWO_PLAYERS}
        realtimeUrl={null}
        store={{ ...createMemoryStore(), listInProgress: () => new Promise(() => undefined) }}
      />,
    );

    await act(() => vi.advanceTimersByTimeAsync(2999));
    expect(startButton()).toHaveAttribute("aria-disabled", "true");
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(startButton()).toHaveAttribute("aria-disabled", "false");

    await user.click(startButton());
    expect(screen.getByRole("dialog", { name: "Bỏ ván đang dở?" })).toHaveAccessibleDescription(
      "Không đọc được các ván đã lưu. Nếu đang có ván dở ở chế độ này, ván đó sẽ bị bỏ.",
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("lists the games in progress below the choices, so loading them moves nothing above", async () => {
    await renderSetup({
      store: createMemoryStore({ "tictactoe:ai": { settings: AI_HARD, record: {} } }),
    });

    const list = screen.getByRole("region", { name: "Ván đang dở" });
    for (const above of [screen.getByRole("group", { name: "Chế độ" }), startButton()]) {
      expect(above.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("renders in English", async () => {
    renderWithIntl(
      <SetupScreen
        gameId="tictactoe"
        supportsAI
        players={TWO_PLAYERS}
        realtimeUrl={null}
        store={createMemoryStore()}
      />,
      {
        locale: "en",
      },
    );

    expect(screen.getByRole("group", { name: "Level" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Against the computer" })).toBeChecked();
    expect(await screen.findByRole("button", { name: "Start" })).toBeInTheDocument();
  });
});

const CODE = "ABC234" as RoomCode;
const createButton = () => screen.getByRole("button", { name: "Tạo phòng" });
const nameField = () => screen.getByRole("textbox", { name: "Tên của bạn" });

/** Renders the setup screen with a fake server for rooms, and picks the online mode. */
async function renderOnline({
  createRoom = vi.fn(() => Promise.resolve<CreateRoomResult>({ ok: true, code: CODE })),
  store = createMemoryStore(),
  supportsAI = true,
}: {
  createRoom?: (options: unknown) => Promise<CreateRoomResult>;
  store?: SavedGameStore;
  supportsAI?: boolean;
} = {}) {
  const view = renderWithIntl(
    <SetupScreen
      gameId="tictactoe"
      supportsAI={supportsAI}
      players={TWO_PLAYERS}
      realtimeUrl="ws://localhost:3101/api/realtime"
      store={store}
      createRoom={createRoom}
    />,
  );
  await userEvent.click(await screen.findByRole("radio", { name: "Online" }));
  return { createRoom, view };
}

describe("SetupScreen online", () => {
  it("asks for the remembered name instead of the level and who moves first", async () => {
    saveName("Minh");
    await renderOnline();

    expect(nameField()).toHaveValue("Minh");
    expect(screen.queryByRole("group", { name: "Mức độ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Ai đi trước" })).not.toBeInTheDocument();
    expect(createButton()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bắt đầu" })).not.toBeInTheDocument();
  });

  it("is offered for a game without an AI", async () => {
    await renderOnline({ supportsAI: false });

    expect(radio("Online")).toBeChecked();
    expect(createButton()).toBeInTheDocument();
  });

  it("creates a room as the remembered player and opens its page", async () => {
    const { playerId } = saveName("Minh");
    const { createRoom } = await renderOnline();

    await userEvent.click(createButton());

    expect(createRoom).toHaveBeenCalledExactlyOnceWith({
      url: "ws://localhost:3101/api/realtime",
      gameId: "tictactoe",
      identity: { playerId, name: "Minh" },
      // No rule options: `createRoom` sends none.
      options: {},
    });
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/room/ABC234");
  });

  it("offers online again next time once a room was created", async () => {
    saveName("Minh");
    const { view } = await renderOnline();
    await userEvent.click(createButton());
    view.unmount();

    renderWithIntl(
      <SetupScreen
        gameId="tictactoe"
        supportsAI
        players={TWO_PLAYERS}
        realtimeUrl={null}
        store={createMemoryStore()}
      />,
    );

    await waitFor(() => {
      expect(radio("Online")).toBeChecked();
    });
    expect(createButton()).toBeInTheDocument();
  });

  it("creates one room when pressed twice before the screen updates", async () => {
    saveName("Minh");
    const createRoom = vi.fn(() => new Promise<CreateRoomResult>(() => undefined));
    await renderOnline({ createRoom });

    // Both presses land before React renders the locked button.
    act(() => {
      fireEvent.click(createButton());
      fireEvent.click(createButton());
    });

    expect(createRoom).toHaveBeenCalledOnce();
    expect(createButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("says it is creating the room while it waits", async () => {
    saveName("Minh");
    await renderOnline({ createRoom: vi.fn(() => new Promise<CreateRoomResult>(() => undefined)) });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    await userEvent.click(createButton());

    expect(screen.getByRole("status")).toHaveTextContent("Đang tạo phòng…");
  });

  it("does not open the room once the player has left the screen", async () => {
    saveName("Minh");
    let answer: (result: CreateRoomResult) => void = () => undefined;
    const createRoom = vi.fn(
      () =>
        new Promise<CreateRoomResult>((resolve) => {
          answer = resolve;
        }),
    );
    const { view } = await renderOnline({ createRoom });
    await userEvent.click(createButton());

    view.unmount();
    await act(async () => {
      answer({ ok: true, code: CODE });
      await Promise.resolve();
    });

    expect(router.push).not.toHaveBeenCalled();
  });

  it("says the app was updated, with a reload button, when the server is newer", async () => {
    saveName("Minh");
    await renderOnline({
      createRoom: vi.fn(() =>
        Promise.resolve<CreateRoomResult>({ ok: false, error: "outdated-client" }),
      ),
    });

    await userEvent.click(createButton());

    expect(screen.getByRole("alert")).toHaveTextContent(/^Ứng dụng vừa được cập nhật\./);
    expect(screen.getByRole("button", { name: "Tải lại trang" })).toBeInTheDocument();
    expect(screen.queryByText(/Không tạo được phòng/)).not.toBeInTheDocument();
  });

  it("says the room could not be created, and lets the player try again", async () => {
    saveName("Minh");
    const createRoom = vi.fn(() =>
      Promise.resolve<CreateRoomResult>({ ok: false, error: "unreachable" }),
    );
    await renderOnline({ createRoom });

    await userEvent.click(createButton());

    expect(screen.getByRole("alert")).toHaveTextContent("Không tạo được phòng.");
    expect(createButton()).toHaveAttribute("aria-disabled", "false");
    expect(router.push).not.toHaveBeenCalled();
    await userEvent.click(createButton());
    expect(createRoom).toHaveBeenCalledTimes(2);
  });

  it("creates a room without asking, even when the saved games cannot be read", async () => {
    saveName("Minh");
    const store = { ...createMemoryStore(), listInProgress: () => Promise.reject(new Error("no")) };
    const { createRoom } = await renderOnline({ store });

    await userEvent.click(createButton());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createRoom).toHaveBeenCalledOnce();
  });

  it("creates a room without waiting for saved games that never answer", async () => {
    saveName("Minh");
    const store = {
      ...createMemoryStore(),
      listInProgress: () => new Promise<never>(() => undefined),
    };
    const { createRoom } = await renderOnline({ store });

    await userEvent.click(createButton());

    expect(createRoom).toHaveBeenCalledOnce();
  });

  it("does not create a room without a valid name, saying why at the field", async () => {
    const { createRoom } = await renderOnline();

    await userEvent.type(nameField(), "   ");
    await userEvent.click(createButton());

    expect(createRoom).not.toHaveBeenCalled();
    expect(nameField()).toHaveAccessibleDescription("Tên cần có từ 1 đến 24 ký tự.");
    // Back to the field, so the error is read with it.
    expect(nameField()).toHaveFocus();
  });

  it("remembers a new name once the player leaves the field, keeping their id", async () => {
    const { playerId } = saveName("Minh");
    await renderOnline();

    await userEvent.type(nameField(), " Anh");
    await userEvent.tab();

    expect(readIdentity()).toEqual({ playerId, name: "Minh Anh" });
  });

  it("still creates the room, under the name typed, when the browser refuses to store it", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const { createRoom } = await renderOnline();

    await userEvent.type(nameField(), "Lan");
    await userEvent.click(createButton());

    expect(vi.mocked(createRoom).mock.calls[0]?.[0]).toMatchObject({ identity: { name: "Lan" } });
    expect(router.push).toHaveBeenCalledWith("/room/ABC234");
  });

  // Right after a test where the browser refused storage: nothing of that tab may remain.
  it("knows no name on a browser that remembers none", async () => {
    await renderOnline();

    expect(nameField()).toHaveValue("");
  });
});

const CARO_CHOICES = [
  { name: "size", values: [15, 19] },
  { name: "rule", values: ["blocked-ends", "free"] },
] as const;
const CARO_DEFAULTS = { size: 15, rule: "blocked-ends" } as const;

/** The setup screen of Cờ caro, with its rule options, once its games in progress are known. */
async function renderCaro({
  store = createMemoryStore(),
  createRoom = vi.fn(() => Promise.resolve<CreateRoomResult>({ ok: true, code: CODE })),
}: {
  store?: SavedGameStore;
  createRoom?: (options: unknown) => Promise<CreateRoomResult>;
} = {}) {
  const view = renderWithIntl(
    <SetupScreen
      gameId="caro"
      supportsAI
      players={TWO_PLAYERS}
      optionChoices={CARO_CHOICES}
      defaultOptions={CARO_DEFAULTS}
      realtimeUrl="ws://localhost:3101/api/realtime"
      store={store}
      createRoom={createRoom}
    />,
  );
  await waitFor(() => {
    expect(startButton()).toHaveAttribute("aria-disabled", "false");
  });
  return { view, createRoom };
}

const checkedIn = (group: string) =>
  within(screen.getByRole("group", { name: group })).getByRole("radio", { checked: true });

describe("SetupScreen rule options", () => {
  it("offers the board and the win rule of Cờ caro, at their defaults the first time", async () => {
    await renderCaro();

    expect(checkedIn("Bàn cờ")).toHaveAccessibleName("15×15");
    expect(checkedIn("Luật thắng")).toHaveAccessibleName("Chặn hai đầu");
    const sizes = within(screen.getByRole("group", { name: "Bàn cờ" })).getAllByRole("radio");
    expect(sizes).toHaveLength(2);
    expect(sizes[0]).toHaveAccessibleName("15×15");
    expect(sizes[1]).toHaveAccessibleName("19×19");
  });

  it("starts a same-device game on a 19×19 board with the free rule", async () => {
    await renderCaro();

    await userEvent.click(radio("Cùng máy"));
    await userEvent.click(radio("19×19"));
    await userEvent.click(radio("Tự do"));
    await userEvent.click(startButton());

    expect(opened()).toEqual({
      path: "/play/caro/local",
      setup: { mode: "local", options: { size: 19, rule: "free" } },
    });
  });

  it("keeps the rule options in every mode, online included", async () => {
    await renderCaro();

    await userEvent.click(radio("19×19"));
    await userEvent.click(radio("Online"));

    expect(checkedIn("Bàn cờ")).toHaveAccessibleName("19×19");
    expect(checkedIn("Luật thắng")).toHaveAccessibleName("Chặn hai đầu");
    await userEvent.click(radio("Cùng máy"));
    expect(checkedIn("Bàn cờ")).toHaveAccessibleName("19×19");
  });

  it("offers no rule option for Tic-tac-toe", async () => {
    await renderSetup();

    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveAccessibleName("Chế độ");
    expect(groups[1]).toHaveAccessibleName("Mức độ");
    expect(groups[2]).toHaveAccessibleName("Ai đi trước");
  });

  it("changes the board size with the keyboard, and says which one is chosen", async () => {
    await renderCaro();
    const user = userEvent.setup();

    radio("Tôi").focus();
    await user.tab();
    expect(radio("15×15")).toHaveFocus();
    await user.keyboard("{ArrowRight}");

    expect(checkedIn("Bàn cờ")).toHaveAccessibleName("19×19");
    expect(radio("19×19")).toHaveFocus();
  });

  it("shows the rule options of the last game started next time", async () => {
    const { view } = await renderCaro();
    await userEvent.click(radio("19×19"));
    await userEvent.click(radio("Tự do"));
    await userEvent.click(startButton());
    view.unmount();

    await renderCaro();

    await waitFor(() => {
      expect(checkedIn("Bàn cờ")).toHaveAccessibleName("19×19");
    });
    expect(checkedIn("Luật thắng")).toHaveAccessibleName("Tự do");
  });

  it("shows the default rule options with a choice remembered before games had any", async () => {
    window.localStorage.setItem(
      `${SETUP_CHOICE_KEY_PREFIX}caro`,
      JSON.stringify({ mode: "ai", level: "hard", first: "human" }),
    );
    await renderCaro();

    await waitFor(() => {
      expect(checkedIn("Mức độ")).toHaveAccessibleName("Khó");
    });
    expect(checkedIn("Bàn cờ")).toHaveAccessibleName("15×15");
    expect(checkedIn("Luật thắng")).toHaveAccessibleName("Chặn hai đầu");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("still asks before dropping a game in progress of another board size", async () => {
    await renderCaro({
      store: createMemoryStore({
        "caro:ai": { settings: AI_MEDIUM, record: { options: { size: 15, rule: "blocked-ends" } } },
      }),
    });

    await userEvent.click(radio("19×19"));
    await userEvent.click(startButton());

    expect(screen.getByRole("dialog", { name: "Bỏ ván đang dở?" })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("lists a game in progress with its rules, also in the name of its way to continue", async () => {
    await renderCaro({
      store: createMemoryStore({
        "caro:ai": { settings: AI_HARD, record: { options: { size: 19, rule: "free" } } },
      }),
    });

    const list = screen.getByRole("region", { name: "Ván đang dở" });
    expect(within(list).getByText("Với máy · Khó · 19×19 · Tự do")).toBeInTheDocument();
    expect(
      within(list).getByRole("link", { name: "Tiếp tục: Với máy · Khó · 19×19 · Tự do" }),
    ).toHaveAttribute("href", "/play/caro/ai");
  });

  it("names the default of an option missing from a game in progress", async () => {
    await renderCaro({
      store: createMemoryStore({
        "caro:ai": { settings: AI_HARD, record: { options: { size: 19 } } },
      }),
    });

    const list = screen.getByRole("region", { name: "Ván đang dở" });
    expect(within(list).getByText("Với máy · Khó · 19×19 · Chặn hai đầu")).toBeInTheDocument();
  });

  it("lists a game in progress without rules it does not know", async () => {
    await renderCaro({
      store: createMemoryStore({
        "caro:ai": { settings: AI_HARD, record: { options: { size: 17 } } },
      }),
    });

    const list = screen.getByRole("region", { name: "Ván đang dở" });
    expect(within(list).getByText("Với máy · Khó")).toBeInTheDocument();
  });

  it("creates a room with the rule options chosen", async () => {
    const { playerId } = saveName("Minh");
    const { createRoom } = await renderCaro();

    await userEvent.click(radio("Online"));
    await userEvent.click(radio("19×19"));
    await userEvent.click(radio("Tự do"));
    await userEvent.click(createButton());

    expect(createRoom).toHaveBeenCalledExactlyOnceWith({
      url: "ws://localhost:3101/api/realtime",
      gameId: "caro",
      identity: { playerId, name: "Minh" },
      options: { size: 19, rule: "free" },
    });
  });

  it("says the room could not be created when the server refuses the rule options", async () => {
    saveName("Minh");
    const createRoom = vi.fn(() =>
      Promise.resolve<CreateRoomResult>({ ok: false, error: "invalid-options" }),
    );
    await renderCaro({ createRoom });

    await userEvent.click(radio("Online"));
    await userEvent.click(createButton());

    expect(screen.getByRole("alert")).toHaveTextContent("Không tạo được phòng.");
    expect(createButton()).toHaveAttribute("aria-disabled", "false");
    await userEvent.click(createButton());
    expect(createRoom).toHaveBeenCalledTimes(2);
  });
});

/** The setup screen of a game for 2–4 players, once its games in progress are known. */
async function renderFourPlayerGame({
  createRoom = vi.fn(() => Promise.resolve<CreateRoomResult>({ ok: true, code: CODE })),
}: {
  createRoom?: (options: unknown) => Promise<CreateRoomResult>;
} = {}) {
  const view = renderWithIntl(
    <SetupScreen
      gameId="tictactoe"
      supportsAI
      players={{ min: 2, max: 4 }}
      realtimeUrl="ws://localhost:3101/api/realtime"
      store={createMemoryStore()}
      createRoom={createRoom}
    />,
  );
  await waitFor(() => {
    expect(startButton()).toHaveAttribute("aria-disabled", "false");
  });
  return { view, createRoom };
}

const playerGroup = () => screen.queryByRole("group", { name: "Số người chơi" });

describe("SetupScreen number of players", () => {
  it("offers every number the game allows, its smallest chosen the first time", async () => {
    await renderFourPlayerGame();

    const counts = within(screen.getByRole("group", { name: "Số người chơi" })).getAllByRole(
      "radio",
    );
    expect(counts.map((count) => count.closest("label")?.textContent)).toEqual([
      "2 người",
      "3 người",
      "4 người",
    ]);
    expect(checkedIn("Số người chơi")).toHaveAccessibleName("2 người");
  });

  it("comes before the AI's groups, which depend on it", async () => {
    await renderFourPlayerGame();

    const group = (name: string) => screen.getByRole("group", { name });
    expect(screen.getAllByRole("group")).toEqual([
      group("Chế độ"),
      group("Số người chơi"),
      group("Mức độ"),
      group("Ai đi trước"),
    ]);
  });

  it("is not offered for a game with a fixed number of players", async () => {
    await renderSetup();

    expect(playerGroup()).not.toBeInTheDocument();
  });

  it("starts a same-device game for 4", async () => {
    await renderFourPlayerGame();

    await userEvent.click(radio("Cùng máy"));
    await userEvent.click(radio("4 người"));
    await userEvent.click(startButton());

    expect(router.push).toHaveBeenCalledWith("/play/tictactoe/local?new=1&players=4");
    expect(opened()).toEqual({
      path: "/play/tictactoe/local",
      setup: { mode: "local", playerCount: 4 },
    });
  });

  it("starts a game against the AI with the number chosen", async () => {
    await renderFourPlayerGame();

    await userEvent.click(radio("3 người"));
    await userEvent.click(startButton());

    expect(opened().setup).toEqual({ mode: "ai", level: "medium", first: "human", playerCount: 3 });
  });

  it("keeps the number chosen when the mode changes", async () => {
    await renderFourPlayerGame();

    await userEvent.click(radio("3 người"));
    await userEvent.click(radio("Online"));

    expect(checkedIn("Số người chơi")).toHaveAccessibleName("3 người");
  });

  it("changes the number with the keyboard, and says which one is chosen", async () => {
    await renderFourPlayerGame();
    const user = userEvent.setup();

    radio("Đấu với máy").focus();
    await user.tab();
    expect(radio("2 người")).toHaveFocus();
    await user.keyboard("{ArrowRight}");

    expect(checkedIn("Số người chơi")).toHaveAccessibleName("3 người");
  });

  it("shows the number of the last game started next time", async () => {
    const first = await renderFourPlayerGame();
    await userEvent.click(radio("4 người"));
    await userEvent.click(startButton());
    first.view.unmount();

    await renderFourPlayerGame();

    expect(checkedIn("Số người chơi")).toHaveAccessibleName("4 người");
  });

  it("creates a room with as many seats as the number chosen", async () => {
    const { playerId } = saveName("Minh");
    const { createRoom } = await renderFourPlayerGame();

    await userEvent.click(radio("Online"));
    await userEvent.click(radio("3 người"));
    await userEvent.click(createButton());

    expect(createRoom).toHaveBeenCalledExactlyOnceWith({
      url: "ws://localhost:3101/api/realtime",
      gameId: "tictactoe",
      identity: { playerId, name: "Minh" },
      options: {},
      playerCount: 3,
    });
  });

  it("creates a room of a game with a fixed number of players without asking for a number", async () => {
    saveName("Minh");
    const { createRoom } = await renderOnline();

    await userEvent.click(createButton());

    expect(vi.mocked(createRoom).mock.calls[0]?.[0]).not.toHaveProperty("playerCount");
  });
});

describe("SetupScreen with a mode chosen by the address", () => {
  function rememberChoice(choice: object): void {
    window.localStorage.setItem(`${SETUP_CHOICE_KEY_PREFIX}tictactoe`, JSON.stringify(choice));
  }

  function renderWithMode(initialMode?: "online" | "local") {
    return renderWithIntl(
      <SetupScreen
        gameId="tictactoe"
        supportsAI
        players={{ min: 2, max: 4 }}
        realtimeUrl={null}
        store={createMemoryStore()}
        initialMode={initialMode}
      />,
    );
  }

  it("Chọn sẵn Online thay cho lựa chọn đã nhớ: keeps the remembered number of players", async () => {
    rememberChoice({ mode: "ai", level: "hard", first: "human", playerCount: 4 });

    renderWithMode("online");

    await waitFor(() => {
      expect(checkedIn("Số người chơi")).toHaveAccessibleName("4 người");
    });
    expect(radio("Online")).toBeChecked();
    expect(screen.getByRole("button", { name: "Tạo phòng" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bắt đầu" })).not.toBeInTheDocument();
  });

  it("chooses the mode before anything is remembered, from the first render", () => {
    renderWithMode("online");

    expect(radio("Online")).toBeChecked();
  });

  it("Chọn sẵn chưa được nhớ: leaving without a room keeps the remembered mode", async () => {
    rememberChoice({ mode: "local", level: "medium", first: "human", playerCount: 2 });
    const remembered = window.localStorage.getItem(`${SETUP_CHOICE_KEY_PREFIX}tictactoe`);
    const online = renderWithMode("online");
    await waitFor(() => {
      expect(radio("Online")).toBeChecked();
    });
    online.unmount();

    renderWithMode();

    await waitFor(() => {
      expect(radio("Cùng máy")).toBeChecked();
    });
    expect(window.localStorage.getItem(`${SETUP_CHOICE_KEY_PREFIX}tictactoe`)).toBe(remembered);
  });

  it("shows the game's artwork in the header, around the game's name", () => {
    renderWithIntl(
      <SetupScreen
        gameId="caro"
        supportsAI
        players={TWO_PLAYERS}
        realtimeUrl={null}
        store={createMemoryStore()}
        artwork={<svg data-testid="artwork" aria-hidden />}
      />,
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Cờ caro" });
    const header = heading.closest("[data-game]");
    expect(header).toHaveAttribute("data-game", "caro");
    expect(header).toContainElement(screen.getByTestId("artwork"));
  });
});
