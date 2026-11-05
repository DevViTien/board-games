import type { ChatBody, ChatMessageView } from "@board-games/protocol";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CHAT_MUTED_KEY } from "@/config/storage-keys";
import {
  AI,
  createFakeEnvironment,
  createFakeSockets,
  type FakeSocket,
  type FakeSockets,
  ROOM_CODE,
  roomMessage,
  roomView,
} from "@/test/fake-realtime";
import { renderWithIntl } from "@/test/render-with-intl";
import { createRoomConnection, type RoomConnection } from "@/transport/room-connection";

import { ChatButton } from "./ChatButton";
import { ChatLayer } from "./ChatLayer";
import { ChatPlaySlot } from "./ChatPlaySlot";
import { readKeyboardHeight, sheetHeight } from "./use-chat-placement";
import { type RoomChat, useRoomChat } from "./use-room-chat";

const SEATS = ["Minh", "Lan"] as const;

let sockets: FakeSockets;
let socket: FakeSocket;
let connection: RoomConnection;
let revision: number;
let messages: ChatMessageView[];
let chat: RoomChat;

function Harness({ connection: current }: { readonly connection: RoomConnection }) {
  const created = useRoomChat(current);
  useEffect(() => {
    chat = created;
  }, [created]);
  return (
    <>
      <ChatButton chat={created} />
      <ChatLayer chat={created} />
    </>
  );
}

function start({
  locale = "vi",
  seats = SEATS,
  initial = NONE,
}: { locale?: "vi" | "en" | "ja"; seats?: Seats; initial?: ChatMessageView[] } = {}) {
  connection = createRoomConnection({
    url: "ws://test",
    code: ROOM_CODE,
    getIdentity: () => ({ playerId: "player-0123456789abcdef", name: "Minh" }),
    openSocket: sockets.openSocket,
    environment: createFakeEnvironment(),
  });
  socket = sockets.last();
  act(() => {
    socket.open();
    socket.receive(roomMessage(roomView({ seats, revision, chat: initial }), 0));
  });
  messages = [...initial];
  return renderWithIntl(<Harness connection={connection} />, { locale });
}

type Seats = NonNullable<NonNullable<Parameters<typeof roomView>[0]>["seats"]>;
const NONE: ChatMessageView[] = [];

const message = (
  body: ChatBody = { kind: "text", text: "Chào" },
  { mine = false, name = "Lan", id }: { mine?: boolean; name?: string; id?: string } = {},
): ChatMessageView => {
  revision += 1;
  return { seq: revision, id: id ?? `chat-${String(revision)}`, name, mine, body };
};

function receive(...added: ChatMessageView[]) {
  messages = [...messages, ...added];
  act(() => {
    socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: messages }), 0));
  });
}

const chatButton = (name: RegExp | string = /^Chat/u) => screen.getByRole("button", { name });

/** How many times `element`'s contents were touched since this was called. */
function screenTextSpy(element: Element | null | undefined): () => number {
  let changes = 0;
  const observer = new MutationObserver((records) => {
    changes += records.length;
  });
  if (element != null)
    observer.observe(element, { attributes: true, childList: true, subtree: true });
  return () => {
    changes += observer.takeRecords().length;
    return changes;
  };
}
const field = () => screen.getByRole("textbox", { name: "Viết tin nhắn" });
const log = () => screen.getByRole("log", { name: "Tin nhắn trong phòng" });
const sendButton = () => screen.getByRole("button", { name: /^(Gửi|Đang gửi)$/u });
const sentChats = () =>
  socket.sent.filter(
    (sent): sent is { id: string; body: ChatBody } => (sent as { type?: string }).type === "chat",
  );

function writeLast() {
  const sent = sentChats().at(-1);
  if (sent === undefined) throw new Error("Nothing sent");
  receive(message(sent.body, { mine: true, name: "Minh", id: sent.id }));
}

/** Stands in for the browser's layout: jsdom lays nothing out. */
function setListMetrics(
  element: HTMLElement,
  { scrollHeight, clientHeight }: { scrollHeight: number; clientHeight: number },
) {
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: clientHeight });
}

