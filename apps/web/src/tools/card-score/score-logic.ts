/** The largest score, typed or worked out, either way. */
export const SCORE_LIMIT = 9_999_999;

/** What a score field holds: a number, nothing yet (a lone sign counts as nothing), or anything else. */
export type ParsedScore = number | "blank" | "invalid";

/**
 * Reads what a score field holds. Full-width digits (a Japanese keyboard) and either minus sign are
 * accepted, and so is the "+35" the app itself prints. A dot or a comma is not: "1.000" means
 * different numbers in different languages.
 */
export function parseScore(raw: string): ParsedScore {
  const text = raw.normalize("NFKC").trim().replace("−", "-");
  if (text === "" || text === "-" || text === "+") return "blank";
  if (!/^[+-]?\d+$/.test(text)) return "invalid";
  const score = Number(text);
  if (Math.abs(score) > SCORE_LIMIT) return "invalid";
  // Never -0.
  return score === 0 ? 0 : score;
}

export interface ScoreRow {
  readonly playerId: string;
  readonly raw: string;
}

export type Scores = Readonly<Record<string, number>>;

/** Where a round being typed stands. The screen and the save both go by this. */
export type RoundState =
  | { readonly kind: "empty" }
  | { readonly kind: "invalid"; readonly playerIds: readonly string[] }
  | { readonly kind: "missing"; readonly count: number }
  | {
      readonly kind: "auto";
      readonly playerId: string;
      readonly value: number;
      readonly scores: Scores;
    }
  | { readonly kind: "auto-too-large"; readonly playerId: string }
  | { readonly kind: "mismatch"; readonly delta: number }
  | { readonly kind: "balanced"; readonly scores: Scores };

export function roundState(rows: readonly ScoreRow[]): RoundState {
  const parsed = rows.map((row) => ({ playerId: row.playerId, score: parseScore(row.raw) }));

  const invalid = parsed.filter((row) => row.score === "invalid").map((row) => row.playerId);
  if (invalid.length > 0) return { kind: "invalid", playerIds: invalid };

  const blanks = parsed.filter((row) => row.score === "blank");
  if (blanks.length === parsed.length) return { kind: "empty" };
  if (blanks.length >= 2) return { kind: "missing", count: blanks.length };

  const scores: Record<string, number> = {};
  let sum = 0;
  for (const { playerId, score } of parsed) {
    if (typeof score === "number") {
      scores[playerId] = score;
      sum += score;
    }
  }

  const blank = blanks[0];
  if (blank !== undefined) {
    const value = sum === 0 ? 0 : -sum;
    if (Math.abs(value) > SCORE_LIMIT) return { kind: "auto-too-large", playerId: blank.playerId };
    return {
      kind: "auto",
      playerId: blank.playerId,
      value,
      scores: { ...scores, [blank.playerId]: value },
    };
  }
  return sum === 0 ? { kind: "balanced", scores } : { kind: "mismatch", delta: sum };
}

/** The scores a round would be saved with, or `null` while it cannot be saved. */
export function savableScores(state: RoundState): Scores | null {
  return state.kind === "auto" || state.kind === "balanced" ? state.scores : null;
}

/** What the sign key does to a field's text: a lone minus is kept, to wait for its digits. */
export function toggleSign(raw: string): string {
  // A number pasted in may carry its sign in another shape.
  const text = raw.normalize("NFKC").trim().replace("−", "-").replace(/^\+/, "");
  return text.startsWith("-") ? text.slice(1) : `-${text}`;
}

/** Longest number of digits the keypad takes: `SCORE_LIMIT` has seven. */
const KEYPAD_DIGITS = 7;

/**
 * What the keypad's digit keys do to a field's text. `fresh`: the field was just chosen, so its
 * number goes away (its sign too, unless nothing was typed yet). A digit too many is ignored.
 */
export function pressDigits(raw: string, digits: string, fresh: boolean): string {
  const kept = fresh && raw !== "-" ? "" : raw;
  const sign = kept.startsWith("-") ? "-" : "";
  const number = `${sign === "" ? kept : kept.slice(1)}${digits}`.replace(/^0+(?=\d)/, "");
  return number.length > KEYPAD_DIGITS ? raw : `${sign}${number}`;
}

/** The row "Tiếp" goes to: the next blank one, going round; with none, simply the next one. */
export function nextRow(rows: readonly ScoreRow[], from: number): number {
  for (let step = 1; step < rows.length; step += 1) {
    const index = (from + step) % rows.length;
    const row = rows[index];
    if (row !== undefined && parseScore(row.raw) === "blank") return index;
  }
  return (from + 1) % rows.length;
}
