import type { ChatMessageView } from "@board-games/protocol";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeEnvironment,
  createFakeSockets,
  ROOM_CODE,
  roomMessage,
  roomView,
} from "@/test/fake-realtime";
import { renderWithIntl } from "@/test/render-with-intl";
import { createRoomConnection, type RoomConnection } from "@/transport/room-connection";

import { ChatButton } from "./ChatButton";
import { ChatLayer } from "./ChatLayer";
import { useRoomChat } from "./use-room-chat";

const calls = vi.hoisted(() => ({ bodyText: 0 }));

// Every message of the list asks for its words once per render of the list.
vi.mock("./chat-content", async (importOriginal) => {
  const actual = await importOriginal<typeof ChatContent>();
  return {
    ...actual,
    useChatBodyText: () => {
      const bodyText = actual.useChatBodyText();
      return (body: Parameters<typeof bodyText>[0]) => {
        calls.bodyText += 1;
        return bodyText(body);
      };
    },
  };
});

import type * as ChatContent from "./chat-content";

const hello = (seq: number): ChatMessageView => ({
  seq,
  id: `lan-${String(seq)}-chat`,
  name: "Lan",
  mine: false,
  body: { kind: "preset", preset: "hello" },
});

let connection: RoomConnection;

function Harness({ current }: { readonly current: RoomConnection }) {
  const chat = useRoomChat(current);
  return (
    <>
      <ChatButton chat={chat} />
      <ChatLayer chat={chat} />
    </>
  );
}

beforeEach(() => {
  calls.bodyText = 0;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  connection.dispose();
});

describe("the list of messages", () => {
  it("does not render again for a key typed", async () => {
    const user = userEvent.setup();
    const sockets = createFakeSockets();
    connection = createRoomConnection({
      url: "ws://test",
      code: ROOM_CODE,
      getIdentity: () => ({ playerId: "player-0123456789abcdef", name: "Minh" }),
      openSocket: sockets.openSocket,
      environment: createFakeEnvironment(),
    });
    act(() => {
      sockets.last().open();
      sockets
        .last()
        .receive(
          roomMessage(
            roomView({ seats: ["Minh", "Lan"], revision: 5, chat: [hello(3), hello(4), hello(5)] }),
            0,
          ),
        );
    });
    renderWithIntl(<Harness current={connection} />);
    await user.click(screen.getByRole("button", { name: /^Chat/u }));
    calls.bodyText = 0;

    await user.keyboard("abc");

    expect(screen.getByRole("textbox", { name: "Viết tin nhắn" })).toHaveValue("abc");
    expect(calls.bodyText).toBe(0);
  });
});
