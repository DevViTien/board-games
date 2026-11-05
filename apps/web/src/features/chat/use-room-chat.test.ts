import type { ChatBody, ChatMessageView } from "@board-games/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CHAT_MUTED_KEY, CHAT_READ_KEY_PREFIX } from "@/config/storage-keys";
import {
  createFakeEnvironment,
  createFakeSockets,
  type FakeEnvironment,
  type FakeSocket,
  type FakeSockets,
  ROOM_CODE,
  roomMessage,
  roomView,
} from "@/test/fake-realtime";
import { createRoomConnection, type RoomConnection } from "@/transport/room-connection";

import {
  CHAT_FAILURE,
  type ChatPlayContext,
  chatVisible,
  createRoomChat,
  type RoomChat,
} from "./use-room-chat";

const SEATS = ["Minh", "Lan"] as const;

let sockets: FakeSockets;
let environment: FakeEnvironment;
let connection: RoomConnection | undefined;
let chat: RoomChat;
let stop: () => void;
let socket: FakeSocket;
let revision: number;
let messages: ChatMessageView[];

const fromLan = (body: ChatBody = { kind: "text", text: "Chào" }): ChatMessageView => {
  revision += 1;
  return { seq: revision, id: `lan-${String(revision)}`, name: "Lan", mine: false, body };
};

/** The server sends the room with `added` as its newest messages. */
function receive(...added: ChatMessageView[]) {
  messages = [...messages, ...added].slice(-30);
  revision = Math.max(revision, ...added.map(({ seq }) => seq));
  socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: messages }), 0));
}

/** The server takes the message last sent, as written. */
function serverWritesLast() {
  const sent = socket.sent.at(-1) as { id: string; body: ChatBody };
  revision += 1;
  receive({ seq: revision, id: sent.id, name: "Minh", mine: true, body: sent.body });
  return sent;
}

function connectionNow(): RoomConnection {
  if (connection === undefined) throw new Error("Not started");
  return connection;
}

function start({
  you = 0,
  initial = [],
  seats = SEATS,
}: {
  you?: number | null;
  initial?: ChatMessageView[];
  seats?: NonNullable<NonNullable<Parameters<typeof roomView>[0]>["seats"]>;
} = {}) {
  connection = createRoomConnection({
    url: "ws://test",
    code: ROOM_CODE,
    getIdentity: () => ({ playerId: "player-0123456789abcdef", name: "Minh" }),
    openSocket: sockets.openSocket,
    environment,
  });
  socket = sockets.last();
  socket.open();
  messages = [...initial];
  socket.receive(roomMessage(roomView({ seats, revision, chat: initial }), you));
  chat = createRoomChat(connectionNow());
  stop = chat.start();
}

const state = () => chat.getSnapshot();
const sentChats = () =>
  socket.sent.filter(
    (message): message is { type: "chat"; id: string; body: ChatBody } =>
      typeof message === "object" &&
      message !== null &&
      (message as { type?: string }).type === "chat",
  );
const wait = (ms: number) => vi.advanceTimersByTimeAsync(ms);

const held = (on: boolean): ChatPlayContext => ({
  held: on,
  turnLine: "Đến lượt bạn",
  over: false,
  claim: null,
  rematch: null,
});

beforeEach(() => {
  vi.useFakeTimers();
  sockets = createFakeSockets();
  environment = createFakeEnvironment();
  revision = 10;
  messages = [];
  stop = () => undefined;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  stop();
  connection?.dispose();
  connection = undefined;
  vi.useRealTimers();
});

describe("chatVisible", () => {
  const human = { kind: "human", name: "Lan", standIn: false } as const;

  it("Một mình ở sảnh chờ: not alone in a room", () => {
    expect(chatVisible({ seats: [human, null] }, 0)).toBe(false);
  });

  it("Chat ở sảnh chờ: from two people with a seat", () => {
    expect(chatVisible({ seats: [human, human, null] }, 0)).toBe(true);
  });

  it("Một người với các ghế máy: not with AI seats only", () => {
    expect(chatVisible({ seats: [human, { kind: "ai" }, { kind: "ai" }] }, 0)).toBe(false);
  });

  it("counts a person the AI stands in for", () => {
    expect(chatVisible({ seats: [human, { ...human, standIn: true }] }, 0)).toBe(true);
  });

  it("not for someone without a seat", () => {
    expect(chatVisible({ seats: [human, human] }, null)).toBe(false);
    expect(chatVisible(null, 0)).toBe(false);
  });
});

