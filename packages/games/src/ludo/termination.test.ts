import { fromRecord, RECORD_VERSION } from "@board-games/engine";
import { describe, expect, it } from "vitest";

import { DIE_FACES } from "./constants";
import { targetOf, trackOccupancy } from "./moves";
import { LUDO_DEFAULT_OPTIONS, type LudoOptions } from "./options";
import { ludo, type LudoState } from "./rules";
import { selfPlay } from "./self-play";
import { ludoVariantRules } from "./test-variants";

// Design §5: every random game ends with a winner, and nobody is ever frozen. A state-only loop
// (`self-play.ts`), not sessions, keeps a thousand games within the file's budget of 15 s.

/** About five times the longest game measured (2,104 moves, 4 players). */
const MAX_PLIES = 10_000;
const GAMES = 1000;
const VARIANT_GAMES = 100;
const PLAYER_COUNTS = [2, 3, 4] as const;
const VARIANTS: readonly Partial<LudoOptions>[] = [
  { exitRoll: "one-or-six" },
  { extraRoll: "none" },
  { passing: "free" },
  { oneJump: false },
];

/** Whether some face lets the player to move move a horse. */
function someFaceMoves(state: LudoState): boolean {
  const horses = state.horses[state.toMove] ?? [];
  const occupancy = trackOccupancy(state);
  return DIE_FACES.some((face) =>
    horses.some(
      (_progress, horse) => targetOf(state, state.toMove, horse, face, occupancy) !== null,
    ),
  );
}

describe("Ván luôn đi tiếp và kết thúc", { timeout: 60_000 }, () => {
  it(`Mọi ván tự chơi đều kết thúc: ${GAMES} seeded games of 2, 3 and 4 players; Không ai bị kẹt`, () => {
    const lengths: Record<number, number[]> = { 2: [], 3: [], 4: [] };
    let frozen = 0;
    let longest = { plies: 0, seed: 0, players: 2 as 2 | 3 | 4 };
    for (let seed = 1; seed <= GAMES; seed += 1) {
      const players = PLAYER_COUNTS[seed % PLAYER_COUNTS.length] ?? 2;
      const game = selfPlay(ludo, {
        seed,
        players,
        maxPlies: MAX_PLIES,
        options: LUDO_DEFAULT_OPTIONS,
        onRollAwaited: (state) => {
          if (!someFaceMoves(state)) frozen += 1;
        },
      });
      expect(game.stuck, `seed ${seed}`).toBe(false);
      expect(game.winner, `seed ${seed} (${players} players, ${game.plies} moves)`).not.toBeNull();
      lengths[players]?.push(game.plies);
      if (game.plies > longest.plies) longest = { plies: game.plies, seed, players };
    }
    expect(frozen).toBe(0);

    // The numbers recorded in design §5 and §7.
    const longestGame = selfPlay(ludo, {
      seed: longest.seed,
      players: longest.players,
      maxPlies: MAX_PLIES,
      options: LUDO_DEFAULT_OPTIONS,
    });
    const record = {
      version: RECORD_VERSION,
      gameId: ludo.id,
      playerCount: longest.players,
      options: LUDO_DEFAULT_OPTIONS,
      entries: longestGame.entries,
    };
    const started = performance.now();
    const rebuilt = fromRecord(ludo, JSON.parse(JSON.stringify(record)));
    const rebuildMs = performance.now() - started;
    expect(rebuilt.ok).toBe(true);
    const summary = PLAYER_COUNTS.map((players) => {
      const all = lengths[players] ?? [];
      const mean = Math.round(all.reduce((sum, plies) => sum + plies, 0) / all.length);
      return `${players} players: mean ${mean}, max ${Math.max(...all)} moves`;
    });
    console.info(
      `[ludo self-play] ${summary.join("; ")}; longest record ${JSON.stringify(record).length} bytes, fromRecord ${rebuildMs.toFixed(1)} ms`,
    );
  });

  it.each(VARIANTS)(
    `Mọi ván tự chơi đều kết thúc with the variant %o (${VARIANT_GAMES} games)`,
    (variant) => {
      for (let seed = 1; seed <= VARIANT_GAMES; seed += 1) {
        const players = PLAYER_COUNTS[seed % PLAYER_COUNTS.length] ?? 2;
        const game = selfPlay(ludoVariantRules, {
          seed,
          players,
          maxPlies: MAX_PLIES,
          options: { ...LUDO_DEFAULT_OPTIONS, ...variant },
        });
        expect(game.winner, `seed ${seed} (${players} players)`).not.toBeNull();
      }
    },
  );
});
