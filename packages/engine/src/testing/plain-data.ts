import { isPlainObject } from "../guards";

/**
 * Where `value` stops being plain JSON data, as a path like `$.board[2]`, or `null` if it is plain
 * data. Plain means `JSON.parse(JSON.stringify(value))` gives back an equal value, so anything JSON
 * drops or changes is reported: class instances, functions, `undefined`, non-finite numbers, `-0`,
 * array holes, and symbol or non-enumerable own properties.
 */
export function findNonPlainData(value: unknown, path = "$"): string | null {
  if (value === null || typeof value === "string" || typeof value === "boolean") return null;
  if (typeof value === "number")
    return Number.isFinite(value) && !Object.is(value, -0) ? null : path;
  if (Array.isArray(value)) {
    // Own keys of a plain array are its indices plus "length"; anything else JSON drops.
    if (Reflect.ownKeys(value).length !== value.length + 1) return path;
    for (const [index, item] of value.entries()) {
      const found = findNonPlainData(item, `${path}[${index}]`);
      if (found !== null) return found;
    }
    return null;
  }
  if (isPlainObject(value)) {
    if (Reflect.ownKeys(value).length !== Object.keys(value).length) return path;
    for (const [key, item] of Object.entries(value)) {
      const found = findNonPlainData(item, `${path}.${key}`);
      if (found !== null) return found;
    }
    return null;
  }
  return path;
}

/** Structural equality for plain data; anything else is equal only to itself. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // An index loop, not `every`, which skips holes and would call `[, 1]` equal to `[2, 1]`.
    for (let index = 0; index < a.length; index += 1) {
      if (!deepEqual(a[index], b[index])) return false;
    }
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))
    );
  }
  return false;
}
