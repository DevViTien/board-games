// The addresses of the tool's screens: plain data, for the server's route to check them too.

export const CARD_SCORE_HOME = "/tools/card-score";

export type CardScoreRoute =
  | { readonly screen: "list" }
  | { readonly screen: "new" }
  | { readonly screen: "board"; readonly groupId: string }
  | { readonly screen: "edit"; readonly groupId: string };

/** The screen of a path's segments after `/tools/card-score`, or `null` for no such page. */
export function routeOf(segments: readonly string[]): CardScoreRoute | null {
  const [first, second] = segments;
  if (first === undefined) return { screen: "list" };
  if (segments.length === 1) {
    return first === "new" ? { screen: "new" } : { screen: "board", groupId: first };
  }
  if (segments.length === 2 && second === "edit" && first !== "new") {
    return { screen: "edit", groupId: first };
  }
  return null;
}

export const boardHref = (groupId: string) => `${CARD_SCORE_HOME}/${encodeURIComponent(groupId)}`;
export const editHref = (groupId: string) => `${boardHref(groupId)}/edit`;
export const newHref = (fromGroupId?: string) =>
  `${CARD_SCORE_HOME}/new${fromGroupId === undefined ? "" : `?from=${encodeURIComponent(fromGroupId)}`}`;
