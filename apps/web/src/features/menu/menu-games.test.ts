import { describe, expect, it } from "vitest";

import { buildMenu, buildOptionChoices } from "./menu-games";

const tictactoe = {
  id: "tictactoe",
  meta: { players: { min: 2, max: 2 }, durationMinutes: 2 },
} as const;

describe("buildMenu", () => {
  it("puts registered games first, then planned games", () => {
    const menu = buildMenu({
      registered: [tictactoe],
      planned: [{ id: "chess", players: { min: 2, max: 2 }, durationMinutes: 20 }],
    });

    expect(menu.map((game) => [game.kind, game.id])).toEqual([
      ["playable", "tictactoe"],
      ["planned", "chess"],
    ]);
  });

  it("shows a planned game that now has rules only once, as playable", () => {
    const menu = buildMenu({
      registered: [tictactoe],
      planned: [
        { id: "tictactoe", players: { min: 2, max: 2 }, durationMinutes: 99 },
        { id: "caro", players: { min: 2, max: 2 }, durationMinutes: 5 },
      ],
    });

    expect(menu.map((game) => game.id)).toEqual(["tictactoe", "caro"]);
    expect(menu[0]).toEqual({
      kind: "playable",
      id: "tictactoe",
      players: { min: 2, max: 2 },
      durationMinutes: 2,
    });
  });

  it("builds the real menu from the registered and planned games", () => {
    expect(buildMenu().map((game) => [game.kind, game.id])).toEqual([
      ["playable", "tictactoe"],
      ["playable", "caro"],
      ["playable", "ludo"],
      ["playable", "chess"],
      ["playable", "fence-race"],
    ]);
  });
});

describe("buildOptionChoices", () => {
  it("lists the rule options of every registered game, as plain data", () => {
    const choices = buildOptionChoices();

    expect(choices).toEqual({
      tictactoe: { choices: [], defaults: {} },
      caro: {
        choices: [
          { name: "size", values: [15, 19] },
          { name: "rule", values: ["blocked-ends", "free"] },
        ],
        defaults: { size: 15, rule: "blocked-ends" },
      },
      // Cờ cá ngựa plays only its default rules in M6: nothing to choose.
      ludo: { choices: [], defaults: {} },
      chess: { choices: [], defaults: {} },
      "fence-race": { choices: [], defaults: {} },
    });
    expect(JSON.parse(JSON.stringify(choices))).toEqual(choices);
  });
});
