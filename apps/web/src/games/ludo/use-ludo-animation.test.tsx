import {
  IN_STABLE,
  ludo,
  LUDO_COLOUR,
  LUDO_DEFAULT_OPTIONS,
  type LudoEvent,
  type LudoState,
} from "@board-games/games/ludo";
import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { AI_RESULT_DELAY_MS, AI_SETTLE_DELAY_MS } from "@/transport/ai-timing";

import { defaultBoardLayout } from "../types";
import { LudoBoard } from "./Board";
import { horsePoint } from "./board-layout";
import {
  LUDO_DICE_MS,
  LUDO_KICK_MS,
  LUDO_WALK_MAX_MS,
  LUDO_WALK_STEP_MS,
  walkPath,
} from "./use-ludo-animation";

/** Makes `prefers-reduced-motion: reduce` match or not; returns a way to change it later. */
function stubReducedMotion(reduce: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: reduce,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => query);
  return (next: boolean) => {
    query.matches = next;
    for (const listener of listeners) listener();
  };
}

/** A game where Red's horse 0 is at `redHorse`, after `ply` moves (the last of which did `last`). */
function state(
  redHorse: number,
  last: LudoEvent | null,
  toMove = 1,
  ply = last === null ? 0 : 1,
): LudoState {
  const start = ludo.setup({ playerCount: 2, options: LUDO_DEFAULT_OPTIONS });
  return {
    ...start,
    horses: [[redHorse, -1, -1, -1], start.horses[1] ?? []],
    ply,
    toMove,
    last,
  };
}

const redWalk = (from: number, to: number): Extract<LudoEvent, { kind: "move" }> => ({
  kind: "move",
  player: 0,
  horse: 0,
  face: 5,
  from,
  to,
  kicked: null,
  again: false,
});

function board(current: LudoState) {
  return (
    <LudoBoard
      state={current}
      legalMoves={ludo.legalMoves(current)}
      onMove={vi.fn()}
      disabled={false}
      result={null}
      lastEntry={null}
      viewer={null}
      layout={defaultBoardLayout}
    />
  );
}

/** Where the red horse is drawn, as "x,y". */
function redHorseAt(container: HTMLElement): string {
  const disc = container.querySelector('g[data-colour="red"] circle[r="0.38"]');
  return `${disc?.getAttribute("cx") ?? ""},${disc?.getAttribute("cy") ?? ""}`;
}

