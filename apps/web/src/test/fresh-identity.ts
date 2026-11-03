import { vi } from "vitest";

import type * as IdentityModule from "@/features/identity/identity";

type Identity = typeof IdentityModule;

let current: Identity | undefined;

function identity(): Identity {
  if (current === undefined) throw new Error("Call loadFreshIdentity() in beforeEach");
  return current;
}

/**
 * Stands in for `@/features/identity/identity` in component tests, passing every call to a fresh
 * copy of the real module: the identity kept in memory once the browser refuses storage lives in
 * that module, and must not leak from one test into the next. Use with
 * `vi.mock("@/features/identity/identity", () => import("@/test/fresh-identity").then((m) => m.freshIdentity))`
 * and `beforeEach(loadFreshIdentity)`.
 */
export const freshIdentity: Identity = {
  parsePlayerName: (raw) => identity().parsePlayerName(raw),
  readIdentity: () => identity().readIdentity(),
  readRoomIdentity: (code) => identity().readRoomIdentity(code),
  pinRoomIdentity: (code, pinned) => {
    identity().pinRoomIdentity(code, pinned);
  },
  guestPlayerId: () => identity().guestPlayerId(),
  saveName: (name, sessionPlayerId) => identity().saveName(name, sessionPlayerId),
};

/** Loads a copy of the real identity module with nothing in memory. */
export async function loadFreshIdentity(): Promise<void> {
  vi.resetModules();
  current = await vi.importActual<Identity>("@/features/identity/identity");
}
