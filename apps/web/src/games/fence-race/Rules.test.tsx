import { fenceRace, fenceRaceDistance, type FenceRaceState } from "@board-games/games/fence-race";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import { FenceRaceRules } from "./Rules";
import { BREAK_FIGURE, BREAK_STEPS, GATE_FIGURE, SEALED_FIGURE } from "./rules/figures";

function sectionOf(title: string): HTMLElement {
  const section = screen.getByRole("heading", { level: 2, name: title }).closest("section");
  if (section === null) throw new Error(`No section for ${title}`);
  return section;
}

describe("Luật Cờ rào", () => {
  it("Nêu đủ cỡ bàn và số rào", () => {
    renderWithIntl(<FenceRaceRules t={rulesTranslator()} place="page" />);

    const board = sectionOf("Bàn và số rào");
    expect(board).toHaveTextContent("Hai người: bàn 11 hàng × 9 cột, mỗi người 9 rào.");
    expect(board).toHaveTextContent("Ba người: bàn 9 × 9, mỗi người 6 rào.");
    expect(board).toHaveTextContent("Bốn người: bàn 9 × 9, mỗi người 4 rào.");
  });

  it("names the goal: five cells, in the middle of the opposite edge, and the edge's others do not count", () => {
    renderWithIntl(<FenceRaceRules t={rulesTranslator()} place="page" />);

    const goal = sectionOf("Mục tiêu");
    expect(goal).toHaveTextContent(/5 ô giữa của cạnh đối diện/);
    expect(goal).toHaveTextContent(/không tính/);
    expect(within(goal).getByRole("figure")).toBeInTheDocument();
  });

  it("says the three things of a turn, sharing a cell, and no jumping", () => {
    renderWithIntl(<FenceRaceRules t={rulesTranslator()} place="page" />);

    const turn = sectionOf("Mỗi lượt một việc");
    expect(turn).toHaveTextContent(/đi quân một ô, đặt một rào, hoặc phá một rào/);
    expect(turn).toHaveTextContent(/đứng chung ô và không nhảy qua nhau/);
  });

  it("says a fence is two cells long, does not overlap or cross", () => {
    renderWithIntl(<FenceRaceRules t={rulesTranslator()} place="page" />);

    const place = sectionOf("Đặt rào");
    expect(place).toHaveTextContent(/hai ô/);
    expect(place).toHaveTextContent(/không được đè lên rào khác/);
    expect(place).toHaveTextContent(/không được cắt ngang rào khác/);
    expect(within(place).getByRole("figure")).toBeInTheDocument();
  });

  it("Hình rào bị cấm", () => {
    renderWithIntl(<FenceRaceRules t={rulesTranslator()} place="page" />);

    const figure = within(sectionOf("Luôn còn đường về đích")).getByRole("figure");
    expect(within(figure).getByRole("img")).toHaveAccessibleName(/bị cấm vì bịt kín đường/);
    expect(figure).toHaveTextContent(/bịt kín đường của nó nên bị cấm/);
    expect(figure.querySelector("[data-preview='bad']")).not.toBeNull();
  });

  it("Luật phá rào", () => {
    renderWithIntl(<FenceRaceRules t={rulesTranslator()} place="page" />);

    const section = sectionOf("Phá rào");
    expect(section).toHaveTextContent(/một lần/);
    expect(section).toHaveTextContent(/bất kỳ ai/);
    expect(section).toHaveTextContent(/không trả lại cho ai/);
    const figure = within(section).getByRole("figure");
    expect(figure).toHaveTextContent(
      `đường từ ${BREAK_STEPS.before} còn ${BREAK_STEPS.after} bước`,
    );
    expect(figure.querySelector("[data-chosen]")).not.toBeNull();
    expect(figure.querySelector("[data-gone]")).not.toBeNull();
  });

  it("says the limit of moves, with three players its own", () => {
    renderWithIntl(<FenceRaceRules t={rulesTranslator()} place="page" />);

    const end = sectionOf("Kết thúc ván");
    expect(end).toHaveTextContent(/200 nước/);
    expect(end).toHaveTextContent(/198 nước khi ba người/);
  });

  it("Máy chơi thay trên trang Cờ rào", () => {
    renderWithIntl(<FenceRaceRules t={rulesTranslator()} place="page" />);

    const leaving = sectionOf("Đầu hàng và bỏ ván");
    expect(leaving).toHaveTextContent(/máy chơi thay/);
    expect(leaving).toHaveTextContent(/“Máy chơi thay”/);
    expect(leaving).toHaveTextContent(/Phòng 2 người: ván kết thúc/);
  });
});

/** A board of the size of a figure, for the rules to count on: the two ways there are real. */
function figureBoard(
  rows: number,
  columns: number,
  pawns: FenceRaceState["pawns"],
  fences: FenceRaceState["fences"],
): FenceRaceState {
  return {
    ...fenceRace.setup({ playerCount: 2, options: {} }),
    rows,
    columns,
    pawns,
    fences,
  };
}

describe("the figures are real positions", () => {
  it("the gate: the pawn in column B is one step from it, along the edge", () => {
    // Seat 0 goes for the top edge; the 11 × 9 board has the same top edge as the figure.
    const state = fenceRace.setup({ playerCount: 2, options: {} });
    const pawn = { row: GATE_FIGURE.pawn.row, col: GATE_FIGURE.pawn.col };

    expect(fenceRaceDistance({ ...state, pawns: [pawn, { row: 5, col: 4 }] }, 0)).toBe(1);
  });

  it("the sealed way: the way drawn is the shortest, and the fence would close it", () => {
    const { rows, columns, fences, forbidden, pawn, way } = SEALED_FIGURE;
    // In the figure the seat goes to the bottom edge of a 4 × 5 board: every cell of it is its gate.
    const other = { row: 0, col: 0 };
    const state = figureBoard(rows, columns, [other, pawn], fences);

    expect(way[0]).toEqual(pawn);
    const toBottom = way.length - 1;
    expect(fenceRaceDistance(state, 1)).toBeLessThanOrEqual(toBottom);
    const closed = { ...state, fences: [...fences, forbidden] };
    expect(fenceRaceDistance(closed, 1)).toBe(-1);
  });

  it("the break: the two ways are as long as the words say", () => {
    const { rows, columns, broken, others, pawn, wayBefore, wayAfter } = BREAK_FIGURE;
    // In the figure the seat goes to the top edge of a 5 × 5 board.
    const other = { row: 0, col: 0 };
    const before = figureBoard(rows, columns, [pawn, other], [broken, ...others]);
    const after = figureBoard(rows, columns, [pawn, other], others);

    expect(wayBefore.length - 1).toBe(BREAK_STEPS.before);
    expect(wayAfter.length - 1).toBe(BREAK_STEPS.after);
    expect(fenceRaceDistance(before, 0)).toBe(BREAK_STEPS.before);
    expect(fenceRaceDistance(after, 0)).toBe(BREAK_STEPS.after);
  });
});
