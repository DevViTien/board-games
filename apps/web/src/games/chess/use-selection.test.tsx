import { chess, type ChessMove, type ChessState } from "@board-games/games/chess";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fromFen, played } from "./test-helpers";
import { positionKey, useSelection } from "./use-selection";

interface Props {
  readonly state: ChessState;
  readonly legalMoves: readonly ChessMove[];
  readonly disabled: boolean;
}

const props = (state: ChessState, disabled = false): Props => ({
  state,
  legalMoves: chess.legalMoves(state),
  disabled,
});

function renderSelection(initial: Props) {
  return renderHook(
    ({ state, legalMoves, disabled }: Props) => useSelection(state, legalMoves, disabled),
    { initialProps: initial },
  );
}

const PROMOTE = fromFen("8/4P3/8/8/8/8/k7/4K3 w - - 0 1");

describe("positionKey", () => {
  it("is the position and the number of moves that led there", () => {
    expect(positionKey(played("e2e4"))).toBe(`${played("e2e4").fen}|1`);
  });
});

describe("useSelection", () => {
  it("groups the legal piece moves by their square", () => {
    const { result } = renderSelection(props(played()));

    expect(result.current.movesFrom.get("g1")?.map((move) => move.to)).toEqual(["f3", "h3"]);
    expect(result.current.movesFrom.has("a1")).toBe(false);
  });

  it("keeps the selection for the same position given as a new object", () => {
    const { result, rerender } = renderSelection(props(played()));
    act(() => {
      result.current.select("g1");
    });

    rerender(props(played()));

    expect(result.current.from).toBe("g1");
  });

  it("drops it when the board locks", () => {
    const { result, rerender } = renderSelection(props(played()));
    act(() => {
      result.current.select("g1");
    });

    rerender(props(played(), true));

    expect(result.current.from).toBeNull();
  });

  it("drops it when the position changes, by a move or by undoing one", () => {
    const { result, rerender } = renderSelection(props(played("e2e4", "e7e5")));
    act(() => {
      result.current.select("g1");
    });
    rerender(props(played("e2e4", "e7e5", "b1c3", "b8c6")));
    expect(result.current.from).toBeNull();

    act(() => {
      result.current.select("g1");
    });
    rerender(props(played("e2e4", "e7e5")));
    expect(result.current.from).toBeNull();
  });

  it("keeps a promotion while its moves are legal, and the pawn when it is cancelled", () => {
    const { result, rerender } = renderSelection(props(PROMOTE));
    act(() => {
      result.current.select("e7");
    });
    act(() => {
      result.current.askPromotion("e8");
    });
    expect(result.current.promotion).toEqual({ from: "e7", to: "e8" });

    rerender(props(fromFen(PROMOTE.fen)));
    expect(result.current.promotion).toEqual({ from: "e7", to: "e8" });

    act(() => {
      result.current.cancelPromotion();
    });
    expect(result.current.promotion).toBeNull();
    expect(result.current.from).toBe("e7");
  });

  it("closes a promotion whose moves are no longer legal", () => {
    const { result, rerender } = renderSelection(props(PROMOTE));
    act(() => {
      result.current.select("e7");
    });
    act(() => {
      result.current.askPromotion("e8");
    });

    rerender({ ...props(PROMOTE), legalMoves: [{ from: "e7", to: "e8" }] });

    expect(result.current.promotion).toBeNull();
    expect(result.current.from).toBe("e7");
  });
});
