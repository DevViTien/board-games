import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SETUP_CHOICE_KEY_PREFIX } from "@/config/storage-keys";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";
import type { ModeSettings, SavedGameStore } from "@/transport/types";

import { readStartRequest } from "./play-setup";
import { SetupScreen } from "./SetupScreen";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.useRealTimers();
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
    <SetupScreen gameId="tictactoe" supportsAI={supportsAI} store={store} />,
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

  it("offers only the same-device mode for a game without an AI", async () => {
    await renderSetup({ supportsAI: false });

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
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
    renderWithIntl(<SetupScreen gameId="tictactoe" supportsAI store={createMemoryStore()} />, {
      locale: "en",
    });

    expect(screen.getByRole("group", { name: "Level" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Against the computer" })).toBeChecked();
    expect(await screen.findByRole("button", { name: "Start" })).toBeInTheDocument();
  });
});
