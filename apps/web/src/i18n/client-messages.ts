import type { Messages } from "./messages";

/** The messages client components may use: all of them but the `Rules` namespace. */
export type ClientMessages = Omit<Messages, "Rules">;

/**
 * The messages sent to the browser with every page (the root layout's provider): all but the
 * games' rules, a long text no client component reads (ESLint stops a `"use client"` file asking
 * for them). The rules page translates them on the server; the play screen's rules dialog loads
 * them when it first opens (`features/rules/load-rules.ts`).
 */
export function clientMessages(messages: Messages): ClientMessages {
  return Object.fromEntries(
    Object.entries(messages).filter(([namespace]) => namespace !== "Rules"),
  ) as ClientMessages;
}
