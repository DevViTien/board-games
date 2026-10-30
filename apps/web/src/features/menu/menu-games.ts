import { GAMES, type RegisteredGameId } from "@board-games/games";

import { PLANNED_GAMES } from "./planned-games";

/** Every id that can appear on the menu, so card names stay checked translation keys. */
type MenuGameId = RegisteredGameId | (typeof PLANNED_GAMES)[number]["id"];

interface CardInfo {
  readonly players: { readonly min: number; readonly max: number };
  readonly durationMinutes: number;
}

export type MenuGame =
  | (CardInfo & { readonly kind: "playable"; readonly id: RegisteredGameId })
  | (CardInfo & { readonly kind: "planned"; readonly id: MenuGameId });

interface MenuSources {
  readonly registered: readonly { readonly id: RegisteredGameId; readonly meta: CardInfo }[];
  readonly planned: readonly (CardInfo & { readonly id: MenuGameId })[];
}

/**
 * The cards of the menu: playable games first, then planned games that have no rules yet. A
 * planned game that has since been registered appears once, as playable.
 */
export function buildMenu(
  { registered, planned }: MenuSources = { registered: GAMES, planned: PLANNED_GAMES },
): readonly MenuGame[] {
  const playable = registered.map(({ id, meta }): MenuGame => ({
    kind: "playable",
    id,
    players: meta.players,
    durationMinutes: meta.durationMinutes,
  }));
  const playableIds = new Set<string>(registered.map((game) => game.id));
  const comingSoon = planned
    .filter((game) => !playableIds.has(game.id))
    .map(({ id, players, durationMinutes }): MenuGame => ({
      kind: "planned",
      id,
      players,
      durationMinutes,
    }));
  return [...playable, ...comingSoon];
}
