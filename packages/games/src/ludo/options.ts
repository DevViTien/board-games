/**
 * The rule points that vary by region and are cheap to tell apart (design §3). Only the defaults
 * are played in M6: `parseLudoOptions` refuses every variant, which only the test-only rules
 * (`test-variants.ts`) accept.
 */
export interface LudoOptions {
  /** Which rolls bring a horse out of its stable. */
  readonly exitRoll: "six" | "one-or-six";
  /** Whether a 6 gives another roll. */
  readonly extraRoll: "six" | "none";
  /** Whether a horse may pass others on its way (never stop on its own). */
  readonly passing: "blocked" | "free";
  /** Whether a 1 makes a horse jump to the next gate when the way is clear. */
  readonly oneJump: boolean;
}

export const LUDO_DEFAULT_OPTIONS = {
  exitRoll: "six",
  extraRoll: "six",
  passing: "blocked",
  oneJump: true,
} as const satisfies LudoOptions;

/** Every value each option may take, the default first. */
const OPTION_VALUES: { readonly [K in keyof LudoOptions]: readonly LudoOptions[K][] } = {
  exitRoll: ["six", "one-or-six"],
  extraRoll: ["six", "none"],
  passing: ["blocked", "free"],
  oneJump: [true, false],
};

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isOptionKey(key: string): key is keyof LudoOptions {
  return Object.hasOwn(OPTION_VALUES, key);
}

function pick<K extends keyof LudoOptions>(
  raw: Readonly<Record<string, unknown>>,
  key: K,
): LudoOptions[K] | undefined {
  if (!(key in raw)) return LUDO_DEFAULT_OPTIONS[key];
  const value = raw[key];
  return OPTION_VALUES[key].find((allowed) => allowed === value);
}

/**
 * Any set of options, variants included, as plain data: a missing key takes its default; an
 * unknown key or value, or anything that is not a plain object, is refused (`null`). Only the
 * test-only rules use it directly.
 */
export function parseAnyLudoOptions(raw: unknown): LudoOptions | null {
  if (!isPlainObject(raw)) return null;
  if (Object.keys(raw).some((key) => !isOptionKey(key))) return null;
  const exitRoll = pick(raw, "exitRoll");
  const extraRoll = pick(raw, "extraRoll");
  const passing = pick(raw, "passing");
  const oneJump = pick(raw, "oneJump");
  if (
    exitRoll === undefined ||
    extraRoll === undefined ||
    passing === undefined ||
    oneJump === undefined
  ) {
    return null;
  }
  return { exitRoll, extraRoll, passing, oneJump };
}

/**
 * Options received from outside (the address, a room, a saved game): only the default rules are
 * played in M6, so any key present must hold its default value (a missing key takes it); a
 * variant, an unknown key or value, or anything that is not a plain object is refused (`null`).
 */
export function parseLudoOptions(raw: unknown): LudoOptions | null {
  const parsed = parseAnyLudoOptions(raw);
  if (parsed === null) return null;
  const isDefault = (Object.keys(LUDO_DEFAULT_OPTIONS) as (keyof LudoOptions)[]).every(
    (key) => parsed[key] === LUDO_DEFAULT_OPTIONS[key],
  );
  return isDefault ? { ...LUDO_DEFAULT_OPTIONS } : null;
}
