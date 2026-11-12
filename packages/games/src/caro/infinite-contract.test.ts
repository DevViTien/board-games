import { describeGameContract } from "@board-games/engine/testing";
import { describe } from "vitest";

import { CARO_INFINITE } from "./constants";
import { caro } from "./rules";

// A random game on the board that grows spreads towards the whole 61×61 cap (design §3), and the
// checks freeze every list of legal moves: the seeds are among the shortest of the first 60 (300
// and 320 moves, against a median of 923). In a file of its own, so it runs next to the others.
describe.each([
  ["blocked-ends", [35]],
  ["free", [27]],
] as const)("caro contract on the board that grows with the %s rule", (rule, seeds) => {
  describeGameContract(caro, {
    seeds,
    maxPlies: CARO_INFINITE.cap * CARO_INFINITE.cap,
    options: { size: "infinite", rule },
    timeout: 60_000,
  });
});
