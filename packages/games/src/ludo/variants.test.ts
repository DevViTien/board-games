import { createSession, currentState, parseGameOptions } from "@board-games/engine";
import { describeGameContract } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { IN_STABLE, LUDO_COLOUR, OWN_GATE } from "./constants";
import { targetOf } from "./moves";
import { LUDO_DEFAULT_OPTIONS, type LudoOptions } from "./options";
import { ludo } from "./rules";
import { position } from "./test-positions";
import { ludoVariantRules } from "./test-variants";
import { cellOf, progressAt } from "./track";

// The variants are played only through the test-only rules (design §3): M6 refuses them.
const S = IN_STABLE;
const rules = ludoVariantRules;

function variant(options: Partial<LudoOptions>): LudoOptions {
  const parsed = parseGameOptions(rules, { ...LUDO_DEFAULT_OPTIONS, ...options });
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

const horsesOf = (state: ReturnType<typeof position>) =>
  rules.legalMoves(state).map((move) => (move.type === "move" ? move.horse : -1));

describe("test-only variant rules", () => {
  it("accept every variant the real rules refuse", () => {
    const all = { exitRoll: "one-or-six", extraRoll: "none", passing: "free", oneJump: false };

    expect(parseGameOptions(rules, all)).toEqual({ ok: true, value: all });
    expect(parseGameOptions(ludo, all)).toEqual({ ok: false, error: "invalid-options" });
  });

  it("start a game with a variant through a session", () => {
    const created = createSession(rules, { playerCount: 2, options: variant({ oneJump: false }) });

    expect(created.ok && currentState(created.value).options.oneJump).toBe(false);
  });
});

describe("variant: exit on 1 or 6", () => {
  const options = variant({ exitRoll: "one-or-six" });

  it("brings a horse out on a 1, the horse on the track still jumping; the player chooses", () => {
    const state = position({ horses: { 0: [S, 4] }, die: 1, options });

    // Horses 0, 2 and 3 can come out; horse 1 jumps.
    expect(horsesOf(state)).toEqual([0, 1, 2, 3]);
    expect(targetOf(state, 0, 0, 1)).toBe(0);
    expect(targetOf(state, 0, 1, 1)).toBe(13);
  });

  it("still brings a horse out on a 6 and not on other faces", () => {
    const state = position({ horses: { 0: [S] }, options });

    expect(targetOf(state, 0, 0, 6)).toBe(0);
    expect(targetOf(state, 0, 0, 3)).toBeNull();
  });
});

describe("variant: no extra roll", () => {
  const options = variant({ extraRoll: "none" });

  it("passes the turn after a move with a 6", () => {
    const rolled = rules.applyMove(position({ options }), { type: "roll" }, 6);
    const moved = rules.applyMove(rolled, { type: "move", horse: 0 });

    expect(moved.toMove).toBe(1);
    expect(moved.last).toMatchObject({ again: false });
  });

  it("loses the turn on a 6 with no horse to move", () => {
    const state = position({ horses: { 0: [OWN_GATE - 3, 61, 60, 59] }, options });

    const rolled = rules.applyMove(state, { type: "roll" }, 6);

    expect(rolled.toMove).toBe(1);
    expect(rolled.last).toEqual({ kind: "roll", player: 0, face: 6, lost: true, again: false });
  });
});

describe("variant: passing allowed", () => {
  const options = variant({ passing: "free" });
  const blueAt = (redProgress: number) =>
    progressAt(LUDO_COLOUR.Blue, cellOf(LUDO_COLOUR.Red, redProgress));

  it("passes horses on the track, its own and the opponent's", () => {
    const state = position({ horses: { 0: [20, 21], 1: [blueAt(22)] }, options });

    expect(targetOf(state, 0, 0, 4)).toBe(24);
  });

  it("still never stops on its own horse", () => {
    const state = position({ horses: { 0: [20, 24] }, options });

    expect(targetOf(state, 0, 0, 4)).toBeNull();
  });

  it("passes horses in the home column, never stopping on a taken step", () => {
    const state = position({ horses: { 0: [OWN_GATE, OWN_GATE + 2] }, options });

    expect(targetOf(state, 0, 0, 4)).toBe(OWN_GATE + 4);
    expect(targetOf(state, 0, 0, 2)).toBeNull();
  });

  it("still needs a clear way to jump on a 1", () => {
    const state = position({ horses: { 0: [4], 1: [blueAt(7)] }, options });

    expect(targetOf(state, 0, 0, 1)).toBe(5);
  });
});

describe("variant: no jump on a 1", () => {
  const options = variant({ oneJump: false });

  it("moves one cell on a 1 with a clear way", () => {
    const state = position({ horses: { 0: [4] }, options });

    expect(targetOf(state, 0, 0, 1)).toBe(5);
  });
});

describeGameContract(ludoVariantRules, {
  seeds: [1, 2],
  maxPlies: 6000,
  options: { exitRoll: "one-or-six", extraRoll: "none", passing: "free", oneJump: false },
  playerCounts: [2, 3, 4],
  timeout: 60_000,
});
