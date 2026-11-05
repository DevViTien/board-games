import { playerIdSchema, playerNameSchema } from "@board-games/protocol";
import { z } from "zod";

import { IDENTITY_KEY, ROOM_IDENTITY_KEY_PREFIX } from "@/config/storage-keys";
import { randomId } from "@/lib/random-id";

/** Who the player is online, without an account: a name of their choice and a random id. */
export interface Identity {
  /** The secret that gets the player's seat back in a room; never shown. */
  readonly playerId: string;
  readonly name: string;
}

const identitySchema = z.object({ playerId: playerIdSchema, name: playerNameSchema });

// Used only when the browser refuses localStorage (blocked storage, a full quota): the identity
// then lasts as long as the tab, and a reload makes the player someone new.
let inMemory: Identity | null = null;
let storageRefused = false;

/**
 * The name as the protocol accepts it (trimmed, NFC, 1–24 characters, nothing invisible), or
 * `null` when the server would refuse it: client and server check names with the same schema.
 */
export function parsePlayerName(raw: string): string | null {
  const parsed = playerNameSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * The identity remembered on this browser, or `null` when there is none or it cannot be read
 * (corrupt): the player is then asked for a name as the first time, without an error. Read only
 * after mount, since the server cannot see it.
 */
export function readIdentity(): Identity | null {
  // Once the browser refused to store a name, what it still holds is older than this tab's.
  if (storageRefused && inMemory !== null) return inMemory;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(IDENTITY_KEY);
  } catch {
    return inMemory;
  }
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = identitySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/**
 * A player id for a visitor who has not chosen a name yet: a new one each time, remembered nowhere.
 * The room page greets with it (change `ask-name-in-lobby`) and remembers it, with the name, only
 * once the player chooses one in the lobby (`saveName`).
 */
export function guestPlayerId(): string {
  return randomId();
}

/**
 * Remembers `name` (already checked with `parsePlayerName`), keeping the player's id, or creating
 * one the first time: a new name never costs the player their seat. Not remembering it is no
 * reason to fail; the identity is then kept for this tab only.
 *
 * With `sessionPlayerId`, the id a room page greets with for as long as it is open: remembered
 * with the name when the browser has no identity yet, renamed when it is the remembered one, and
 * nothing is written when another tab already remembered another id. That tab's identity is never
 * replaced, so neither room page's next greeting claims the other's seat.
 */
export function saveName(name: string, sessionPlayerId?: string): Identity {
  const remembered = readIdentity()?.playerId;
  if (sessionPlayerId !== undefined && remembered !== undefined && remembered !== sessionPlayerId) {
    return { playerId: sessionPlayerId, name };
  }
  const identity: Identity = { playerId: sessionPlayerId ?? remembered ?? randomId(), name };
  inMemory = identity;
  try {
    window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Private mode or blocked storage: the identity lives in memory until the tab closes.
    storageRefused = true;
  }
  return identity;
}

/**
 * Who the room page of `code` was in this tab, as pinned when the player sat there
 * (`pinRoomIdentity`): it outlives a reload of the tab, not the tab itself. `null` when there is
 * none or it cannot be read; the page then starts from the remembered identity.
 */
export function readRoomIdentity(code: string): Identity | null {
  try {
    const raw = window.sessionStorage.getItem(ROOM_IDENTITY_KEY_PREFIX + code);
    if (raw === null) return null;
    const parsed = identitySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // Blocked storage or corrupt data: as if nothing was pinned.
    return null;
  }
}

/**
 * Pins `identity` to the room page of `code` in this tab, so a reload greets with the id that
 * holds the seat, whatever another tab remembered meanwhile. Not pinning it is no reason to fail.
 */
export function pinRoomIdentity(code: string, identity: Identity): void {
  try {
    window.sessionStorage.setItem(ROOM_IDENTITY_KEY_PREFIX + code, JSON.stringify(identity));
  } catch {
    // Blocked or full storage: the page keeps the identity in memory until the tab closes.
  }
}