describe("sending", () => {
  it("Server xác nhận: the message shows only once written, and the field clears", () => {
    start();
    chat.setDraft("chào");

    chat.sendDraft();

    expect(sentChats()).toEqual([
      { type: "chat", id: expect.any(String) as string, body: { kind: "text", text: "chào" } },
    ]);
    expect(state().messages).toEqual([]);
    expect(state().pending).not.toBeNull();
    expect(state().draft).toBe("chào");

    serverWritesLast();

    expect(state().messages).toHaveLength(1);
    expect(state().pending).toBeNull();
    expect(state().draft).toBe("");
  });

  it("Gõ tiếp khi đang gửi: keeps what was typed since", () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();

    chat.setDraft("cả nhà");
    serverWritesLast();

    expect(state().messages).toHaveLength(1);
    expect(state().draft).toBe("cả nhà");
  });

  it("sends the text as cleaned, and clears the field as typed", () => {
    start();
    chat.setDraft("  chào\n");

    chat.sendDraft();
    serverWritesLast();

    expect(sentChats()[0]?.body).toEqual({ kind: "text", text: "chào" });
    expect(state().draft).toBe("");
  });

  it("does not send what the server would refuse: a huge paste never leaves the browser", () => {
    start();
    chat.setDraft("x".repeat(20_000));

    chat.sendDraft();

    expect(sentChats()).toEqual([]);
    expect(state().draftProblem).toBe("too-long");
    expect(state().draft).toHaveLength(20_000);

    chat.setDraft("\u{200B}\u{3164}");
    expect(state().draftProblem).toBe("invisible");
    chat.sendDraft();
    expect(sentChats()).toEqual([]);

    chat.setDraft("   ");
    expect(state().draftProblem).toBeNull();
    chat.sendDraft();
    expect(sentChats()).toEqual([]);
  });

  it("sends one message at a time", () => {
    start();
    chat.setDraft("một");
    chat.sendDraft();

    chat.setDraft("hai");
    chat.sendDraft();
    chat.sendQuick({ kind: "reaction", reaction: "like" });

    expect(sentChats()).toHaveLength(1);
  });

  it("Gửi lại sau khi không có trả lời: tells after 8 s, reconnects, and sends the same id again", async () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();
    const first = sentChats()[0];

    await wait(7999);
    expect(state().failure).toBeNull();
    await wait(1);

    expect(state().failure).toMatchObject({ reason: CHAT_FAILURE.NotSent });
    expect(state().pending).toBeNull();
    expect(state().draft).toBe("chào");

    // Reconnecting: the greeting does not show the message, so it may have been lost.
    await wait(0);
    socket = sockets.last();
    socket.open();
    socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: messages }), 0));

    chat.retry();
    expect(sentChats()[0]?.id).toBe(first?.id);
    expect(state().failure).toBeNull();
    serverWritesLast();
    expect(state().messages).toHaveLength(1);
    expect(state().draft).toBe("");
  });

  it("settles a message told as failed once the room shows it was written after all", async () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();
    const sent = socket.sent.at(-1) as { id: string; body: ChatBody };

    await wait(8000);
    await wait(0);
    expect(state().failure).not.toBeNull();
    socket = sockets.last();
    socket.open();
    revision += 1;
    messages = [{ seq: revision, id: sent.id, name: "Minh", mine: true, body: sent.body }];
    socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: messages }), 0));

    expect(state().failure).toBeNull();
    expect(state().draft).toBe("");
  });

  it("Sửa rồi gửi lại: edited words are a new message", async () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();
    const first = sentChats()[0]?.id;
    await wait(8000);
    await wait(0);
    socket = sockets.last();
    socket.open();
    socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: [] }), 0));

    chat.setDraft("chào cả nhà");
    chat.retry();

    const again = sentChats()[0];
    expect(again?.id).not.toBe(first);
    expect(again?.body).toEqual({ kind: "text", text: "chào cả nhà" });
  });

  it("Kho không trả lời: tells it, keeps the field, no reconnection", () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();
    const id = sentChats()[0]?.id ?? "";

    socket.receive({ type: "rejected", request: "chat", code: "unavailable", id });

    expect(state().failure).toMatchObject({ reason: CHAT_FAILURE.NotSent });
    expect(state().draft).toBe("chào");
    expect(socket.closedByClient).toBe(false);
    expect(connectionNow().getSnapshot().status).toBe("online");
  });

  it("calls a message the server will never take refused: nothing to send again", () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();
    const id = sentChats()[0]?.id ?? "";

    socket.receive({ type: "rejected", request: "chat", code: "invalid-chat", id });

    expect(state().failure).toMatchObject({ reason: CHAT_FAILURE.Refused });
  });

  it("ignores the refusal of another message", () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();

    socket.receive({ type: "rejected", request: "chat", code: "unavailable", id: "someone-else" });

    expect(state().failure).toBeNull();
    expect(state().pending).not.toBeNull();
  });

  it("Câu có sẵn chưa gửi được: tells which, and sends it again under the same id", () => {
    start();
    chat.sendQuick({ kind: "preset", preset: "nice-move" });
    const id = sentChats()[0]?.id ?? "";

    socket.receive({ type: "rejected", request: "chat", code: "unavailable", id });

    expect(state().failure).toMatchObject({
      id,
      reason: CHAT_FAILURE.NotSent,
      body: { kind: "preset", preset: "nice-move" },
    });

    chat.retry();

    expect(sentChats().at(-1)).toMatchObject({ id, body: { kind: "preset", preset: "nice-move" } });
    expect(state().failure).toBeNull();
  });

  it("Đang mất kết nối: sends nothing while reconnecting", async () => {
    start();
    socket.lose();
    await Promise.resolve();
    chat.setDraft("chào");

    chat.sendDraft();

    expect(state().status).toBe("reconnecting");
    expect(sockets.all.flatMap(({ sent }) => sent).filter(isChat)).toEqual([]);
    expect(state().pending).toBeNull();
    expect(state().draft).toBe("chào");
  });

  it("Kết nối đang tạm dừng: says so, and comes back through the connection", async () => {
    start();
    environment.setVisible(false);
    await wait(60_000);
    expect(state().status).toBe("paused");

    chat.resume();

    expect(state().status).toBe("reconnecting");
  });

  it("is safe to use after the connection has gone", () => {
    start();
    connectionNow().dispose();
    chat.setDraft("chào");

    expect(() => {
      chat.sendDraft();
    }).not.toThrow();
    expect(state().pending).toBeNull();
  });

  it("keeps the field clear of a composition still being typed, until it ends", () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();

    chat.setComposing(true);
    serverWritesLast();
    expect(state().draft).toBe("chào");

    chat.setComposing(false);
    expect(state().draft).toBe("");
  });

  it("keeps what a composition added", () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();

    chat.setComposing(true);
    serverWritesLast();
    chat.setDraft("chào か");
    chat.setComposing(false);

    expect(state().draft).toBe("chào か");
  });
});

