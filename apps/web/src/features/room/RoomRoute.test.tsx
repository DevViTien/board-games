import type { PlayerIndex } from "@board-games/engine";
import { LUDO_DEFAULT_OPTIONS } from "@board-games/games/ludo";
import { PROTOCOL_VERSION, type RoomView } from "@board-games/protocol";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IDENTITY_KEY } from "@/config/storage-keys";
import { readIdentity, saveName } from "@/features/identity/identity";
import {
  AI,
  createFakeEnvironment,
  createFakeSockets,
  type FakeEnvironment,
  type FakeSocket,
  type FakeSockets,
  roomMessage,
  roomView,
} from "@/test/fake-realtime";
import { loadFreshIdentity } from "@/test/fresh-identity";
import { renderWithIntl } from "@/test/render-with-intl";

import { RoomRoute } from "./RoomRoute";

vi.mock("@/features/identity/identity", () =>
  import("@/test/fresh-identity").then((module) => module.freshIdentity),
);

let sockets: FakeSockets;
let environment: FakeEnvironment;

beforeEach(async () => {
  sockets = createFakeSockets();
  environment = createFakeEnvironment();
  await loadFreshIdentity();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

function renderRoom() {
  return renderWithIntl(
    <RoomRoute
      code="ABC234"
      realtimeUrl="ws://localhost:3101/api/realtime"
      openSocket={sockets.openSocket}
      environment={environment}
    />,
  );
}

/** Lets the room's effects run: the identity is read, the connection opened. */
const settle = () => act(() => Promise.resolve());

/** Lets a retry due at once (0 ms) run, with the real timers. */
const tick = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 20);
      }),
  );

const nameField = () => screen.getByRole("textbox", { name: "Tên của bạn" });

/** The server answers the greeting on the last socket with `room`. */
async function enter(room: RoomView, you: PlayerIndex | null): Promise<FakeSocket> {
  const socket = sockets.last();
  await act(async () => {
    socket.open();
    socket.receive(roomMessage(room, you));
    // The game's code loads lazily; let it arrive.
    await Promise.resolve();
  });
  return socket;
}

