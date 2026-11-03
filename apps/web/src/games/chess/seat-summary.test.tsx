import type { PlayerIndex } from "@board-games/engine";
import type { ChessState } from "@board-games/games/chess";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import { useChessSeatSummary } from "./seat-summary";
import { fromFen, played } from "./test-helpers";

function Summary({ state, player }: { state: ChessState; player: PlayerIndex }) {
  const summary = useChessSeatSummary()(player, state);
  return <p>{summary === null ? "none" : `${summary.full} | ${summary.short}`}</p>;
}

function summaryOf(state: ChessState, player: PlayerIndex, locale: Locale = "vi") {
  const { unmount } = renderWithIntl(<Summary state={state} player={player} />, { locale });
  const text = screen.getByRole("paragraph").textContent;
  unmount();
  return text;
}

describe("useChessSeatSummary", () => {
  it("Ván mới: nothing for either side", () => {
    expect(summaryOf(played(), 0)).toBe("none");
    expect(summaryOf(played(), 1)).toBe("none");
  });

  it("Hơn một Mã: White up a knight, 3 points; nothing for Black", () => {
    // 1. e4 Nf6 2. Nc3 Ng4 3. Qxg4
    const state = played("e2e4", "g8f6", "b1c3", "f6g4", "d1g4");

    expect(summaryOf(state, 0)).toBe("Hơn 3 điểm: Mã | +3");
    expect(summaryOf(state, 1)).toBe("none");
  });

  it("lists every kind of piece ahead, the larger first", () => {
    // White: a knight and five pawns; Black: three pawns.
    expect(summaryOf(fromFen("4k3/ppp5/8/8/8/8/PPPPP3/1N2K3 w - - 0 1"), 0)).toBe(
      "Hơn 5 điểm: Mã, 2 Tốt | +5",
    );
  });

  it("counts a promoted piece: a queen for a pawn", () => {
    const state = fromFen("4k3/p7/8/8/8/8/8/Q3K3 w - - 0 1");

    expect(summaryOf(state, 0)).toBe("Hơn 8 điểm: Hậu | +8");
    expect(summaryOf(state, 1)).toBe("none");
  });

  it("says nothing when the points are level, whatever the pieces", () => {
    // A bishop against a knight.
    const state = fromFen("4k3/8/8/8/8/2n5/8/2B1K3 w - - 0 1");

    expect(summaryOf(state, 0)).toBe("none");
    expect(summaryOf(state, 1)).toBe("none");
  });

  it("speaks English with plurals", () => {
    expect(summaryOf(fromFen("4k3/8/8/8/8/8/PP6/1N2K3 w - - 0 1"), 0, "en")).toBe(
      "Up 5 points: knight, 2 pawns | +5",
    );
  });
});
