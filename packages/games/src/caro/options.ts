import { CARO_RULE, CARO_SIZES, type CaroRule, type CaroSize } from "./constants";

export interface CaroOptions {
  readonly size: CaroSize;
  readonly rule: CaroRule;
}

export const CARO_DEFAULT_OPTIONS = {
  size: 15,
  rule: "blocked-ends",
} as const satisfies CaroOptions;

const OPTION_KEYS: readonly string[] = ["size", "rule"] satisfies (keyof CaroOptions)[];

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSize(value: unknown): value is CaroSize {
  return CARO_SIZES.some((size) => size === value);
}

function isRule(value: unknown): value is CaroRule {
  return Object.values(CARO_RULE).some((rule) => rule === value);
}

/**
 * Options received from outside (a saved game, a room). A missing key takes its default, so a
 * record saved before an option existed still loads; an unknown key or value, or anything that is
 * not a plain object, is refused (`null`). Always returns both keys.
 */
export function parseCaroOptions(raw: unknown): CaroOptions | null {
  if (!isPlainObject(raw)) return null;
  if (Object.keys(raw).some((key) => !OPTION_KEYS.includes(key))) return null;
  const { size = CARO_DEFAULT_OPTIONS.size, rule = CARO_DEFAULT_OPTIONS.rule } = raw;
  return isSize(size) && isRule(rule) ? { size, rule } : null;
}
