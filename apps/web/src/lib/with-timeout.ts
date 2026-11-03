/** An operation that did not answer in time; whatever it answers later is ignored. */
export class TimeoutError extends Error {
  override readonly name = "TimeoutError";
}

/**
 * `operation()`, or a `TimeoutError` once `ms` have passed without an answer, so callers handle a
 * dependency that hangs (IndexedDB, Redis, the room store) like one that fails. An operation that
 * throws instead of rejecting becomes a rejection, and any rejection an `Error`. A late answer is
 * ignored.
 */
export function withTimeout<T>(
  operation: () => Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(message));
    }, ms);
    new Promise<T>((started) => {
      started(operation());
    }).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        reject(reason instanceof Error ? reason : new Error(String(reason)));
      },
    );
  });
}
