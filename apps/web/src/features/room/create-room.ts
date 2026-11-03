import {
  type ClientMessage,
  PROTOCOL_VERSION,
  type RejectionCode,
  type RoomCode,
} from "@board-games/protocol";

import type { Identity } from "@/features/identity/identity";
import {
  type ClientSocket,
  type OpenSocket,
  openWebSocket,
  readServerMessage,
} from "@/transport/socket";

/** Without an answer by then, the room is not created as far as the player is concerned. */
const CREATE_LIMIT_MS = 10_000;

export type CreateRoomResult =
  | { readonly ok: true; readonly code: RoomCode }
  /** The server's code, or `unreachable` when it could not be reached or did not answer in time. */
  | { readonly ok: false; readonly error: RejectionCode | "unreachable" };

export interface CreateRoomOptions {
  /** The realtime server's address. */
  readonly url: string;
  readonly gameId: string;
  /** The creator, who sits in the first seat. */
  readonly identity: Identity;
  readonly openSocket?: OpenSocket | undefined;
}

/**
 * Creates a room through a short connection: `create`, then `created` with its code, after which
 * the server closes. Settles once, within 10 seconds; a `created` arriving later is ignored and that
 * room simply expires unused.
 */
export function createRoom({
  url,
  gameId,
  identity,
  openSocket = openWebSocket,
}: CreateRoomOptions): Promise<CreateRoomResult> {
  return new Promise((resolve) => {
    let settled = false;
    // Declared before anything can settle: a socket may report its failure while it is opened.
    let socket: ClientSocket | null = null;
    const isSettled = () => settled;
    const finish = (result: CreateRoomResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket?.close();
      resolve(result);
    };
    const timer = setTimeout(() => {
      finish({ ok: false, error: "unreachable" });
    }, CREATE_LIMIT_MS);
    const opened = openSocket(url, {
      onOpen: () => {
        const create: ClientMessage = {
          type: "create",
          protocol: PROTOCOL_VERSION,
          gameId,
          playerId: identity.playerId,
          name: identity.name,
        };
        socket?.send(JSON.stringify(create));
      },
      onMessage: (data) => {
        const message = readServerMessage(data);
        if (message?.type === "created") finish({ ok: true, code: message.code });
        else if (message?.type === "error") finish({ ok: false, error: message.code });
      },
      onClose: () => {
        finish({ ok: false, error: "unreachable" });
      },
    });
    socket = opened;
    // Settled while opening: nothing will close this socket otherwise.
    if (isSettled()) opened.close();
  });
}
