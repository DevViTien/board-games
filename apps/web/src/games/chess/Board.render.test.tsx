import { chess, type ChessState } from "@board-games/games/chess";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { defaultBoardLayout } from "../types";
import { ChessBoard } from "./Board";
import type * as Pieces from "./pieces";
import { played, uci } from "./test-helpers";

// Each square is memoised with plain values: a move re-renders the squares that changed, and an
// update of the room that keeps the position re-renders none. Counted by the pieces drawn.

const drawn = vi.hoisted(() => ({ count: 0 }));

vi.mock("./pieces", async (importOriginal) => {
  const actual = await importOriginal<typeof Pieces>();
  return {
    ...actual,
    ChessPiece: (props: Parameters<typeof actual.ChessPiece>[0]) => {
      drawn.count += 1;
      return actual.ChessPiece(props);
    },
  };
});

function board(state: ChessState, last: string | null = null) {
  return (
    <ChessBoard
      state={state}
      legalMoves={chess.legalMoves(state)}
      onMove={vi.fn()}
      disabled={false}
      result={null}
      lastEntry={last === null ? null : { move: uci(last) }}
      viewer={null}
      layout={defaultBoardLayout}
    />
  );
}

describe("ChessBoard re-renders", () => {
  it("draws no piece again when the room sends the same position as a new object", () => {
    const { rerender } = renderWithIntl(board(played("e2e4"), "e2e4"));
    drawn.count = 0;

    rerender(board(played("e2e4"), "e2e4"));

    expect(drawn.count).toBe(0);
  });

  it("draws again only the squares a move changed", () => {
    const { rerender } = renderWithIntl(board(played("e2e4"), "e2e4"));
    drawn.count = 0;

    rerender(board(played("e2e4", "e7e5"), "e7e5"));

    // e5 (the pawn arrived), e4 (its tab stop and last-move mark went away); at most a few more.
    expect(drawn.count).toBeGreaterThan(0);
    expect(drawn.count).toBeLessThanOrEqual(4);
  });
});
