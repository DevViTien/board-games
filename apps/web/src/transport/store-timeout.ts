import { withTimeout } from "@/lib/with-timeout";

/**
 * How long an operation on saved games may take before it counts as failed. IndexedDB can hang
 * without ever answering (a blocked upgrade, a stuck browser profile); the screens must not wait
 * for it forever.
 */
const STORE_TIMEOUT_MS = 3000;

/**
 * `operation`, or a rejection once `STORE_TIMEOUT_MS` has passed without an answer, so callers
 * handle a hung store like a failed one. Also turns a store that throws instead of rejecting into
 * a rejection. A late answer is ignored.
 */
export function withStoreTimeout<T>(operation: () => Promise<T>): Promise<T> {
  return withTimeout(
    operation,
    STORE_TIMEOUT_MS,
    `No answer from the saved games in ${String(STORE_TIMEOUT_MS)} ms`,
  );
}
