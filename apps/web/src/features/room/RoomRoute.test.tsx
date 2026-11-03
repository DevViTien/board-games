import type { PlayerIndex } from "@board-games/engine";
import { PROTOCOL_VERSION, type RoomView } from "@board-games/protocol";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readIdentity, saveName } from "@/features/identity/identity";
import {
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
  it("asks a first-time player for a name before entering the room", async () => {
    renderRoom();
    await settle();

    expect(screen.getByRole("heading", { name: "Chọn tên để vào phòng" })).toBeInTheDocument();
    expect(nameField()).toHaveFocus();
    expect(sockets.all).toHaveLength(0);

    await userEvent.type(screen.getByRole("textbox", { name: "Tên của bạn" }), "Lan");
    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));

    const identity = readIdentity();
    expect(identity?.name).toBe("Lan");
    sockets.last().open();
    expect(sockets.last().url).toBe("ws://localhost:3101/api/realtime");
    expect(sockets.last().sent).toEqual([
      {
        type: "join",
        protocol: PROTOCOL_VERSION,
        code: "ABC234",
        playerId: identity?.playerId,
        name: "Lan",
      },
    ]);
  });

  it("does not enter with an empty name", async () => {
    renderRoom();
    await settle();

    await userEvent.type(screen.getByRole("textbox", { name: "Tên của bạn" }), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(nameField()).toHaveAccessibleDescription("Tên cần có từ 1 đến 24 ký tự.");
    // Back to the field from the button, so the error is read with it.
    expect(nameField()).toHaveFocus();
    expect(sockets.all).toHaveLength(0);
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
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
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
    ["outdated-client", "App vừa được cập nhật"],
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

    expect(screen.getByRole("heading", { name: "Phòng đã đủ người" })).toBeInTheDocument();
    expect(socket.closedByClient).toBe(true);
  });

  it("cannot open a room of a game this app does not have, stops, and opens it anew on Try again", async () => {
    saveName("Lan");
    renderRoom();
    await settle();
    const socket = await enter({ ...roomView(), gameId: "khong-co-game-nay" }, 0);

    expect(screen.getByRole("heading", { name: "Không mở được phòng" })).toBeInTheDocument();
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

  it("enters under the name typed when the browser refuses to store it", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    renderRoom();
    await settle();

    await userEvent.type(nameField(), "Khoa");
    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    sockets.last().open();

    expect(sockets.last().sent[0]).toMatchObject({ type: "join", name: "Khoa" });
  });

  // Right after a test where the browser refused storage: nothing of that tab may remain.
  it("asks again for a name on a browser that remembers none", async () => {
    renderRoom();
    await settle();

    expect(screen.getByRole("heading", { name: "Chọn tên để vào phòng" })).toBeInTheDocument();
  });
});