const at = (progress: number) => {
  const { x, y } = horsePoint(LUDO_COLOUR.Red, 0, progress);
  return `${x},${y}`;
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Hiệu ứng gieo và đi quân", () => {
  it("fit within the AI's pacing delays, so the AI never moves before one ends", () => {
    expect(LUDO_DICE_MS).toBeLessThanOrEqual(AI_RESULT_DELAY_MS);
    expect(LUDO_WALK_MAX_MS).toBeLessThanOrEqual(AI_SETTLE_DELAY_MS);
    expect(LUDO_KICK_MS).toBeLessThanOrEqual(AI_SETTLE_DELAY_MS);
  });

  it("walks a horse square by square, showing at most 8 squares of a long jump", () => {
    expect(walkPath(10, 15)).toEqual([11, 12, 13, 14, 15]);
    expect(walkPath(-1, 0)).toEqual([0]);
    const jump = walkPath(13, 27);
    expect(jump).toHaveLength(8);
    expect(jump.at(-1)).toBe(27);
  });

  it("walks the horse to its square, then stops", () => {
    stubReducedMotion(false);
    const { container, rerender } = renderWithIntl(board(state(10, null, 0)));
    // The position a board opens on is not animated.
    expect(redHorseAt(container)).toBe(at(10));

    rerender(board(state(15, redWalk(10, 15))));
    expect(redHorseAt(container)).toBe(at(11));
    act(() => {
      vi.advanceTimersByTime(LUDO_WALK_STEP_MS * 2);
    });
    expect(redHorseAt(container)).toBe(at(13));
    act(() => {
      vi.advanceTimersByTime(LUDO_WALK_MAX_MS);
    });
    expect(redHorseAt(container)).toBe(at(15));
  });

  it("Giảm chuyển động: the horse shows on its square at once", () => {
    stubReducedMotion(true);
    const { container, rerender } = renderWithIntl(board(state(10, null, 0)));

    rerender(board(state(15, redWalk(10, 15))));

    expect(redHorseAt(container)).toBe(at(15));
    expect(screen.getByRole("img", { name: /Xúc xắc/ })).not.toHaveClass("animate-dice-roll");
  });

  it("stops at once when reduced motion is turned on midway", () => {
    const setReduce = stubReducedMotion(false);
    const { container, rerender } = renderWithIntl(board(state(10, null, 0)));
    rerender(board(state(15, redWalk(10, 15))));
    expect(redHorseAt(container)).toBe(at(11));

    act(() => {
      setReduce(true);
    });

    expect(redHorseAt(container)).toBe(at(15));
  });

  it("Cập nhật mới giữa hiệu ứng: the walk ends at once and the die starts rolling", () => {
    stubReducedMotion(false);
    const { container, rerender } = renderWithIntl(board(state(10, null, 0)));
    rerender(board(state(15, redWalk(10, 15))));
    expect(redHorseAt(container)).toBe(at(11));

    const yellowRolled: LudoEvent = { kind: "roll", player: 1, face: 2, lost: true, again: false };
    rerender(board(state(15, yellowRolled, 0, 2)));

    expect(redHorseAt(container)).toBe(at(15));
    const die = screen.getByRole("img", { name: "Xúc xắc: 2 (Vàng)" });
    expect(die).toHaveClass("animate-dice-roll", "motion-reduce:animate-none");
    act(() => {
      vi.advanceTimersByTime(LUDO_DICE_MS);
    });
    expect(die).not.toHaveClass("animate-dice-roll");
  });

  it("Xúc xắc đang lăn khi mất lượt: the roller's die until it rests, then the next player's", () => {
    stubReducedMotion(false);
    const { rerender } = renderWithIntl(board(state(10, null, 0)));
    const redLost: LudoEvent = { kind: "roll", player: 0, face: 3, lost: true, again: false };

    // Red's 3 loses the turn: the rules already have Yellow to roll.
    rerender(board(state(IN_STABLE, redLost, 1)));

    const tumbling = screen.getByRole("img", { name: "Xúc xắc: 3 (Đỏ)" });
    expect(tumbling).toHaveAttribute("data-colour", "red");
    expect(tumbling).toHaveClass("animate-dice-roll");
    expect(screen.queryByText(/^Lượt trước/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(LUDO_DICE_MS);
    });

    const waiting = screen.getByRole("img", { name: "Xúc xắc: Vàng sắp gieo" });
    expect(waiting).toHaveAttribute("data-colour", "yellow");
    expect(screen.getByText("Lượt trước: Đỏ gieo được 3")).toBeInTheDocument();
  });

  it("does not replay a move on a return to it (undo): A → B → A shows A at rest", () => {
    stubReducedMotion(false);
    const moveA = state(15, redWalk(10, 15), 1, 1);
    const yellowRolled: LudoEvent = { kind: "roll", player: 1, face: 2, lost: true, again: false };
    const { container, rerender } = renderWithIntl(board(state(10, null, 0)));
    rerender(board(moveA));
    act(() => {
      vi.advanceTimersByTime(LUDO_WALK_MAX_MS);
    });
    rerender(board(state(15, yellowRolled, 0, 2)));
    expect(screen.getByRole("img", { name: /Xúc xắc/ })).toHaveClass("animate-dice-roll");

    // Undo: back to A, one move fewer.
    rerender(board(moveA));

    expect(redHorseAt(container)).toBe(at(15));
    // At rest, waiting for Yellow's roll.
    expect(screen.getByRole("img", { name: "Xúc xắc: Vàng sắp gieo" })).not.toHaveClass(
      "animate-dice-roll",
    );
    act(() => {
      vi.advanceTimersByTime(LUDO_WALK_STEP_MS);
    });
    expect(redHorseAt(container)).toBe(at(15));
  });

  it("animates two alike moves in a row, told apart by the number of moves", () => {
    stubReducedMotion(false);
    const rolled = (ply: number): LudoState => ({
      ...state(10, { kind: "roll", player: 0, face: 6, lost: false, again: true }, 0, ply),
    });
    const { rerender } = renderWithIntl(board(rolled(1)));
    rerender(board(rolled(2)));

    expect(screen.getByRole("img", { name: "Xúc xắc: 6 (Đỏ)" })).toHaveClass("animate-dice-roll");
  });

  it("never locks the board while it runs", () => {
    stubReducedMotion(false);
    const { rerender } = renderWithIntl(board(state(10, null, 0)));
    const redRolled: LudoEvent = { kind: "roll", player: 0, face: 4, lost: false, again: false };

    rerender(board({ ...state(10, redRolled, 0), die: 4 }));

    expect(screen.getByRole("img", { name: "Xúc xắc: 4 (Đỏ)" })).toHaveClass("animate-dice-roll");
    expect(screen.getByRole("button", { name: "Ngựa 1: tới ô 15" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("fades a kicked horse into its stable", () => {
    stubReducedMotion(false);
    const { container, rerender } = renderWithIntl(board(state(10, null, 0)));
    const kick: LudoEvent = { ...redWalk(10, 15), kicked: { player: 1, horse: 0, from: 43 } };

    rerender(board(state(15, kick)));

    const kicked = container.querySelector('g[data-colour="yellow"].animate-piece-kicked');
    expect(kicked).not.toBeNull();
    expect(kicked).toHaveClass("motion-reduce:animate-none");
    act(() => {
      vi.advanceTimersByTime(LUDO_KICK_MS);
    });
    expect(container.querySelector(".animate-piece-kicked")).toBeNull();
  });
});
