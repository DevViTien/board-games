import { z } from "zod";

import { CARD_SCORE_DRAFT_KEY_PREFIX } from "@/config/storage-keys";

/** A new round being typed, kept for this tab: a reload, or the phone clearing the tab, loses nothing. */
export interface RoundDraft {
  readonly roundId: string;
  /** The players it was opened for; when those playing have changed, the draft is dropped. */
  readonly playerIds: readonly string[];
  readonly values: readonly string[];
}

const draftSchema = z.object({
  roundId: z.string().min(1),
  playerIds: z.array(z.string()),
  values: z.array(z.string()),
});

const key = (groupId: string) => `${CARD_SCORE_DRAFT_KEY_PREFIX}${groupId}`;

export function readRoundDraft(groupId: string): RoundDraft | null {
  try {
    const raw = window.sessionStorage.getItem(key(groupId));
    if (raw === null) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.playerIds.length === parsed.data.values.length
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}

export function writeRoundDraft(groupId: string, draft: RoundDraft): void {
  try {
    window.sessionStorage.setItem(key(groupId), JSON.stringify(draft));
  } catch {
    // Blocked storage, a full quota: the round on screen is still there, until the tab closes.
  }
}

export function clearRoundDraft(groupId: string): void {
  try {
    window.sessionStorage.removeItem(key(groupId));
  } catch {
    // Nothing could have been written either.
  }
}