function isChat(message: unknown): boolean {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: string }).type === "chat"
  );
}

describe("a message lost with its socket", () => {
  it("is told at once once the greeting shows it was not written, unlocks, and reconnects no more", async () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();
    expect(state().pending).not.toBeNull();

    socket.lose();
    await wait(0);
    socket = sockets.last();
    socket.open();
    socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: messages }), 0));

    expect(state().pending).toBeNull();
    expect(state().failure).toMatchObject({ reason: CHAT_FAILURE.NotSent });
    expect(state().draft).toBe("chào");

    const healthy = sockets.last();
    const opened = sockets.all.length;
    await wait(9000);
    expect(sockets.all).toHaveLength(opened);
    expect(healthy.closedByClient).toBe(false);
  });

  it("is settled by that greeting when it was written after all", async () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();
    const sent = socket.sent.at(-1) as { id: string; body: ChatBody };

    socket.lose();
    await wait(0);
    socket = sockets.last();
    socket.open();
    revision += 1;
    messages = [{ seq: revision, id: sent.id, name: "Minh", mine: true, body: sent.body }];
    socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: messages }), 0));

    expect(state().pending).toBeNull();
    expect(state().failure).toBeNull();
    expect(state().draft).toBe("");
  });
});

describe("the id of a text", () => {
  it("is not used again for the same words once that message is in the room", async () => {
    start();
    chat.setDraft("ok");
    chat.sendDraft();
    const first = socket.sent.at(-1) as { id: string; body: ChatBody };
    await wait(8000);
    await wait(0);
    socket = sockets.last();
    socket.open();
    socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: messages }), 0));
    // Told as failed; a preset sent since replaces what is told, then the text turns up.
    chat.sendQuick({ kind: "preset", preset: "hello" });
    serverWritesLast();
    expect(state().failure).toBeNull();
    revision += 1;
    receive({ seq: revision, id: first.id, name: "Minh", mine: true, body: first.body });
    expect(state().draft).toBe("");

    chat.setDraft("ok");
    chat.sendDraft();

    expect((socket.sent.at(-1) as { id: string }).id).not.toBe(first.id);
  });
});

