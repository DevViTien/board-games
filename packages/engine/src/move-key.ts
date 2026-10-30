import { isPlainObject } from "./guards";

/**
 * JSON with object keys sorted at every level, so two equal values give the same string whatever
 * order their keys were written in (moves received over the network may differ in key order).
 * Throws on values JSON cannot represent faithfully: functions, symbols, `undefined` at the top
 * level, and objects that are not plain (a `Date` or `Map` would otherwise all collapse to `{}`).
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const json = JSON.stringify(value) as string | undefined;
    if (json === undefined) throw new TypeError(`Cannot serialize a value of type ${typeof value}`);
    return json;
  }
  if (Array.isArray(value)) {
    // Array.from visits holes (as undefined) where map skips them: `[,]` must not read as `[]`.
    const items = Array.from(value, (item: unknown) =>
      item === undefined ? "null" : stableStringify(item),
    );
    return `[${items.join(",")}]`;
  }
  if (!isPlainObject(value)) {
    throw new TypeError(`Cannot serialize ${Object.prototype.toString.call(value)}`);
  }
  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

export function defaultMoveKey(move: unknown): string {
  return stableStringify(move);
}
