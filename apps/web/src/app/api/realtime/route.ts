import { MAX_MESSAGE_BYTES } from "@board-games/protocol";
import { upgradeWebSocket } from "@vercel/functions";
import { connection } from "next/server";

import { type ServerEnv, serverEnv } from "@/server/env";
import { attachConnection } from "@/server/realtime/connection";
import { createDefaultRoomService } from "@/server/room-service";
import { openRoomStore } from "@/server/store/open-room-store";

/**
 * The WebSocket endpoint on Vercel. Every room action goes through it; there is no REST API.
 * Under `next dev`/`next start` nothing can upgrade the request: the local realtime server
 * (`pnpm --filter @board-games/web realtime`) serves the same path instead.
 */
export async function GET(request: Request): Promise<Response> {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response(null, { status: 426, headers: { upgrade: "websocket" } });
  }
  await connection();

  let env: ServerEnv;
  try {
    env = serverEnv();
  } catch (error) {
    console.error("[realtime] server misconfigured", error);
    return new Response(null, { status: 503 });
  }
  const service = createDefaultRoomService(openRoomStore(env.store));

  // An object rather than a `let`: TypeScript would take a boolean that only the callback below
  // sets for still `false` in the `catch`.
  const upgrade = { attached: false };
  try {
    return await upgradeWebSocket(
      (socket) => {
        upgrade.attached = true;
        attachConnection(socket, { service });
      },
      { maxPayload: MAX_MESSAGE_BYTES },
    );
  } catch (error) {
    if (upgrade.attached) throw error;
    // `@vercel/functions` does not expose whether the runtime can upgrade, only fails when it
    // cannot: under `next dev`/`next start`, or when the client left mid-upgrade.
    console.error(
      "[realtime] no WebSocket upgrade here; locally, run `pnpm --filter @board-games/web realtime`",
      error,
    );
    return new Response(null, { status: 501 });
  }
}
