import { describeGameContract } from "@board-games/engine/testing";

import { ludo } from "./rules";

// Random games of 2–4 players with the default rules. A game is several hundred moves long and
// every check replays its seeds through sessions (about 2 s for the file), so a few seeds only: the
// thousand games of `termination.test.ts` cover the rest.
describeGameContract(ludo, {
  seeds: [1, 2, 3, 4],
  maxPlies: 6000,
  playerCounts: [2, 3, 4],
  timeout: 60_000,
});
