// Test-only: a real `ws` client that records what the server sends.
import { parseServerMessage, PROTOCOL_VERSION, type ServerMessage } from "@board-games/protocol";
import { type ClientOptions, WebSocket } from "ws";

import { REALTIME_PATH } from "./dev-server";
import { rawDataToBuffer } from "./raw-data";

export interface TestPlayer {
  readonly playerId: string;
  readonly name: string;
}

export interface TestClient {
  readonly socket: WebSocket;
  /** Sends once the socket is open; a string is sent as is, anything else as JSON. */
  send(this: void, message: unknown): void;
  /** The next message not read yet; fails on a message outside the protocol. */
  next(this: void): Promise<ServerMessage>;
  /** Everything received so far, as sent. */
  readonly received: unknown[];
  /** Resolves with the close code once the connection is closed. */
  readonly closed: Promise<number>;
}

const WAIT_MS = 2000;

export function openClient(port: number, options: ClientOptions = {}): TestClient {
  const socket = new WebSocket(`ws://localhost:${String(port)}${REALTIME_PATH}`, options);
  const received: unknown[] = [];
  const waiting: ((message: unknown) => void)[] = [];
  let read = 0;
  const opened = new Promise<void>((resolve) => socket.once("open", resolve));
  const closed = new Promise<number>((resolve) => {
    socket.once("close", (code) => {
      resolve(code);
    });
  });
  socket.on("error", () => undefined);
  socket.on("message", (data) => {
    const message: unknown = JSON.parse(rawDataToBuffer(data).toString("utf8"));
    received.push(message);
    waiting.shift()?.(message);
  });

  return {
    socket,
    received,
    closed,
    send: (message) => {
      void opened.then(() => {
        socket.send(typeof message === "string" ? message : JSON.stringify(message));
      });
    },
    next: () => {
      const index = read;
      read += 1;
      const raw =
        index < received.length
          ? Promise.resolve(received[index])
          : new Promise<unknown>((resolve, reject) => {
              const timer = setTimeout(() => {
                reject(new Error(`No message #${String(index)} within ${String(WAIT_MS)} ms`));
              }, WAIT_MS);
              waiting.push((message) => {
                clearTimeout(timer);
                resolve(message);
              });
            });
      return raw.then((message) => {
        const parsed = parseServerMessage(message);
        if (parsed === null) throw new Error(`Not a server message: ${JSON.stringify(message)}`);
        return parsed;
      });
    },
  };
}

export function joinMessage(code: string, player: TestPlayer) {
  return { type: "join", protocol: PROTOCOL_VERSION, code, ...player };
}

export function sitMessage({ name }: TestPlayer) {
  return { type: "sit", name };
}

export function createMessage(gameId: string, player: TestPlayer) {
  return { type: "create", protocol: PROTOCOL_VERSION, gameId, ...player };
}
