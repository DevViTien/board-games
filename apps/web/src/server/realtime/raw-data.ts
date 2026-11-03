import type { RawData } from "ws";

/** The bytes of a `ws` message, however `ws` handed them over: one buffer, fragments, or not. */
export function rawDataToBuffer(data: RawData): Buffer {
  if (Array.isArray(data)) return Buffer.concat(data);
  return data instanceof ArrayBuffer ? Buffer.from(data) : data;
}
