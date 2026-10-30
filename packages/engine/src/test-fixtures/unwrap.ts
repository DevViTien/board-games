import type { Result } from "../errors";

/** Test helper: the value of a successful result, or a thrown error naming the failure code. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Expected success, got "${result.error}"`);
  return result.value;
}
