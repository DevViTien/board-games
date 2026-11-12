import {
  type AnyGameDefinition,
  listOptionChoices,
  type OptionChoiceList,
} from "@board-games/engine";
import { GAMES, type RegisteredGameId } from "@board-games/games";

import { type ChosenOptions, matchOptionChoices } from "@/lib/option-choices";
import { type PuzzleEntry, PUZZLES } from "@/puzzles/registry";

import { PLANNED_GAMES } from "./planned-games";

/** Every id that can appear on the menu, so card names stay checked translation keys. */
// No planned game since M7 (`never`); kept so that one added later is checked the same way.
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type MenuGameId = RegisteredGameId | (typeof PLANNED_GAMES)[number]["id"];

interface CardInfo {
  readonly players: { readonly min: number; readonly max: number };
  readonly durationMinutes: number;
}

export type MenuGame =
  | (CardInfo & { readonly kind: "playable"; readonly id: RegisteredGameId })
  | (Pick<PuzzleEntry, "id" | "href" | "Artwork" | "levelCount"> & { readonly kind: "puzzle" })
  | (CardInfo & { readonly kind: "planned"; readonly id: MenuGameId });

interface MenuSources {
  readonly registered: readonly { readonly id: RegisteredGameId; readonly meta: CardInfo }[];
  readonly planned: readonly (CardInfo & { readonly id: MenuGameId })[];
  /** One-player puzzles (`PUZZLES`): after the playable games, before the planned ones. */
  readonly puzzles?: readonly PuzzleEntry[];
}

/**
 * The cards of the menu: playable games first, then the puzzles, then planned games that have no
 * rules yet. A planned game that has since been registered appears once, as playable.
 */
export function buildMenu(
  { registered, planned, puzzles = PUZZLES }: MenuSources = {
    registered: GAMES,
    planned: PLANNED_GAMES,
  },
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
  const puzzleCards = puzzles.map(({ id, href, Artwork, levelCount }): MenuGame => ({
    kind: "puzzle",
    id,
    href,
    Artwork,
    levelCount,
  }));
  return [...playable, ...puzzleCards, ...comingSoon];
}

/** The rule options a game offers and its default for each: plain data for client components. */
interface GameOptionChoices {
  readonly choices: readonly OptionChoiceList[];
  readonly defaults: ChosenOptions;
}

/** `GameOptionChoices` by game id. */
export type OptionChoicesByGame = Readonly<Record<string, GameOptionChoices>>;

/**
 * The rule options of every registered game, built on the server: the menu's list of games in
 * progress names them without loading any game's rules into the browser.
 */
export function buildOptionChoices(
  registered: readonly AnyGameDefinition[] = GAMES,
): OptionChoicesByGame {
  return Object.fromEntries(
    registered.map((game) => {
      const choices = listOptionChoices(game);
      return [
        game.id,
        { choices, defaults: matchOptionChoices(choices, game.defaultOptions) ?? {} },
      ];
    }),
  );
}