beforeEach(() => {
  sockets = createFakeSockets();
  revision = 10;
  messages = [];
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  connection.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ChatButton", () => {
  it("Tên nút có số chưa đọc: names the unread messages", () => {
    start();
    expect(chatButton("Chat")).toHaveAttribute("aria-expanded", "false");

    receive(message(), message());

    expect(chatButton("Chat 2 tin chưa đọc")).toBeInTheDocument();
    expect(within(chatButton()).getByText("2")).toBeInTheDocument();
  });

  it("caps what its chip shows, not what it says", () => {
    start();
    receive(...Array.from({ length: 12 }, () => message()));

    expect(chatButton("Chat 12 tin chưa đọc")).toBeInTheDocument();
    expect(within(chatButton()).getByText("9+")).toBeInTheDocument();
  });

  it("says when the chat is muted", () => {
    window.localStorage.setItem(CHAT_MUTED_KEY, "true");
    start();

    expect(chatButton("Chat đã tắt")).toBeInTheDocument();
  });
});

describe("whether the chat shows", () => {
  it("Một người với các ghế máy: has no panel, bubble or live words", () => {
    start({ seats: ["Minh", AI, AI] });

    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    expect(document.querySelector("[data-chat-layer]")).toBeNull();
  });
});

describe("the panel", () => {
  it("Mở chat: opens from the button, with the latest message and nothing unread", async () => {
    const user = userEvent.setup();
    start();
    receive(message(), message({ kind: "text", text: "Mới nhất" }));

    await user.click(chatButton());

    expect(log()).toHaveTextContent("Mới nhất");
    expect(chatButton("Chat")).toHaveAttribute("aria-expanded", "true");
    expect(chatButton("Chat")).toHaveAttribute("aria-controls", "room-chat");
    expect(screen.getByRole("region", { name: "Chat" })).toHaveAttribute("id", "room-chat");
  });

  it("is not in the page while closed: only the live words read new messages", () => {
    start();
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
  });

  it("takes the focus to the field on a laptop, and to the close button on a touch screen", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    expect(field()).toHaveFocus();
    await user.keyboard("{Escape}");

    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(pointer: coarse)",
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      })),
    );
    await user.click(chatButton());
    expect(screen.getByRole("button", { name: "Đóng chat" })).toHaveFocus();
  });

  it("Gửi và đóng bằng bàn phím: Enter sends, Esc closes, and the focus goes back", async () => {
    const user = userEvent.setup();
    start();

    await user.click(chatButton());
    await user.keyboard("chào cả nhà{Enter}");

    expect(sentChats()).toEqual([
      {
        type: "chat",
        id: expect.any(String) as string,
        body: { kind: "text", text: "chào cả nhà" },
      },
    ]);
    writeLast();
    expect(field()).toHaveValue("");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    expect(chatButton()).toHaveFocus();
  });

  it("Enter khi đang gõ bằng bộ gõ: confirms the word, and sends nothing", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    fireEvent.change(field(), { target: { value: "かな" } });

    fireEvent.keyDown(field(), { key: "Enter", isComposing: true });
    // Safari's order of events: `compositionend`, then this.
    fireEvent.keyDown(field(), { key: "Enter", keyCode: 229 });

    expect(sentChats()).toEqual([]);
    expect(field()).toHaveValue("かな");
  });

  it("does not close on an Esc that belongs to the IME", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    fireEvent.keyDown(field(), { key: "Escape", isComposing: true });
    fireEvent.keyDown(field(), { key: "Escape", keyCode: 229 });

    expect(log()).toBeInTheDocument();
  });

  it("leaves Esc to a dialog open above it", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    const dialog = document.body.appendChild(document.createElement("dialog"));
    dialog.setAttribute("open", "");

    fireEvent.keyDown(field(), { key: "Escape" });

    expect(log()).toBeInTheDocument();
    dialog.remove();
  });

  it("sends once for an Enter held down", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    fireEvent.change(field(), { target: { value: "chào" } });

    fireEvent.keyDown(field(), { key: "Enter", repeat: true });
    expect(sentChats()).toEqual([]);

    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.keyDown(field(), { key: "Enter", repeat: true });
    expect(sentChats()).toHaveLength(1);
  });

  it("keeps the on-screen keyboard up when the send button is pressed", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    // `false`: its default, which would take the focus, was prevented.
    expect(fireEvent.pointerDown(sendButton())).toBe(false);
  });

  it("asks of the field what a phone needs", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    expect(field()).toHaveAttribute("enterkeyhint", "send");
    expect(field()).toHaveAttribute("autocomplete", "off");
  });

  it("Câu có sẵn theo ngôn ngữ người đọc: shows a preset in the reader's language", async () => {
    const user = userEvent.setup();
    start({ locale: "en" });
    receive(message({ kind: "preset", preset: "nice-move" }));

    await user.click(screen.getByRole("button", { name: /^Chat/u }));

    expect(screen.getByRole("log", { name: "Messages in this room" })).toHaveTextContent(
      "Nice move",
    );
    expect(screen.getByRole("log", { name: "Messages in this room" })).not.toHaveTextContent(
      "Chơi hay đấy",
    );
  });

  it("Tên đọc được của emoji: names the reaction in the interface's language", async () => {
    const user = userEvent.setup();
    start({ locale: "ja" });
    receive(message({ kind: "reaction", reaction: "like" }));

    await user.click(screen.getByRole("button", { name: /^チャット/u }));

    expect(screen.getByRole("button", { name: "いいねを送信" })).toHaveTextContent("👍");
    expect(screen.getByRole("img", { name: "いいね" })).toHaveTextContent("👍");
  });

  it("Văn bản giống HTML: shows the words as they are", async () => {
    const user = userEvent.setup();
    start();
    const words = "<b>chào</b> https://example.com";
    receive(message({ kind: "text", text: words }));

    await user.click(chatButton());

    expect(within(log()).getByText(words)).toBeInTheDocument();
    expect(log().querySelector("b")).toBeNull();
    expect(within(log()).queryByRole("link")).not.toBeInTheDocument();
  });

  it("Tin dài liền nhau, Dấu chồng quá nhiều: wraps a word without spaces, clips stacked marks", async () => {
    const user = userEvent.setup();
    start();
    receive(message({ kind: "text", text: "a".repeat(200) }));

    await user.click(chatButton());

    const bubble = within(log()).getByText("a".repeat(200));
    expect(bubble).toHaveClass("overflow-clip");
    expect(bubble).toHaveAttribute("dir", "auto");
  });

  it("groups messages of one sender in a row, still naming each for a screen reader", async () => {
    const user = userEvent.setup();
    start();
    receive(
      message({ kind: "text", text: "một" }),
      message({ kind: "text", text: "hai" }),
      message({ kind: "text", text: "ba" }, { mine: true, name: "Minh" }),
    );

    await user.click(chatButton());

    const [first, second, third] = Array.from(log().querySelectorAll("[data-chat-message]"));
    expect(first).toHaveTextContent("Lan");
    expect(second?.querySelector(".sr-only")).toHaveTextContent("Lan:");
    expect(third?.querySelector(".sr-only")).toHaveTextContent("Bạn:");
    expect(third).toHaveAttribute("data-mine");
  });

  it("Đang đọc tin cũ: does not scroll, and offers the new ones", async () => {
    const user = userEvent.setup();
    start();
    receive(...Array.from({ length: 5 }, () => message()));
    await user.click(chatButton());
    const list = log();
    setListMetrics(list, { scrollHeight: 1000, clientHeight: 200 });
    list.scrollTop = 100;
    fireEvent.scroll(list);

    receive(message({ kind: "text", text: "Mới" }));

    expect(list.scrollTop).toBe(100);
    const newMessages = screen.getByRole("button", { name: "Tin mới" });

    await user.click(newMessages);

    expect(list.scrollTop).toBe(1000);
    expect(screen.queryByRole("button", { name: "Tin mới" })).not.toBeInTheDocument();
  });

  it("follows new messages while at the end", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    const list = log();
    setListMetrics(list, { scrollHeight: 1000, clientHeight: 200 });
    list.scrollTop = 800;
    fireEvent.scroll(list);
    setListMetrics(list, { scrollHeight: 1100, clientHeight: 200 });

    receive(message());

    expect(list.scrollTop).toBe(1100);
    expect(screen.queryByRole("button", { name: "Tin mới" })).not.toBeInTheDocument();
  });

  it("Đọc tin mới một lần: read by the log while open, by the live words while closed", async () => {
    const user = userEvent.setup();
    start();
    const live = () =>
      document.querySelector<HTMLElement>('[data-chat-layer] > p[aria-live="polite"]');

    receive(message());
    expect(live()).toHaveTextContent("Lan: Chào");
    expect(screen.queryByRole("log")).not.toBeInTheDocument();

    await user.click(chatButton());
    expect(live()?.textContent).toBe("");
    receive(message());
    expect(live()?.textContent).toBe("");
    expect(log()).toHaveAttribute("aria-relevant", "additions");
    // Never the turn line's: it would be cut short.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reads the same words again for a second message", () => {
    start();
    const live = () =>
      document.querySelector<HTMLElement>('[data-chat-layer] > p[aria-live="polite"]');

    receive(message());
    const first = live()?.textContent;
    receive(message());

    expect(live()?.textContent).not.toBe(first);
  });

  it("names a message in its language when it is a preset, for the live words", () => {
    start({ locale: "en" });
    const live = () =>
      document.querySelector<HTMLElement>('[data-chat-layer] > p[aria-live="polite"]');

    receive(message({ kind: "preset", preset: "hello" }));

    expect(live()).toHaveTextContent("Lan: Hi everyone");
  });

  it("Gõ khi đang nối lại: the field still takes what is typed; only sending waits", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    await user.keyboard("chào");

    act(() => {
      socket.lose();
    });
    await user.keyboard(" cả nhà{Enter}");

    expect(field()).toHaveValue("chào cả nhà");
    expect(field()).not.toHaveAttribute("readonly");
    expect(sentChats()).toEqual([]);
    expect(sendButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("Đang mất kết nối: the send button says why, and does nothing", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    fireEvent.change(field(), { target: { value: "chào" } });

    act(() => {
      socket.lose();
    });

    expect(sendButton()).toHaveAttribute("aria-disabled", "true");
    expect(sendButton()).toHaveAccessibleDescription(
      "Mất kết nối, chưa gửi được. Đang kết nối lại…",
    );
    await user.click(sendButton());
    expect(sentChats()).toEqual([]);
  });

  it("Kết nối đang tạm dừng: says so, and offers to continue inside the chat", async () => {
    const user = userEvent.setup();
    const environment = createFakeEnvironment();
    connection = createRoomConnection({
      url: "ws://test",
      code: ROOM_CODE,
      getIdentity: () => ({ playerId: "player-0123456789abcdef", name: "Minh" }),
      openSocket: sockets.openSocket,
      environment,
    });
    socket = sockets.last();
    act(() => {
      socket.open();
      socket.receive(roomMessage(roomView({ seats: SEATS, revision }), 0));
    });
    renderWithIntl(<Harness connection={connection} />);
    act(() => {
      socket.lose(4001);
    });
    expect(connection.getSnapshot().status).toBe("idle");

    await user.click(chatButton());

    expect(screen.getByText("Đã tạm ngắt vì lâu không có hoạt động.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(connection.getSnapshot().status).toBe("reconnecting");
  });

  it("Kho không trả lời: tells it in the panel, and keeps the words", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    await user.keyboard("chào{Enter}");

    act(() => {
      socket.receive({
        type: "rejected",
        request: "chat",
        code: "unavailable",
        id: sentChats().at(-1)?.id ?? "",
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Chưa gửi được");
    expect(field()).toHaveValue("chào");
    await user.click(screen.getByRole("button", { name: "Gửi lại" }));
    expect(sentChats()).toHaveLength(2);
    expect(sentChats()[1]?.id).toBe(sentChats()[0]?.id);
  });

  it("Câu có sẵn chưa gửi được: says which, and sends it again", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    await user.click(screen.getByRole("button", { name: "Chơi hay đấy" }));

    act(() => {
      socket.receive({
        type: "rejected",
        request: "chat",
        code: "unavailable",
        id: sentChats().at(-1)?.id ?? "",
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Chưa gửi được: Chơi hay đấy");
    await user.click(screen.getByRole("button", { name: "Gửi lại" }));
    expect(sentChats()).toHaveLength(2);
  });

  it("locks the quick row while a message is on its way, with aria-disabled", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    await user.click(screen.getByRole("button", { name: "Gửi Thích" }));

    const reaction = screen.getByRole("button", { name: "Gửi Thích" });
    expect(reaction).toHaveAttribute("aria-disabled", "true");
    await user.click(reaction);
    expect(sentChats()).toHaveLength(1);
    expect(sendButton()).toHaveAccessibleName("Đang gửi");
  });

  it("Chạm liên tục vào emoji: says to slow down, and sends nothing past the limit", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    for (let tap = 0; tap < 7; tap += 1) {
      await user.click(screen.getByRole("button", { name: "Gửi Cười" }));
      if (sentChats().length > tap) writeLast();
    }

    expect(sentChats()).toHaveLength(5);
    expect(screen.getByRole("alert")).toHaveTextContent("Gửi chậm lại một chút");
    expect(socket.closedByClient).toBe(false);
  });

  it("counts what would be kept, not what was typed", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    fireEvent.change(field(), { target: { value: "e\u{301}".repeat(105) } });
    expect(screen.queryByText("210/200")).not.toBeInTheDocument();
    expect(screen.queryByText(/ký tự$/u)).not.toBeInTheDocument();

    fireEvent.change(field(), { target: { value: "\u{200B}".repeat(300) } });
    expect(screen.getByText("Tin chưa có chữ nào nhìn thấy được")).toBeInTheDocument();

    fireEvent.change(field(), { target: { value: "\u{958}".repeat(150) } });
    expect(screen.getByText("Tin dài quá 200 ký tự")).toBeInTheDocument();
    expect(screen.getByText("300/200")).toBeInTheDocument();
  });

  it("counts characters from 160, and says when a text is too long", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    fireEvent.change(field(), { target: { value: "a".repeat(159) } });
    expect(screen.queryByText("159/200")).not.toBeInTheDocument();

    fireEvent.change(field(), { target: { value: "a".repeat(160) } });
    expect(screen.getByText("160/200")).toBeInTheDocument();

    fireEvent.change(field(), { target: { value: "a".repeat(201) } });
    expect(screen.getByText("Tin dài quá 200 ký tự")).toBeInTheDocument();
    expect(sendButton()).toHaveAttribute("aria-disabled", "true");
    expect(field()).toBeInvalid();
    await user.click(sendButton());
    expect(sentChats()).toEqual([]);
    expect(field()).toHaveValue("a".repeat(201));
  });

  it("Tắt rồi có tin mới: says the chat is muted, and the switch brings it back", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    await user.click(screen.getByRole("switch", { name: "Tắt chat" }));

    expect(screen.getByRole("switch", { name: "Tắt chat" })).toBeChecked();
    expect(screen.getByText(/Chat đang tắt:/u)).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Tắt chat" }));
    expect(screen.queryByText(/Chat đang tắt:/u)).not.toBeInTheDocument();
  });

  it("is inert while a board holds the screen", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());

    act(() => {
      chat.setPlay({ held: true, turnLine: "", over: false, claim: null, rematch: null });
    });

    expect(document.getElementById("room-chat")).toHaveAttribute("inert");
  });
});

