import { describe, expect, it } from "vitest";

import {
  addRound,
  type CardScoreGroup,
  type CardScorePlayer,
  createGroup,
  restPlayer,
} from "./group";
import { settlements, standings, summaryText, type SummaryWords } from "./summary";

const NOW = new Date("2026-11-07T12:00:00.000Z");

function played(
  names: readonly string[],
  rounds: readonly Readonly<Record<string, number>>[],
): CardScoreGroup {
  let group = createGroup({ id: "g", name: "", playerNames: names }, NOW);
  rounds.forEach((scores, index) => {
    group = addRound(group, { id: `r${index}`, scores }, NOW);
  });
  return group;
}

const FOUR = ["Lan", "Minh", "Hùng", "Tú"];
const player = (name: string): CardScorePlayer => ({ id: name, name, active: true });
const totals = (entries: readonly (readonly [string, number])[]) =>
  entries.map(([name, total]) => ({ player: player(name), total }));

describe("standings", () => {
  it("Bằng điểm: the same place, and the next one skipped", () => {
    const table = standings(played(FOUR, [{ p1: 20, p2: 20, p3: -15, p4: -25 }]));
    expect(table.map(({ player: p, place, total }) => [p.name, place, total])).toEqual([
      ["Lan", 1, 20],
      ["Minh", 1, 20],
      ["Hùng", 3, -15],
      ["Tú", 4, -25],
    ]);
  });

  it("Chưa có ván: everyone first, at 0, in the group's order", () => {
    const table = standings(played(FOUR, []));
    expect(table.map(({ player: p }) => p.name)).toEqual(FOUR);
    expect(table.every(({ place, total, wins }) => place === 1 && total === 0 && wins === 0)).toBe(
      true,
    );
  });

  it("Ván nhất có người bằng điểm: each one counts", () => {
    const table = standings(
      played(FOUR, [
        { p1: 10, p2: 10, p3: -20 },
        { p1: 5, p2: -5 },
      ]),
    );
    expect(table.find(({ player: p }) => p.name === "Lan")?.wins).toBe(2);
    expect(table.find(({ player: p }) => p.name === "Minh")?.wins).toBe(1);
    expect(table.find(({ player: p }) => p.name === "Hùng")?.wins).toBe(0);
  });

  it("Ván toàn 0: nobody", () => {
    const table = standings(played(FOUR, [{ p1: 0, p2: 0, p3: 0, p4: 0 }]));
    expect(table.every(({ wins }) => wins === 0)).toBe(true);
  });

  it("those resting stay in the table", () => {
    const group = restPlayer(played(FOUR, [{ p1: 40, p4: -40 }]), "p4", NOW);
    expect(standings(group).at(-1)).toMatchObject({ total: -40, player: { active: false } });
  });
});

describe("settlements", () => {
  it("Cân điểm bốn người", () => {
    const moves = settlements(
      totals([
        ["Lan", 120],
        ["Minh", 30],
        ["Hùng", -50],
        ["Tú", -100],
      ]),
    );
    expect(moves.map(({ from, to, amount }) => [from.name, to.name, amount])).toEqual([
      ["Tú", "Lan", 100],
      ["Hùng", "Minh", 30],
      ["Hùng", "Lan", 20],
    ]);
  });

  it("Người đã nghỉ vẫn được tính", () => {
    const group = restPlayer(played(FOUR, [{ p1: 40, p4: -40 }]), "p4", NOW);
    expect(settlements(standings(group)).map((m) => [m.from.name, m.to.name, m.amount])).toEqual([
      ["Tú", "Lan", 40],
    ]);
  });

  it("Đã cân", () => {
    expect(settlements(standings(played(FOUR, [])))).toEqual([]);
  });

  it("ties go by the order given", () => {
    const moves = settlements(
      totals([
        ["A", 10],
        ["B", 10],
        ["C", -10],
        ["D", -10],
      ]),
    );
    expect(moves.map((m) => `${m.from.name}${m.to.name}`)).toEqual(["CA", "DB"]);
  });

  it("totals that do not add up to 0 still end, with no move of nothing", () => {
    const moves = settlements(
      totals([
        ["A", 30],
        ["B", -10],
      ]),
    );
    expect(moves.map((m) => m.amount)).toEqual([10]);
    expect(settlements(totals([["A", 30]]))).toEqual([]);
    expect(settlements(totals([["B", -30]]))).toEqual([]);
  });

  it("any totals: everyone reaches 0, in at most one move fewer than those not at 0", () => {
    // A small seeded generator: the same cases on every run.
    let seed = 12345;
    const next = (limit: number) => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed % limit;
    };
    for (let round = 0; round < 500; round += 1) {
      const count = 2 + next(7);
      const values = Array.from({ length: count - 1 }, () => next(2001) - 1000);
      values.push(-values.reduce((sum, value) => sum + value, 0));
      const given = totals(values.map((value, index) => [`p${index}`, value] as const));

      const moves = settlements(given);
      const left = new Map(values.map((value, index) => [`p${index}`, value]));
      for (const { from, to, amount } of moves) {
        expect(amount).toBeGreaterThan(0);
        left.set(from.name, (left.get(from.name) ?? 0) + amount);
        left.set(to.name, (left.get(to.name) ?? 0) - amount);
      }
      expect([...left.values()].every((value) => value === 0)).toBe(true);
      const notAtZero = values.filter((value) => value !== 0).length;
      expect(moves.length).toBeLessThanOrEqual(Math.max(0, notAtZero - 1));
    }
  });
});

describe("summaryText", () => {
  const WORDS: SummaryWords = {
    header: (name, date, rounds) => `${name} · ${date} · ${rounds} ván`,
    standing: (place, name, total) => `${place}. ${name}: ${total}`,
    settlementsTitle: () => "Cân điểm:",
    settlement: (from, to, amount) => `${from} → ${to}: ${amount} điểm`,
    formatScore: (score) => (score > 0 ? `+${score}` : `${score}`),
  };

  it("Nội dung tổng kết: the head, the table, then who moves what", () => {
    const group = played(FOUR, [{ p1: 120, p2: 30, p3: -50, p4: -100 }]);
    expect(summaryText(group, "Team Dev", "07/11/2026", standings(group), WORDS)).toBe(
      [
        "Team Dev · 07/11/2026 · 1 ván",
        "1. Lan: +120",
        "2. Minh: +30",
        "3. Hùng: -50",
        "4. Tú: -100",
        "",
        "Cân điểm:",
        "Tú → Lan: 100 điểm",
        "Hùng → Minh: 30 điểm",
        "Hùng → Lan: 20 điểm",
      ].join("\n"),
    );
  });

  it("nothing to move, no such part", () => {
    const group = played(["Lan", "Minh"], [{ p1: 0, p2: 0 }]);
    expect(summaryText(group, "Lan, Minh", "07/11/2026", standings(group), WORDS)).toBe(
      ["Lan, Minh · 07/11/2026 · 1 ván", "1. Lan: 0", "1. Minh: 0"].join("\n"),
    );
  });
});
