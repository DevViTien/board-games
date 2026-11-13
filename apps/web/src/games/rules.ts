import type { RegisteredGameId } from "@board-games/games/ids";

import type { GameRulesComponent } from "@/features/rules/types";

/**
 * Each registered game's rules (`games/<id>/Rules.tsx`), loaded on demand: on the server for the
 * rules page, and in the browser only when the play screen's rules dialog first opens
 * (`features/rules/load-rules.ts`). A rules component is plain markup (no board, no game entry), so loading
 * it never brings a board along. Adding a game is one line here; a missing or extra game is a type
 * error.
 */
export const GAME_RULES = {
  tictactoe: () => import("./tictactoe/Rules").then((module) => module.TicTacToeRules),
  caro: () => import("./caro/Rules").then((module) => module.CaroRules),
  ludo: () => import("./ludo/Rules").then((module) => module.LudoRules),
  chess: () => import("./chess/Rules").then((module) => module.ChessRules),
  "fence-race": () => import("./fence-race/Rules").then((module) => module.FenceRaceRules),
  "jelly-crew": () => import("./jelly-crew/Rules").then((module) => module.JellyCrewRules),
  "forbidden-triangle": () =>
    import("./forbidden-triangle/Rules").then((module) => module.ForbiddenTriangleRules),
} as const satisfies Readonly<Record<RegisteredGameId, () => Promise<GameRulesComponent>>>;