describe("the bubble", () => {
  const bubble = () => document.querySelector("[data-chat-bubble]");

  it("Tin mới khi chat đóng: shows the sender and the words, and a tap opens the chat", async () => {
    const user = userEvent.setup();
    start();

    receive(message());

    const shown = screen.getByRole("button", { name: /^Mở chat\..*Lan.*1 tin chưa đọc.*Chào/u });
    expect(shown).toHaveTextContent("Lan");
    expect(shown).toHaveTextContent("Chào");

    await user.click(shown);

    expect(bubble()).toBeNull();
    expect(log()).toBeInTheDocument();
  });

  it("Tin tới trong cú tung: waits for the throw to end", () => {
    start();
    act(() => {
      chat.setPlay({ held: true, turnLine: "", over: false, claim: null, rematch: null });
    });

    receive(message());

    expect(bubble()).toBeNull();
    expect(chatButton("Chat 1 tin chưa đọc")).toBeInTheDocument();

    act(() => {
      chat.setPlay({ held: false, turnLine: "", over: false, claim: null, rematch: null });
    });

    expect(bubble()).not.toBeNull();
  });

  it("Giảm chuyển động: fades, with no movement, when asked", () => {
    start();

    receive(message());

    expect(bubble()).toHaveClass("animate-chat-bubble", "motion-reduce:animate-chat-fade");
  });

  it("plays a second reaction afresh: the first one's animation is over by then", () => {
    start();

    receive(message({ kind: "reaction", reaction: "fire" }));
    const first = document.querySelector("[data-chat-reaction]");
    receive(message({ kind: "reaction", reaction: "like" }));

    const second = document.querySelector("[data-chat-reaction]");
    expect(second).toHaveTextContent("👍");
    expect(second).not.toBe(first);
  });

  it("is out of reach under the throw, with the tab: only the live words go on", () => {
    start();
    receive(message());
    act(() => {
      chat.setPlay({ held: true, turnLine: "", over: false, claim: null, rematch: null });
    });

    expect(bubble()?.closest("[inert]")).not.toBeNull();
    const live = document.querySelector('[data-chat-layer] > p[aria-live="polite"]');
    expect(live?.closest("[inert]")).toBeNull();
  });

  it("floats a reaction, hidden from screen readers, in its own layer above the bubble", () => {
    start();

    receive(message({ kind: "reaction", reaction: "fire" }));

    const float = document.querySelector("[data-chat-reaction]");
    expect(float).toHaveAttribute("aria-hidden", "true");
    expect(float).toHaveTextContent("🔥");
    expect(float).toHaveClass("z-34", "motion-reduce:animate-chat-reaction-still");
  });

  it("stacks over the top bar and under the throw", async () => {
    const user = userEvent.setup();
    start();
    receive(message());
    expect(bubble()).toHaveClass("z-33");

    await user.click(chatButton());

    expect(document.getElementById("room-chat")).toHaveClass("z-32");
  });
});