describe("what is wrong with the words in the field", () => {
  it("tells from what would be kept, not from what was typed", () => {
    start();

    chat.setDraft("\u{958}".repeat(150));
    expect(state().draftProblem).toBe("too-long");
    expect(state().draftLength).toBe(300);

    chat.setDraft("\u{200B}".repeat(300));
    expect(state().draftProblem).toBe("invisible");
    expect(state().draftLength).toBe(0);

    chat.setDraft("e\u{301}".repeat(105));
    expect(state().draftProblem).toBeNull();
    expect(state().draftLength).toBe(105);
  });
});

describe("sending too fast", () => {
  /** Taps a reaction, the server answering each at once. */
  function tap() {
    const before = sentChats().length;
    chat.sendQuick({ kind: "reaction", reaction: "like" });
    if (sentChats().length > before) serverWritesLast();
  }

  it("Chạm liên tục vào emoji: stops at the limit, says so, and the connection stays", async () => {
    start();

    for (let second = 0; second < 15; second += 1) {
      tap();
      tap();
      if (second === 2) expect(state().slow).toBe(true);
      await wait(1000);
    }

    // At most 5 in any 10 seconds, so nowhere near the 30 messages that close a connection.
    const sent = sentChats().length;
    expect(sent).toBeGreaterThanOrEqual(5);
    expect(sent).toBeLessThanOrEqual(10);
    expect(socket.closedByClient).toBe(false);
    expect(sockets.all).toHaveLength(1);
    expect(connectionNow().getSnapshot().status).toBe("online");
  });

  it("sends again once the window has passed", async () => {
    start();
    for (let index = 0; index < 5; index += 1) tap();
    expect(sentChats()).toHaveLength(5);
    expect(state().slow).toBe(true);

    tap();
    expect(sentChats()).toHaveLength(5);

    await wait(10_500);

    expect(state().slow).toBe(false);
    tap();
    expect(sentChats()).toHaveLength(6);
  });

  it("counts messages from another tab of this player", () => {
    start();
    for (let index = 0; index < 5; index += 1) {
      revision += 1;
      receive({
        seq: revision,
        id: `other-tab-${String(index)}`,
        name: "Minh",
        mine: true,
        body: { kind: "reaction", reaction: "like" },
      });
    }

    tap();

    expect(sentChats()).toEqual([]);
    expect(state().slow).toBe(true);
  });

  it("keeps a little more than the server's window: its clock starts after this one", async () => {
    start();
    for (let index = 0; index < 5; index += 1) tap();

    await wait(10_000);
    expect(state().slow).toBe(true);

    await wait(500);
    expect(state().slow).toBe(false);
  });

  it("does not take old messages of this player, come with a reconnection, for new ones", async () => {
    start();
    socket.lose();
    await wait(0);
    socket = sockets.last();
    socket.open();
    const own = [1, 2, 3, 4, 5].map((index): ChatMessageView => {
      revision += 1;
      return {
        seq: revision,
        id: `own-${String(index)}-chat`,
        name: "Minh",
        mine: true,
        body: { kind: "reaction", reaction: "like" },
      };
    });
    messages = own;
    socket.receive(roomMessage(roomView({ seats: SEATS, revision, chat: messages }), 0));

    expect(state().slow).toBe(false);
  });

  it("does not count this player's messages in the first room with a seat", () => {
    const own = [1, 2, 3, 4, 5].map((index): ChatMessageView => {
      revision += 1;
      return {
        seq: revision,
        id: `own-${String(index)}-chat`,
        name: "Minh",
        mine: true,
        body: { kind: "reaction", reaction: "like" },
      };
    });
    start({ initial: own });

    expect(state().slow).toBe(false);
  });

  it("Câu có sẵn bị từ chối vì quá nhanh: told, with a way to send it again", async () => {
    start();
    chat.sendQuick({ kind: "preset", preset: "hello" });
    const id = sentChats()[0]?.id ?? "";

    socket.receive({ type: "rejected", request: "chat", code: "chat-too-fast", id });

    expect(state().failure).toMatchObject({
      id,
      reason: CHAT_FAILURE.NotSent,
      body: { kind: "preset", preset: "hello" },
    });
    expect(state().slow).toBe(true);

    await wait(10_500);
    chat.retry();
    expect(sentChats().at(-1)?.id).toBe(id);
  });

  it("after chat-too-fast from the server, sends nothing until the window has passed", async () => {
    start();
    chat.setDraft("chào");
    chat.sendDraft();
    const id = sentChats()[0]?.id ?? "";

    socket.receive({ type: "rejected", request: "chat", code: "chat-too-fast", id });

    expect(state().slow).toBe(true);
    expect(state().failure).toBeNull();
    expect(state().draft).toBe("chào");
    chat.sendDraft();
    expect(sentChats()).toHaveLength(1);

    await wait(10_500);
    expect(state().slow).toBe(false);
    chat.sendDraft();
    expect(sentChats()).toHaveLength(2);
    // The same words: still the same message.
    expect(sentChats()[1]?.id).toBe(id);
  });
});

