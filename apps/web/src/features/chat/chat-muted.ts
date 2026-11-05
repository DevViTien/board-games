import { z } from "zod";

import { CHAT_MUTED_KEY } from "@/config/storage-keys";

const mutedSchema = z.boolean();

/** Whether chat is muted on this browser; not, when storage cannot be read or holds anything else. */
export function readChatMuted(): boolean {
  try {
    const raw = window.localStorage.getItem(CHAT_MUTED_KEY);
    if (raw === null) return false;
    const parsed = mutedSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data;
  } catch {
    return false;
  }
}

/** Remembers the choice for every room; refused storage leaves it to this page. */
export function writeChatMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(CHAT_MUTED_KEY, JSON.stringify(muted));
  } catch {
    // Blocked storage, a full quota: the room's chat still knows, until the page closes.
  }
}

/** Calls `listener` when another tab changes the choice. */
export function subscribeChatMuted(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    // `null`: the whole storage was cleared.
    if (event.key === CHAT_MUTED_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
  };
}