describe("RoomRoute", () => {
  it("enters at once without a name the first time, and asks for one in the lobby", async () => {
    renderRoom();
    await settle();

    // No name step: the room is entered first, with a guest id remembered nowhere.
    expect(sockets.all).toHaveLength(1);
    expect(sockets.last().url).toBe("ws://localhost:3101/api/realtime");
    const socket = await enter(roomView({ seats: ["Minh", null] }), null);
    const { playerId } = socket.sent[0] as { playerId: string };
    expect(playerId).toMatch(/^[\w-]{16,64}$/u);
    expect(socket.sent).toEqual([
      { type: "join", protocol: PROTOCOL_VERSION, code: "ABC234", playerId },
    ]);
    expect(readIdentity()).toBeNull();

    expect(screen.getByText("Minh")).toBeInTheDocument();
    expect(screen.getByText("Đang chờ…")).toBeInTheDocument();
    expect(nameField()).toHaveValue("");
    expect(nameField()).toHaveFocus();
    expect(nameField()).toHaveAccessibleDescription("Mọi người trong phòng sẽ thấy tên này.");
    expect(screen.getByRole("button", { name: "Vào chơi" })).toBeInTheDocument();
    // A room not wanted after all: the menu is one step away, no name needed.
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
    // Opening the link takes no seat.
    expect(socket.sent).toHaveLength(1);
  });

  it("says a room does not exist before asking for a name", async () => {
    renderRoom();
    await settle();

    act(() => {
      sockets.last().open();
      sockets.last().receive({ type: "error", code: "room-not-found" });
    });

    expect(screen.getByRole("heading", { name: "Không tìm thấy phòng" })).toHaveFocus();
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Về menu" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByRole("textbox", { name: "Tên của bạn" })).not.toBeInTheDocument();
  });

  it("says a room is full before asking for a name", async () => {
    renderRoom();
    await settle();

    await enter(roomView({ seats: ["Minh", "Lan"] }), null);

    expect(screen.getByRole("heading", { name: "Phòng đã đủ người" })).toHaveFocus();
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Về menu" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByRole("textbox", { name: "Tên của bạn" })).not.toBeInTheDocument();
  });

  it("does not sit with an empty name", async () => {
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", null] }), null);

    await userEvent.type(nameField(), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Vào chơi" }));

    expect(nameField()).toHaveAccessibleDescription(
      "Mọi người trong phòng sẽ thấy tên này. Tên cần có từ 1 đến 24 ký tự.",
    );
    // Back to the field from the button, so the error is read with it.
    expect(nameField()).toHaveFocus();
    expect(socket.sent).not.toContainEqual(expect.objectContaining({ type: "sit" }));
    expect(readIdentity()).toBeNull();
  });

  it("remembers the guest id with the name chosen in the lobby, and greets with both after a reconnection", async () => {
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", null] }), null);
    const { playerId } = socket.sent[0] as { playerId: string };

    await userEvent.type(nameField(), "Lan");
    await userEvent.click(screen.getByRole("button", { name: "Vào chơi" }));

    expect(socket.sent.at(-1)).toEqual({ type: "sit", name: "Lan" });
    expect(readIdentity()).toEqual({ playerId, name: "Lan" });
    await act(async () => {
      socket.receive(roomMessage(roomView({ seats: ["Minh", "Lan"], revision: 2 }), 1));
      await Promise.resolve();
    });

    act(() => {
      socket.lose();
    });
    await tick();
    expect(sockets.all).toHaveLength(2);
    sockets.last().open();

    expect(sockets.last().sent[0]).toEqual({
      type: "join",
      protocol: PROTOCOL_VERSION,
      code: "ABC234",
      playerId,
      name: "Lan",
    });
  });

  it("keeps the seat after a reload when another tab remembered another identity meanwhile", async () => {
    const { unmount } = renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", null] }), null);
    const { playerId } = socket.sent[0] as { playerId: string };
    // Another tab chooses a name first (the setup screen): that identity is the remembered one.
    const other = saveName("Lan");

    await userEvent.type(nameField(), "Khoa");
    await userEvent.click(screen.getByRole("button", { name: "Vào chơi" }));
    await act(async () => {
      socket.receive(roomMessage(roomView({ seats: ["Minh", "Khoa"], revision: 2 }), 1));
      await Promise.resolve();
    });
    expect(readIdentity()).toEqual(other);

    // The tab reloads: it greets with the id that holds the seat, not the remembered one.
    unmount();
    renderRoom();
    await settle();
    sockets.last().open();

    expect(sockets.last().sent[0]).toEqual({
      type: "join",
      protocol: PROTOCOL_VERSION,
      code: "ABC234",
      playerId,
      name: "Khoa",
    });
  });

  it("tries again under the same guest id, still without a name", async () => {
    renderRoom();
    await settle();
    const socket = await enter({ ...roomView(), gameId: "khong-co-game-nay" }, null);
    const { playerId } = socket.sent[0] as { playerId: string };
    expect(screen.getByRole("heading", { name: "Không mở được phòng" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(sockets.all).toHaveLength(2);
    sockets.last().open();

    expect(sockets.last().sent).toEqual([
      { type: "join", protocol: PROTOCOL_VERSION, code: "ABC234", playerId },
    ]);
  });

  it("asks for a name in the lobby when the remembered identity is corrupt", async () => {
    window.localStorage.setItem(IDENTITY_KEY, "{corrupt");
    renderRoom();
    await settle();

    await enter(roomView({ seats: ["Minh", null] }), null);

    expect(sockets.all[0]?.sent[0]).not.toHaveProperty("name");
    expect(nameField()).toHaveValue("");
    expect(nameField()).toHaveFocus();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("enters at once with the remembered name, saying it is joining until the server answers", async () => {
    saveName("Minh");
    renderRoom();
    await settle();

    expect(screen.getByRole("status")).toHaveTextContent("Đang vào phòng…");
    expect(sockets.all).toHaveLength(1);
  });

  it("says the server cannot be reached after 10 s, with a way back, and keeps trying", async () => {
    vi.useFakeTimers();
    saveName("Minh");
    renderRoom();
    await act(() => vi.advanceTimersByTimeAsync(0));

    await act(() => vi.advanceTimersByTimeAsync(9999));
    expect(screen.getByRole("status")).toHaveTextContent("Đang vào phòng…");
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(screen.getByRole("status")).toHaveTextContent("Chưa kết nối được máy chủ");
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Về menu" })).toHaveAttribute(
      "href",
      "/",
    );
    act(() => {
      sockets.last().lose();
    });
    const opened = sockets.all.length;
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(sockets.all.length).toBeGreaterThan(opened);
  });

  it("shows the lobby with the creator's seat and Join game when opening an invite link", async () => {
    saveName("Lan");
    renderRoom();
    await settle();

    await enter(roomView({ seats: ["Minh", null] }), null);

    expect(screen.getByText("Minh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vào chơi" })).toBeInTheDocument();
  });

  it("sits with the name in the field, then plays once everyone is seated", async () => {
    saveName("Lan");
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", null] }), null);

    await userEvent.click(screen.getByRole("button", { name: "Vào chơi" }));
    expect(socket.sent.at(-1)).toEqual({ type: "sit", name: "Lan" });

    await act(async () => {
      socket.receive(roomMessage(roomView({ seats: ["Minh", "Lan"], revision: 2 }), 1));
      await Promise.resolve();
    });

    expect(await screen.findByRole("group", { name: "Bàn cờ" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Ván mới: bạn cầm O, Minh đi trước");
    // The focused "Join game" button is gone: the game's title takes the focus.
    expect(screen.getByRole("heading", { level: 1, name: "Tic-tac-toe" })).toHaveFocus();
  });

  it("names a Cờ caro room's rules in the lobby, then plays by them", async () => {
    saveName("Lan");
    renderRoom();
    await settle();
    const room: RoomView = {
      ...roomView({ seats: ["Minh", null] }),
      gameId: "caro",
      record: {
        version: 1,
        gameId: "caro",
        playerCount: 2,
        options: { size: 19, rule: "free" },
        entries: [],
      },
    };
    const socket = await enter(room, null);

    expect(await screen.findByText("Luật: 19×19 · Tự do")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Vào chơi" }));
    await act(async () => {
      socket.receive(
        roomMessage(
          {
            ...room,
            seats: [
              { kind: "human", name: "Minh", standIn: false },
              { kind: "human", name: "Lan", standIn: false },
            ],
            revision: 2,
          },
          1,
        ),
      );
      await Promise.resolve();
    });

    expect(await screen.findByRole("grid", { name: "Bàn cờ" })).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(19 * 19);
    expect(screen.getByText("19×19 · Tự do")).toBeInTheDocument();
  });

  it("remembers a name chosen in the lobby, and greets with it after a reconnection", async () => {
    const { playerId } = saveName("Lan");
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", null] }), null);

    await userEvent.clear(nameField());
    await userEvent.type(nameField(), "Lan Anh");
    await userEvent.click(screen.getByRole("button", { name: "Vào chơi" }));
    expect(socket.sent.at(-1)).toEqual({ type: "sit", name: "Lan Anh" });
    expect(readIdentity()).toEqual({ playerId, name: "Lan Anh" });
    await act(async () => {
      socket.receive(roomMessage(roomView({ seats: ["Minh", "Lan Anh"], revision: 2 }), 1));
      await Promise.resolve();
    });

    // Vercel cuts the connection; the next greeting must not bring the old name back.
    act(() => {
      socket.lose();
    });
    await tick();
    expect(sockets.all).toHaveLength(2);
    sockets.last().open();

    expect(sockets.last().sent[0]).toMatchObject({ type: "join", playerId, name: "Lan Anh" });
  });

  it.each([
    ["room-not-found", "Không tìm thấy phòng"],
    ["outdated-client", "Ứng dụng vừa được cập nhật"],
  ] as const)("shows the page for error %s", async (code, title) => {
    saveName("Lan");
    renderRoom();
    await settle();

    act(() => {
      sockets.last().open();
      sockets.last().receive({ type: "error", code });
    });

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });

  it("says the room is full to a player without a seat, and closes the connection", async () => {
    saveName("Khoa");
    renderRoom();
    await settle();

    const socket = await enter(roomView({ seats: ["Minh", "Lan"] }), null);

    // It replaced "joining": its title has the focus, not the page body.
    expect(screen.getByRole("heading", { name: "Phòng đã đủ người" })).toHaveFocus();
    expect(socket.closedByClient).toBe(true);
  });

  it("cannot open a room of a game this app does not have, stops, and opens it anew on Try again", async () => {
    saveName("Lan");
    renderRoom();
    await settle();
    const socket = await enter({ ...roomView(), gameId: "khong-co-game-nay" }, 0);

    expect(screen.getByRole("heading", { name: "Không mở được phòng" })).toHaveFocus();
    // No reconnecting by itself: the connection is closed and stays closed.
    expect(socket.closedByClient).toBe(true);
    act(() => {
      socket.lose();
    });
    await tick();
    expect(sockets.all).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(sockets.all).toHaveLength(2);
    await enter(roomView({ seats: ["Lan", null] }), 0);
    expect(screen.getByText("Lan (bạn)")).toBeInTheDocument();
  });

  it("greets with the latest name remembered when trying again", async () => {
    const { playerId } = saveName("Lan");
    renderRoom();
    await settle();
    await enter({ ...roomView(), gameId: "khong-co-game-nay" }, 0);

    // Renamed meanwhile on the setup screen of another tab.
    saveName("Lan Anh");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    sockets.last().open();

    expect(sockets.last().sent[0]).toMatchObject({ type: "join", playerId, name: "Lan Anh" });
  });

  it("cannot open a room whose game cannot be rebuilt, stops, and offers to try again", async () => {
    saveName("Lan");
    renderRoom();
    await settle();

    const socket = await enter(roomView({ seats: ["Minh", "Lan"], cells: [4, 4] }), 1);

    expect(await screen.findByRole("heading", { name: "Không mở được phòng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
    expect(socket.closedByClient).toBe(true);
    act(() => {
      socket.lose();
    });
    await tick();
    expect(sockets.all).toHaveLength(1);
  });

  it("sits and greets again under the name typed when the browser refuses to store it", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", null] }), null);
    const { playerId } = socket.sent[0] as { playerId: string };

    await userEvent.type(nameField(), "Khoa");
    await userEvent.click(screen.getByRole("button", { name: "Vào chơi" }));
    expect(socket.sent.at(-1)).toEqual({ type: "sit", name: "Khoa" });
    act(() => {
      socket.lose();
    });
    await tick();
    sockets.last().open();

    expect(sockets.last().sent[0]).toMatchObject({ type: "join", playerId, name: "Khoa" });
  });

  // Right after a test where the browser refused storage: nothing of that tab may remain.
  it("enters without a name on a browser that remembers none", async () => {
    renderRoom();
    await settle();
    sockets.last().open();

    expect(sockets.last().sent[0]).not.toHaveProperty("name");
  });
});

describe("RoomRoute: two tabs without a name", () => {
  /** A Cờ cá ngựa room for three, Khoa its host, with the seats given. */
  const ludoRoom = (seats: readonly (string | null)[], revision = 1) =>
    roomView({
      seats,
      revision,
      record: {
        version: 1,
        gameId: "ludo",
        playerCount: 3,
        options: LUDO_DEFAULT_OPTIONS,
        entries: [],
      },
    });

  /**
   * One tab of the same browser: its own page and sockets, the browser's storage shared. (jsdom has
   * one sessionStorage for every tab; the tests clear it where each tab would have its own.)
   */
  function renderTab() {
    const tabSockets = createFakeSockets();
    const { container, unmount } = renderWithIntl(
      <RoomRoute
        code="ABC234"
        realtimeUrl="ws://localhost:3101/api/realtime"
        openSocket={tabSockets.openSocket}
        environment={createFakeEnvironment()}
      />,
    );
    return { sockets: tabSockets, page: within(container), unmount };
  }

  type Tab = ReturnType<typeof renderTab>;

  async function receive(socket: FakeSocket, room: RoomView, you: PlayerIndex | null) {
    await act(async () => {
      socket.receive(roomMessage(room, you));
      await Promise.resolve();
    });
  }

  const idOf = (tab: Tab) => (tab.sockets.all[0]?.sent[0] as { playerId: string }).playerId;
  const nameIn = (tab: Tab) => tab.page.getByRole("textbox", { name: "Tên của bạn" });

  it("keeps each tab in its own seat, under its own name, after both reconnect", async () => {
    const first = renderTab();
    const second = renderTab();
    await settle();
    const lobby = ludoRoom(["Khoa", null, null]);
    for (const tab of [first, second]) {
      const socket = tab.sockets.last();
      act(() => {
        socket.open();
      });
      await receive(socket, lobby, null);
    }
    const lan = idOf(first);
    const minh = idOf(second);
    expect(lan).not.toBe(minh);

    await userEvent.type(nameIn(first), "Lan");
    await userEvent.click(first.page.getByRole("button", { name: "Vào chơi" }));
    expect(readIdentity()).toEqual({ playerId: lan, name: "Lan" });
    await userEvent.type(nameIn(second), "Minh");
    await userEvent.click(second.page.getByRole("button", { name: "Vào chơi" }));
    expect(second.sockets.last().sent.at(-1)).toEqual({ type: "sit", name: "Minh" });
    // The first tab's identity stays the one remembered: the second writes nothing over it.
    expect(readIdentity()).toEqual({ playerId: lan, name: "Lan" });

    const seated = ludoRoom(["Khoa", "Lan", "Minh"], 3);
    await receive(first.sockets.last(), seated, 1);
    await receive(second.sockets.last(), seated, 2);
    act(() => {
      first.sockets.last().lose();
      second.sockets.last().lose();
    });
    await tick();
    first.sockets.last().open();
    second.sockets.last().open();

    expect(first.sockets.last().sent[0]).toMatchObject({
      type: "join",
      playerId: lan,
      name: "Lan",
    });
    expect(second.sockets.last().sent[0]).toMatchObject({
      type: "join",
      playerId: minh,
      name: "Minh",
    });
    expect(readIdentity()).toEqual({ playerId: lan, name: "Lan" });
  });

  it("keeps the second tab's seat after it reloads, though the first tab's identity is remembered", async () => {
    const first = renderTab();
    const second = renderTab();
    await settle();
    const lobby = ludoRoom(["Khoa", null, null]);
    for (const tab of [first, second]) {
      act(() => {
        tab.sockets.last().open();
      });
      await receive(tab.sockets.last(), lobby, null);
    }
    const minh = idOf(second);

    await userEvent.type(nameIn(first), "Lan");
    await userEvent.click(first.page.getByRole("button", { name: "Vào chơi" }));
    // The second tab has a sessionStorage of its own.
    window.sessionStorage.clear();
    await userEvent.type(nameIn(second), "Minh");
    await userEvent.click(second.page.getByRole("button", { name: "Vào chơi" }));
    await receive(second.sockets.last(), ludoRoom(["Khoa", "Lan", "Minh"], 3), 2);

    // The second tab reloads, its sessionStorage kept.
    second.unmount();
    const reloaded = renderTab();
    await settle();
    reloaded.sockets.last().open();

    expect(reloaded.sockets.last().sent[0]).toEqual({
      type: "join",
      protocol: PROTOCOL_VERSION,
      code: "ABC234",
      playerId: minh,
      name: "Minh",
    });
    expect(readIdentity()).toEqual({ playerId: idOf(first), name: "Lan" });
  });
});

describe("RoomRoute AI seats", () => {
  /** A Cờ cá ngựa room for three as the server sends it, Minh its host in the first seat. */
  const ludoRoom = (seats: readonly (string | typeof AI | null)[], revision = 1) =>
    roomView({
      seats,
      revision,
      record: {
        version: 1,
        gameId: "ludo",
        playerCount: 3,
        options: LUDO_DEFAULT_OPTIONS,
        entries: [],
      },
    });

  it("lets the host give an empty seat to the computer, and starts the game with the last one", async () => {
    saveName("Minh");
    renderRoom();
    await settle();
    const socket = await enter(ludoRoom(["Minh", "Lan", null]), 0);

    await userEvent.click(
      await screen.findByRole("button", { name: "Cho máy chơi ghế 3 và bắt đầu ván" }),
    );
    expect(socket.sent.at(-1)).toEqual({ type: "ai-seat", seat: 2, on: true });
    await act(async () => {
      socket.receive(roomMessage(ludoRoom(["Minh", "Lan", AI], 2), 0));
      await Promise.resolve();
    });

    expect(await screen.findByRole("heading", { level: 1, name: "Cờ cá ngựa" })).toHaveFocus();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it.each(["not-host", "seat-taken", "not-ai-seat", "game-started", "invalid-seat"] as const)(
    "shows the latest room after a refused AI seat (%s), without an error nor a reconnection",
    async (code) => {
      saveName("Minh");
      renderRoom();
      await settle();
      const socket = await enter(ludoRoom(["Minh", null, null]), 0);
      await userEvent.click(await screen.findByRole("button", { name: "Cho máy chơi ghế 2" }));

      // Someone took the seat meanwhile: the room first, then the refusal.
      await act(async () => {
        socket.receive(roomMessage(ludoRoom(["Minh", "Lan", null], 2), 0));
        socket.receive({ type: "rejected", request: "ai-seat", code });
        await Promise.resolve();
      });
      await tick();

      expect(screen.getByText("Lan")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "Cờ cá ngựa" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cho máy chơi ghế 3 và bắt đầu ván" }),
      ).not.toHaveAttribute("aria-disabled", "true");
      expect(socket.closedByClient).toBe(false);
      expect(sockets.all).toHaveLength(1);
    },
  );

  it("tells a tab from before a deploy that the app was updated, and neither reloads nor reconnects", async () => {
    vi.useFakeTimers();
    saveName("Minh");
    renderRoom();
    await act(() => vi.advanceTimersByTimeAsync(0));
    const socket = sockets.last();

    act(() => {
      socket.open();
      socket.receive({ type: "error", code: "outdated-client" });
    });
    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(screen.getByRole("heading", { name: "Ứng dụng vừa được cập nhật" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải lại trang" })).toBeInTheDocument();
    expect(sockets.all).toHaveLength(1);
  });
});
