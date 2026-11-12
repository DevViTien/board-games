import { z } from "zod";

import { CHAT_COLUMN_KEY } from "@/config/storage-keys";

/** The chat's column of a wide screen: open, or collapsed to its strip. */
export const CHAT_COLUMN = {
  Open: "open",
  Collapsed: "collapsed",
} as const;
export type ChatColumn = (typeof CHAT_COLUMN)[keyof typeof CHAT_COLUMN];

const columnSchema = z.enum([CHAT_COLUMN.Open, CHAT_COLUMN.Collapsed]);

/** The choice of this browser; open when storage cannot be read or holds anything else. */
export function readChatColumn(): ChatColumn {
  try {
    const raw = window.localStorage.getItem(CHAT_COLUMN_KEY);
    if (raw === null) return CHAT_COLUMN.Open;
    const parsed = columnSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : CHAT_COLUMN.Open;
  } catch {
    return CHAT_COLUMN.Open;
  }
}

/** Remembers the choice for every room; refused storage leaves it to this page. */
export function writeChatColumn(column: ChatColumn): void {
  try {
    window.localStorage.setItem(CHAT_COLUMN_KEY, JSON.stringify(column));
  } catch {
    // Blocked storage, a full quota: the column stays as chosen until the page closes.
  }
}