describe("a message not sent while the chat is closed", () => {
  it("shows on the button, in its name too, until it is dealt with", async () => {
    const user = userEvent.setup();
    start();
    await user.click(chatButton());
    await user.keyboard("chào{Enter}");
    await user.keyboard("{Escape}");
    expect(chatButton("Chat")).toBeInTheDocument();

    act(() => {
      socket.receive({
        type: "rejected",
        request: "chat",
        code: "unavailable",
        id: sentChats().at(-1)?.id ?? "",
      });
    });

    expect(chatButton("Chat Chưa gửi được")).toBeInTheDocument();

    await user.click(chatButton());
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa gửi được");
    expect(chatButton("Chat")).toBeInTheDocument();
  });
});

describe("the play screen's chat slot", () => {
  it("tells the chat only what changed: rendering again is nothing new", () => {
    start();
    const setPlay = vi.spyOn(chat, "setPlay");
    const onClaim = vi.fn();
    const onRematch = vi.fn();
    const props = {
      chat,
      held: false,
      turnLine: "Đến lượt bạn",
      over: false,
      claimLabel: null,
      claimAvailable: false,
      onClaim,
      onRematch,
      rematchLabel: null,
    };
    const { rerender } = renderWithIntl(<ChatPlaySlot {...props} />);
    expect(setPlay).toHaveBeenCalledTimes(1);

    rerender(<ChatPlaySlot {...props} />);
    expect(setPlay).toHaveBeenCalledTimes(1);

    rerender(<ChatPlaySlot {...props} claimLabel="Xử thắng" />);
    expect(setPlay).toHaveBeenCalledTimes(2);
    expect(setPlay.mock.lastCall?.[0]?.claim?.label).toBe("Xử thắng");
  });
});

