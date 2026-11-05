/** 16 random bytes in hex, where `crypto.randomUUID` is missing (a page over plain `http://`). */
function randomHexId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A random id. */
export function randomId(): string {
  // Only in a secure context: a phone opening the dev server by its LAN address has no `randomUUID`.
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : randomHexId();
}