describe("unread messages and bubbles", () => {
  it("Tin mới khi chat đóng: counts it and shows a bubble for a few seconds", async () => {
    start();

    receive(fromLan());

    expect(state().unread).toBe(1);
    expect(state().bubble).toMatchObject({ name: "Lan" });
    await wait(3000);
    expect(state().bubble).not.toBeNull();
    await wait(1000);
    expect(state().bubble).toBeNull();
    expect(state().unread).toBe(1);
  });

  it("floats a reaction instead of a bubble", async () => {
    start();

    receive(fromLan({ kind: "reaction", reaction: "fire" }));

    expect(state().bubble).toBeNull();
    expect(state().reaction).toMatchObject({ name: "Lan" });
    expect(state().unread).toBe(1);
    await wait(1800);
    expect(state().reaction).toBeNull();
  });

  it("Tin của mình: no bubble and no count", () => {
    start();
    revision += 1;

    receive({
      seq: revision,
      id: "other-tab-1",
      name: "Minh",
      mine: true,
      body: { kind: "preset", preset: "hello" },
    });

    expect(state().bubble).toBeNull();
    expect(state().announced).toBeNull();
    expect(state().unread).toBe(0);
  });

  it("Tải lại trang: no bubble for what the first room holds, and keeps what was read", () => {
    const initial = [fromLan(), fromLan(), fromLan()];
    window.sessionStorage.setItem(
      `${CHAT_READ_KEY_PREFIX}${ROOM_CODE}`,
      JSON.stringify(initial[0]?.seq),
    );

    start({ initial });

    expect(state().bubble).toBeNull();
    expect(state().announced).toBeNull();
    expect(state().unread).toBe(2);
  });

  it("takes a mark that cannot be read as no mark", () => {
    window.sessionStorage.setItem(`${CHAT_READ_KEY_PREFIX}${ROOM_CODE}`, '"not a number"');

    start({ initial: [fromLan()] });

    expect(state().unread).toBe(0);
  });

  it("Người vừa vào ghế: nothing unread, and no bubble, from the first room with a seat", () => {
    start({ you: null, seats: ["Minh", null] });
    expect(state().visible).toBe(false);

    socket.receive(
      roomMessage(roomView({ seats: SEATS, revision: 20, chat: [fromLan(), fromLan()] }), 1),
    );

    expect(state().messages).toHaveLength(2);
    expect(state().unread).toBe(0);
    expect(state().bubble).toBeNull();
  });

  it("Mở chat: nothing is unread any more, and stays so after a reload", () => {
    start();
    receive(fromLan(), fromLan(), fromLan());
    expect(state().unread).toBe(3);

    chat.setOpen(true);

    expect(state().unread).toBe(0);
    expect(state().bubble).toBeNull();
    expect(state().messages).toHaveLength(3);
    expect(window.sessionStorage.getItem(`${CHAT_READ_KEY_PREFIX}${ROOM_CODE}`)).toBe(
      String(revision),
    );
  });

  it("counts nothing while the chat is open", () => {
    start();
    chat.setOpen(true);

    receive(fromLan());
    expect(state().unread).toBe(0);
    expect(state().bubble).toBeNull();
    expect(state().announced).toBeNull();

    chat.setOpen(false);
    expect(state().unread).toBe(0);
  });

  it("Hơn 30 tin chưa đọc: counts the 30 the room still holds", () => {
    start();
    for (let index = 0; index < 35; index += 1) receive(fromLan());

    expect(state().unread).toBe(30);
    expect(state().messages).toHaveLength(30);
    expect(state().messages.at(-1)?.seq).toBe(revision);

    chat.setOpen(true);
    expect(state().unread).toBe(0);
  });

  it("after reconnecting, gives a bubble only to the latest of the messages it brought", async () => {
    start();
    receive(fromLan());
    await wait(4000);
    socket.lose();
    await wait(0);
    socket = sockets.last();
    socket.open();

    const announcedBefore = state().announced?.count ?? 0;
    receive(fromLan({ kind: "text", text: "một" }), fromLan({ kind: "text", text: "hai" }));

    expect(state().unread).toBe(3);
    expect(state().bubble?.body).toEqual({ kind: "text", text: "hai" });
    expect(state().announced?.count).toBe(announcedBefore + 1);
  });

  it("Tin tới trong cú tung: counts at once, shows only after the throw", () => {
    start();
    chat.setPlay(held(true));

    receive(fromLan());

    expect(state().unread).toBe(1);
    expect(state().bubble).toBeNull();

    chat.setPlay(held(false));

    expect(state().bubble).toMatchObject({ name: "Lan" });
  });

  it("waits with a bubble already showing while a throw holds the screen", async () => {
    start();
    receive(fromLan());
    await wait(1000);

    chat.setPlay(held(true));
    await wait(10_000);
    expect(state().bubble).not.toBeNull();

    chat.setPlay(held(false));
    await wait(3999);
    expect(state().bubble).not.toBeNull();
    await wait(1);
    expect(state().bubble).toBeNull();
  });

  it("does not time a bubble out while it is pointed at or focused", async () => {
    start();
    receive(fromLan());

    chat.pauseBubble(true);
    await wait(10_000);
    expect(state().bubble).not.toBeNull();

    chat.pauseBubble(false);
    await wait(4000);
    expect(state().bubble).toBeNull();
  });
});