describe("what renders for a key typed", () => {
  it("renders neither the button nor the list again", async () => {
    const user = userEvent.setup();
    let buttonRenders = 0;
    connection = createRoomConnection({
      url: "ws://test",
      code: ROOM_CODE,
      getIdentity: () => ({ playerId: "player-0123456789abcdef", name: "Minh" }),
      openSocket: sockets.openSocket,
      environment: createFakeEnvironment(),
    });
    socket = sockets.last();
    act(() => {
      socket.open();
      socket.receive(
        roomMessage(
          roomView({
            seats: SEATS,
            revision,
            chat: [message({ kind: "preset", preset: "hello" })],
          }),
          0,
        ),
      );
    });
    function Probe() {
      const created = useRoomChat(connection);
      return (
        <>
          <Profiler
            id="button"
            onRender={() => {
              buttonRenders += 1;
            }}
          >
            <ChatButton chat={created} />
          </Profiler>
          <ChatLayer chat={created} />
        </>
      );
    }
    renderWithIntl(<Probe />);
    await user.click(chatButton());
    const before = buttonRenders;
    const item = log().querySelector("[data-chat-message]");
    const text = screenTextSpy(item);

    await user.keyboard("abc");

    expect(field()).toHaveValue("abc");
    expect(buttonRenders).toBe(before);
    expect(text()).toBe(0);
  });
});

