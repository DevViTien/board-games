import type { PlayerIndex } from "@board-games/engine";
import { LUDO_DEFAULT_OPTIONS } from "@board-games/games/ludo";
import type { ChatMessageView, RoomView } from "@board-games/protocol";
import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as PlayScreenModule from "@/features/play/PlayScreen";
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

const renders = vi.hoisted(() => ({ playScreen: 0 }));

// Counts every render of the play screen, whatever makes it render.
vi.mock("@/features/play/PlayScreen", async (importOriginal) => {
  const actual = await importOriginal<typeof PlayScreenModule>();
  return {
    ...actual,
    PlayScreen: (props: ComponentProps<typeof PlayScreenModule.PlayScreen>) => {
      renders.playScreen += 1;
      return actual.PlayScreen(props);
    },
  };
});

let sockets: FakeSockets;
let environment: FakeEnvironment;

beforeEach(async () => {
  sockets = createFakeSockets();
  environment = createFakeEnvironment();
  renders.playScreen = 0;
  await loadFreshIdentity();
});

afterEach(() => {
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

const settle = () => act(() => Promise.resolve());

async function enter(room: RoomView, you: PlayerIndex | null): Promise<FakeSocket> {
  const socket = sockets.last();
  await act(async () => {
    socket.open();
    socket.receive(roomMessage(room, you));
    await Promise.resolve();
  });
  return socket;
}

async function receive(socket: FakeSocket, room: RoomView, you: PlayerIndex | null) {
  await act(async () => {
    socket.receive(roomMessage(room, you));
    await Promise.resolve();
  });
}

const fromLan = (seq: number): ChatMessageView => ({
  seq,
  id: `lan-${String(seq)}`,
  name: "Lan",
  mine: false,
  body: { kind: "text", text: "Chào" },
});

const chatButton = (name: RegExp | string = /^Chat/u) => screen.getByRole("button", { name });
const noChatButton = () => screen.queryByRole("button", { name: /^Chat/u });

/** A three-player Cờ cá ngựa room record, none of its moves played. */
const ludoRecord = {
  version: 1,
  gameId: "ludo",
  playerCount: 3,
  options: LUDO_DEFAULT_OPTIONS,
  entries: [],
} as const;

describe("where the chat shows", () => {
  it("Chat trong ván online: there is a button on the play screen", async () => {
    renderRoom();
    await settle();
    await enter(roomView({ seats: ["Minh", "Lan"], revision: 2 }), 0);

    expect(await screen.findByRole("group", { name: "Bàn cờ" })).toBeInTheDocument();
    expect(chatButton("Chat")).toBeInTheDocument();
  });

  it("Chat ở sảnh chờ: there is a button once two people have a seat", async () => {
    renderRoom();
    await settle();
    const seats = ["Minh", "Lan", null] as const;
    await enter(roomView({ seats, record: ludoRecord, revision: 2 }), 0);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Cờ cá ngựa" }),
    ).toBeInTheDocument();
    expect(chatButton("Chat")).toBeInTheDocument();
  });

  it("Một mình ở sảnh chờ: none, until the second person sits", async () => {
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", null, null], record: ludoRecord }), 0);
    await screen.findByRole("heading", { level: 1, name: "Cờ cá ngựa" });
    expect(noChatButton()).not.toBeInTheDocument();

    await receive(
      socket,
      roomView({ seats: ["Minh", "Lan", null], record: ludoRecord, revision: 2 }),
      0,
    );

    expect(chatButton("Chat")).toBeInTheDocument();
  });

  it("Một người với các ghế máy: none on the play screen", async () => {
    renderRoom();
    await settle();
    await enter(roomView({ seats: ["Minh", AI, AI], record: ludoRecord }), 0);

    await screen.findByRole("heading", { level: 1, name: "Cờ cá ngựa" });
    expect(noChatButton()).not.toBeInTheDocument();
  });

  it("has none for someone without a seat, and no message reaches their screen", async () => {
    renderRoom();
    await settle();
    await enter(roomView({ seats: ["Minh", null] }), null);

    expect(await screen.findByRole("button", { name: "Vào chơi" })).toBeInTheDocument();
    expect(noChatButton()).not.toBeInTheDocument();
  });

  it("Sau khi ván kết thúc: stays once the game has a result", async () => {
    renderRoom();
    await settle();
    // X wins along the top row.
    await enter(roomView({ seats: ["Minh", "Lan"], cells: [0, 3, 1, 4, 2], revision: 2 }), 0);

    expect(await screen.findByRole("button", { name: "Chơi lại" })).toBeInTheDocument();
    expect(chatButton("Chat")).toBeInTheDocument();
  });

  it("Người đã đầu hàng: stays once the AI plays the seat", async () => {
    renderRoom();
    await settle();
    const seats = ["Minh", "Lan", { kind: "human", name: "Chi", standIn: true }] as const;
    const socket = await enter(roomView({ seats, record: ludoRecord, revision: 2 }), 2);

    await screen.findByRole("heading", { level: 1, name: "Cờ cá ngựa" });
    expect(screen.queryByRole("button", { name: "Đầu hàng" })).not.toBeInTheDocument();
    await userEvent.click(chatButton("Chat"));
    fireEvent.change(screen.getByRole("textbox", { name: "Viết tin nhắn" }), {
      target: { value: "gg" },
    });
    await userEvent.keyboard("{Enter}");

    expect(socket.sent.at(-1)).toMatchObject({ type: "chat", body: { kind: "text", text: "gg" } });
  });

  it("is gone with the room", async () => {
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", "Lan"], revision: 2 }), 0);
    await screen.findByRole("group", { name: "Bàn cờ" });

    await act(async () => {
      socket.receive({ type: "error", code: "room-not-found" });
      await Promise.resolve();
    });

    expect(screen.getByRole("heading", { name: "Không tìm thấy phòng" })).toBeInTheDocument();
    expect(noChatButton()).not.toBeInTheDocument();
    expect(document.querySelector("[data-chat-layer]")).toBeNull();
  });
});

describe("the chat across the lobby and the game", () => {
  it("Đủ người khi đang gõ: stays open, with the words and the focus in the field", async () => {
    const user = userEvent.setup();
    renderRoom();
    await settle();
    const seats = ["Minh", "Lan", null] as const;
    const socket = await enter(roomView({ seats, record: ludoRecord, revision: 2 }), 0);
    await screen.findByRole("heading", { level: 1, name: "Cờ cá ngựa" });
    await user.click(chatButton("Chat"));
    const field = screen.getByRole("textbox", { name: "Viết tin nhắn" });
    await user.keyboard("chờ chút");
    expect(field).toHaveFocus();

    await receive(
      socket,
      roomView({ seats: ["Minh", "Lan", "Chi"], record: ludoRecord, revision: 3 }),
      0,
    );

    // The game replaced the lobby: its buttons are there.
    expect(await screen.findByRole("button", { name: "Đầu hàng" })).toBeInTheDocument();
    const still = screen.getByRole("textbox", { name: "Viết tin nhắn" });
    expect(still).toBe(field);
    expect(still).toHaveValue("chờ chút");
    expect(still).toHaveFocus();
    expect(screen.getByRole("log")).toBeInTheDocument();
  });

  it("still gives the title the focus when the chat does not have it", async () => {
    renderRoom();
    await settle();
    const seats = ["Minh", "Lan", null] as const;
    const socket = await enter(roomView({ seats, record: ludoRecord, revision: 2 }), 0);
    await screen.findByRole("heading", { level: 1, name: "Cờ cá ngựa" });

    await receive(
      socket,
      roomView({ seats: ["Minh", "Lan", "Chi"], record: ludoRecord, revision: 3 }),
      0,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Cờ cá ngựa" })).toHaveFocus();
  });

  it("keeps messages and what was read through a new game, whose seats rotate", async () => {
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", "Lan"], revision: 2 }), 0);
    await screen.findByRole("group", { name: "Bàn cờ" });
    await receive(socket, roomView({ seats: ["Minh", "Lan"], revision: 3, chat: [fromLan(3)] }), 0);
    expect(chatButton("Chat 1 tin chưa đọc")).toBeInTheDocument();

    await receive(
      socket,
      roomView({ seats: ["Lan", "Minh"], gameNumber: 2, revision: 4, chat: [fromLan(3)] }),
      1,
    );

    expect(chatButton("Chat 1 tin chưa đọc")).toBeInTheDocument();
  });
});

describe("chat leaves the game alone", () => {
  it("Đọc tin mới một lần: a message does not touch the turn line, closed or open", async () => {
    const user = userEvent.setup();
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", "Lan"], cells: [4], revision: 2 }), 0);
    await screen.findByRole("group", { name: "Bàn cờ" });
    await settle();
    const turn = screen.getByRole("status");
    const words = turn.textContent;
    const changes: MutationRecord[] = [];
    const observer = new MutationObserver((records) => changes.push(...records));
    observer.observe(turn, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    await receive(
      socket,
      roomView({ seats: ["Minh", "Lan"], cells: [4], revision: 3, chat: [fromLan(3)] }),
      0,
    );
    const live = document.querySelector('[data-chat-layer] > p[aria-live="polite"]');
    expect(live).toHaveTextContent("Lan: Chào");
    expect(live?.closest('[role="status"]')).toBeNull();

    await user.click(chatButton());
    await receive(
      socket,
      roomView({ seats: ["Minh", "Lan"], cells: [4], revision: 4, chat: [fromLan(3), fromLan(4)] }),
      0,
    );

    changes.push(...observer.takeRecords());
    observer.disconnect();
    expect(changes).toEqual([]);
    expect(screen.getByRole("status")).toBe(turn);
    expect(turn.textContent).toBe(words);
  });

  it("a message does not render the play screen, typing and opening neither", async () => {
    const user = userEvent.setup();
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", "Lan"], cells: [4], revision: 2 }), 0);
    await screen.findByRole("group", { name: "Bàn cờ" });
    await settle();
    const before = renders.playScreen;
    expect(before).toBeGreaterThan(0);

    for (let seq = 3; seq < 8; seq += 1) {
      await receive(
        socket,
        roomView({
          seats: ["Minh", "Lan"],
          cells: [4],
          revision: seq,
          chat: Array.from({ length: seq - 2 }, (_, index) => fromLan(index + 3)),
        }),
        0,
      );
    }
    expect(chatButton("Chat 5 tin chưa đọc")).toBeInTheDocument();
    await user.click(chatButton());
    await user.keyboard("đang gõ");
    await user.keyboard("{Escape}");

    expect(renders.playScreen).toBe(before);
  });

  it("a new move still does", async () => {
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", "Lan"], cells: [4], revision: 2 }), 0);
    await screen.findByRole("group", { name: "Bàn cờ" });
    await settle();
    const before = renders.playScreen;

    await receive(socket, roomView({ seats: ["Minh", "Lan"], cells: [4, 0], revision: 3 }), 0);

    expect(renders.playScreen).toBeGreaterThan(before);
  });

  it("a refused message does not reconnect, or lock the board", async () => {
    const user = userEvent.setup();
    renderRoom();
    await settle();
    const socket = await enter(roomView({ seats: ["Minh", "Lan"], revision: 2 }), 0);
    await screen.findByRole("group", { name: "Bàn cờ" });

    await user.click(chatButton());
    await user.keyboard("chào{Enter}");
    const sent = socket.sent.at(-1) as { id: string };
    await act(async () => {
      socket.receive({ type: "rejected", request: "chat", code: "unavailable", id: sent.id });
      await Promise.resolve();
    });

    expect(sockets.all).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa gửi được");
    await user.click(screen.getByRole("button", { name: /^Hàng 1, cột 1,/u }));
    expect(socket.sent.at(-1)).toMatchObject({ type: "move" });
  });
});
