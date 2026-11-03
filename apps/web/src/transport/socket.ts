import { parseServerMessage, type ServerMessage } from "@board-games/protocol";

/** What a connection to the realtime server reports; only the socket that is current is listened to. */
export interface SocketHandlers {
  readonly onOpen: () => void;
  /** A frame from the server, still undecoded. */
  readonly onMessage: (data: unknown) => void;
  /** `1006` when the connection was lost without a closing frame (Vercel's cut every ~5 minutes). */
  readonly onClose: (code: number) => void;
}

/** The two things a client does to a socket; tests pass a fake one. */
export interface ClientSocket {
  send(this: void, data: string): void;
  close(this: void): void;
}

export type OpenSocket = (url: string, handlers: SocketHandlers) => ClientSocket;

/**
 * A browser WebSocket. An address the browser refuses (`new WebSocket` throws) is reported like a
 * connection that failed at once, so callers have a single path for every failure.
 */
export const openWebSocket: OpenSocket = (url, handlers) => {
  let socket: WebSocket;
  try {
    socket = new WebSocket(url);
  } catch {
    setTimeout(() => {
      handlers.onClose(1006);
    }, 0);
    return { send: () => undefined, close: () => undefined };
  }
  socket.onopen = () => {
    handlers.onOpen();
  };
  socket.onmessage = (event) => {
    handlers.onMessage(event.data);
  };
  socket.onclose = (event) => {
    handlers.onClose(event.code);
  };
  return {
    send: (data) => {
      // Sending on a socket that is closing throws in some browsers; the close event follows.
      try {
        socket.send(data);
      } catch {
        // Lost with the connection, as any message in flight.
      }
    },
    close: () => {
      socket.close();
    },
  };
};

/**
 * A frame from the server as a message of the protocol, or `null` when it is not one (not text,
 * not JSON, or not a message this client knows): data from the network is never trusted.
 */
export function readServerMessage(data: unknown): ServerMessage | null {
  if (typeof data !== "string") return null;
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return null;
  }
  return parseServerMessage(json);
}
