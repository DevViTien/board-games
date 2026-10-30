/**
 * Objects whose whole subtree this module has frozen. Frozen properties cannot be replaced, so such
 * a subtree stays frozen and is skipped next time: states share most of their structure from one
 * move to the next, and re-walking it on every move would make long games slow.
 */
const deeplyFrozen = new WeakSet<object>();

/** Freezes `value` and everything reachable from it, so any later mutation throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  freezeTree(value);
  return value;
}

function freezeTree(value: unknown): void {
  if (typeof value !== "object" || value === null || deeplyFrozen.has(value)) return;
  // Marked before recursing so a cycle ends here. Checking `Object.isFrozen` instead would skip
  // the children of an object the rules froze only shallowly.
  deeplyFrozen.add(value);
  // Typed arrays cannot be frozen; they are not plain data, which `plain-data` reports.
  if (ArrayBuffer.isView(value)) return;
  Object.freeze(value);
  for (const key of Reflect.ownKeys(value)) {
    freezeTree((value as Record<PropertyKey, unknown>)[key]);
  }
}
