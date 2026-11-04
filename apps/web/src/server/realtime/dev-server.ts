import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { ABANDON_AFTER_MS, MAX_MESSAGE_BYTES } from "@board-games/protocol";
import { WebSocketServer } from "ws";

import { createDefaultRoomService } from "../room-service";
import type { RoomStore } from "../store/room-store";
import { attachConnection, type ConnectionLimits } from "./connection";

/** The path clients connect to, the same as the route on Vercel. */
export const REALTIME_PATH = "/api/realtime";

export interface RealtimeServerOptions {
  /** 0 picks a free port (tests). */
  readonly port: number;
  readonly store: RoomStore;
  readonly limits?: Partial<ConnectionLimits>;
  /** `ABANDON_AFTER_MS` when absent; shorter in E2E (`REALTIME_ABANDON_AFTER_MS`). */
  readonly abandonAfterMs?: number;
}

export interface RealtimeServer {
  readonly port: number;
  close(this: void): Promise<void>;
}

/**
 * The WebSocket endpoint as a plain Node server, for a developer's machine and E2E: `next dev`
 * and `next start` cannot upgrade a route to a WebSocket, only Vercel can. Serves the same
 * connections as the Vercel route, and answers `/healthz` so tools can wait for it.
 */
export async function startRealtimeServer({
  port,
  store,
  limits,
  abandonAfterMs = ABANDON_AFTER_MS,
}: RealtimeServerOptions): Promise<RealtimeServer> {
  const service = createDefaultRoomService(store, abandonAfterMs);
  const sockets = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const server = createServer((request, response) => {
    const healthy = request.url === "/healthz";
    response
      .writeHead(healthy ? 200 : 404, { "content-type": "text/plain" })
      .end(healthy ? "ok" : "not found");
  });

  server.on("upgrade", (request, socket, head) => {
    // A peer that resets mid-answer must not become an uncaught error of the whole server.
    socket.on("error", () => {
      socket.destroy();
    });
    let path: string;
    try {
      path = new URL(request.url ?? "/", "http://localhost").pathname;
    } catch {
      // A request line Node's parser lets through but that is no URL (`GET http://[`).
      socket.destroy();
      return;
    }
    if (path !== REALTIME_PATH) {
      socket.end("HTTP/1.1 404 Not Found\r\n\r\n");
      return;
    }
    sockets.handleUpgrade(request, socket, head, (ws) => {
      attachConnection(ws, { service, ...(limits === undefined ? {} : { limits }) });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    port: (server.address() as AddressInfo).port,
    close: async () => {
      for (const client of sockets.clients) client.terminate();
      await new Promise<void>((resolve) => {
        sockets.close(() => {
          resolve();
        });
      });
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) resolve();
          else reject(error);
        });
      });
    },
  };
}