describe("muting", () => {
  it("Tắt rồi có tin mới: no bubble, no count, no words read", () => {
    start();
    chat.setMuted(true);

    receive(fromLan());

    expect(state().bubble).toBeNull();
    expect(state().unread).toBe(0);
    expect(state().announced).toBeNull();
    expect(state().messages).toHaveLength(1);
  });

  it("clears what was showing when muted", () => {
    start();
    receive(fromLan());

    chat.setMuted(true);

    expect(state().bubble).toBeNull();
    expect(state().unread).toBe(0);
  });

  it("Nhớ lựa chọn: remembered for another room of this browser", () => {
    start();
    chat.setMuted(true);
    expect(window.localStorage.getItem(CHAT_MUTED_KEY)).toBe("true");
    stop();

    const another = createRoomChat(connectionNow());
    const stopAnother = another.start();

    expect(another.getSnapshot().muted).toBe(true);
    stopAnother();
    stop = () => undefined;
  });

  it("reads anything else as not muted", () => {
    window.localStorage.setItem(CHAT_MUTED_KEY, "{broken");
    start();
    expect(state().muted).toBe(false);
  });

  it("follows another tab", () => {
    start();

    window.localStorage.setItem(CHAT_MUTED_KEY, "true");
    window.dispatchEvent(new StorageEvent("storage", { key: CHAT_MUTED_KEY }));

    expect(state().muted).toBe(true);
  });

  it("Bật lại: what came meanwhile is not unread, and is in the list", () => {
    start();
    chat.setMuted(true);
    receive(fromLan(), fromLan(), fromLan());

    chat.setMuted(false);

    expect(state().unread).toBe(0);
    expect(state().bubble).toBeNull();
    expect(state().messages).toHaveLength(3);
  });

  it("Bật lại: nothing is unread after a reload while muted, whatever the old mark", () => {
    window.localStorage.setItem(CHAT_MUTED_KEY, "true");
    window.sessionStorage.setItem(`${CHAT_READ_KEY_PREFIX}${ROOM_CODE}`, "10");
    start({ initial: [fromLan(), fromLan(), fromLan()] });
    expect(state().muted).toBe(true);

    chat.setMuted(false);

    expect(state().unread).toBe(0);
  });

  it("keeps the choice on a page whose storage is refused", () => {
    start();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("refused");
    });

    chat.setMuted(true);

    expect(state().muted).toBe(true);
    setItem.mockRestore();
  });
});

describe("following the room", () => {
  it("keeps the same list across rooms that bring no new message", () => {
    start({ initial: [fromLan()] });
    const before = state();

    revision += 1;
    socket.receive(
      roomMessage(roomView({ seats: SEATS, revision, cells: [4], chat: messages }), 0),
    );

    expect(state().messages).toBe(before.messages);
    expect(state()).toBe(before);
  });
});
