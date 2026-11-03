import { PROTOCOL_VERSION } from "@board-games/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSockets, type FakeSockets, ROOM_CODE } from "@/test/fake-realtime";

import { createRoom, type CreateRoomResult } from "./create-room";

const IDENTITY = { playerId: "player-0123456789abcdef", name: "Minh" };

let sockets: FakeSockets;

beforeEach(() => {
  vi.useFakeTimers();
  sockets = createFakeSockets();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Starts creating a room; `result()` is what it settled with so far. */
function start() {
  let settled: CreateRoomResult | undefined;
  void createRoom({
    url: "ws://test",
    gameId: "tictactoe",
    identity: IDENTITY,
    openSocket: sockets.openSocket,
  }).then((result) => {
    settled = result;
  });
  return { socket: sockets.last(), result: () => settled };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("createRoom", () => {
  it("asks the server to create the room once connected, and gives its code", async () => {
    const { socket, result } = start();
    expect(socket.url).toBe("ws://test");

    socket.open();
    expect(socket.sent).toEqual([
      { type: "create", protocol: PROTOCOL_VERSION, gameId: "tictactoe", ...IDENTITY },
    ]);
    socket.receive({ type: "created", code: ROOM_CODE });
    await flush();

    expect(result()).toEqual({ ok: true, code: ROOM_CODE });
    expect(socket.closedByClient).toBe(true);
  });

  it.each(["unknown-game", "unavailable"] as const)(
    "fails with the server's error %s",
    async (code) => {
      const { socket, result } = start();

      socket.open();
      socket.receive({ type: "error", code });
      await flush();

      expect(result()).toEqual({ ok: false, error: code });
    },
  );

  it("fails when the connection is lost before an answer", async () => {
    const { socket, result } = start();

    socket.lose();
    await flush();

    expect(result()).toEqual({ ok: false, error: "unreachable" });
  });

  it("fails after 10 s without an answer, and ignores a code that comes later", async () => {
    const { socket, result } = start();
    socket.open();

    await vi.advanceTimersByTimeAsync(9999);
    expect(result()).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(result()).toEqual({ ok: false, error: "unreachable" });
    expect(socket.closedByClient).toBe(true);

    socket.receive({ type: "created", code: ROOM_CODE });
    await flush();
    expect(result()).toEqual({ ok: false, error: "unreachable" });
  });

  it("fails, and closes the socket, when the socket reports its failure while being opened", async () => {
    let closed = false;
    let settled: CreateRoomResult | undefined;
    void createRoom({
      url: "ws://test",
      gameId: "tictactoe",
      identity: IDENTITY,
      openSocket: (_url, handlers) => {
        handlers.onClose(1006);
        return {
          send: () => undefined,
          close: () => {
            closed = true;
          },
        };
      },
    }).then((result) => {
      settled = result;
    });
    await flush();

    expect(settled).toEqual({ ok: false, error: "unreachable" });
    expect(closed).toBe(true);
  });

  it("ignores a message it cannot read while waiting", async () => {
    const { socket, result } = start();
    socket.open();

    socket.receive("{broken");
    await flush();
    expect(result()).toBeUndefined();

    socket.receive({ type: "created", code: ROOM_CODE });
    await flush();
    expect(result()).toEqual({ ok: true, code: ROOM_CODE });
  });
});