describe("the chat button off the screen", () => {
  let intersect: (ratio: number) => void;

  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = (ratio) => {
            callback(
              [{ intersectionRatio: ratio } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            );
          };
        }
        observe() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
      },
    );
  });

  it("Nút chat ngoài màn hình: shows a tab with the count once the bubble has gone", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    start();
    receive(message());
    expect(document.querySelector("[data-chat-peek]")).toBeNull();

    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(document.querySelector("[data-chat-bubble]")).toBeNull();
    act(() => {
      intersect(0.5);
    });

    const tab = screen.getByRole("button", { name: "Mở Chat 1 tin chưa đọc" });
    expect(tab).toHaveTextContent("Chat");
    expect(tab).toHaveTextContent("1");

    act(() => {
      tab.click();
    });
    await waitFor(() => {
      expect(log()).toBeInTheDocument();
    });
    expect(document.querySelector("[data-chat-peek]")).toBeNull();
  });

  it("shows none while the button is on the screen", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    start();
    receive(message());

    await act(() => vi.advanceTimersByTimeAsync(4000));
    act(() => {
      intersect(1);
    });

    expect(document.querySelector("[data-chat-peek]")).toBeNull();
  });
});

describe("the sheet and the keyboard", () => {
  it("Bàn phím ảo mở: takes the keyboard from the visual viewport, and hides the quick row", async () => {
    const user = userEvent.setup();
    const viewport = Object.assign(new EventTarget(), { height: 740, offsetTop: 0, scale: 1 });
    vi.stubGlobal("visualViewport", viewport);
    vi.stubGlobal("innerHeight", 740);
    start();
    await user.click(chatButton());
    expect(screen.getByRole("group", { name: "Gửi nhanh" })).toBeInTheDocument();

    viewport.height = 470;
    act(() => {
      viewport.dispatchEvent(new Event("resize"));
    });

    const panel = document.getElementById("room-chat");
    expect(panel).toHaveStyle({ bottom: "270px", height: "226px" });
    expect(screen.queryByRole("group", { name: "Gửi nhanh" })).not.toBeInTheDocument();
    expect(field()).toBeInTheDocument();
  });

  it("reads the keyboard after the viewport scrolled, as on iOS", () => {
    vi.stubGlobal("innerHeight", 740);
    vi.stubGlobal("visualViewport", { height: 470, offsetTop: 100, scale: 1 });
    expect(readKeyboardHeight()).toBe(170);
  });

  it("does not take pinching to zoom for a keyboard", () => {
    vi.stubGlobal("innerHeight", 740);
    vi.stubGlobal("visualViewport", { height: 370, offsetTop: 0, scale: 2 });
    expect(readKeyboardHeight()).toBe(0);
  });

  it("keeps a part of a board low on the screen in view, down to a sheet of 240 px", () => {
    expect(sheetHeight(740, 0, null)).toBe(355);
    // At 360 × 740, with the board's top at 250: 96 px of it stay above the sheet, if possible.
    expect(sheetHeight(740, 0, 100)).toBe(355);
    expect(sheetHeight(740, 0, 300)).toBe(344);
    expect(sheetHeight(740, 0, 500)).toBe(240);
    // With a keyboard the field matters more than the board.
    expect(sheetHeight(740, 270, 500)).toBe(226);
  });
});
