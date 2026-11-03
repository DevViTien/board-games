import type { ChessMove, ChessState } from "@board-games/games/chess";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import { useChessMoveLabel } from "./move-label";
import { useChessPlayerLabel } from "./player-label";
import { CLAIM, fromFen, played, playedFrom, uci } from "./test-helpers";

function Label({ move, state }: { move: ChessMove; state: ChessState }) {
  const label = useChessMoveLabel();
  return <p>{label(move, state)}</p>;
}

/** The label of the last of `moves` (UCI), played from `from`. */
function labelOf(moves: readonly string[], locale: Locale = "vi", from = played()) {
  const last = moves.at(-1) ?? "";
  renderWithIntl(<Label move={uci(last)} state={playedFrom(from, ...moves)} />, { locale });
  return screen.getByRole("paragraph").textContent;
}

describe("useChessMoveLabel", () => {
  it("reads a quiet move by its piece and squares", () => {
    expect(labelOf(["g1f3"])).toBe("đi Mã g1 tới f3");
  });

  it("reads a capture with check", () => {
    expect(labelOf(["e2e4", "e7e5", "d1h5", "b8c6", "h5f7"])).toBe("đi Hậu h5 ăn quân ở f7, chiếu");
  });

  it("reads castling on the king's side", () => {
    expect(labelOf(["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "e1g1"])).toBe(
      "nhập thành cánh vua",
    );
  });

  it("reads castling on the queen's side", () => {
    expect(labelOf(["d2d4", "d7d5", "b1c3", "b8c6", "c1f4", "c8f5", "d1d2", "d8d7", "e1c1"])).toBe(
      "nhập thành cánh hậu",
    );
  });

  it("reads a promotion", () => {
    expect(labelOf(["e7e8q"], "vi", fromFen("8/4P3/8/8/8/8/k7/4K3 w - - 0 1"))).toBe(
      "đi Tốt e7 tới e8, phong Hậu",
    );
  });

  it("reads a checkmate", () => {
    expect(labelOf(["f2f3", "e7e5", "g2g4", "d8h4"])).toBe("đi Hậu d8 tới h4, chiếu hết");
  });

  it("reads an en passant capture as a capture", () => {
    expect(labelOf(["e2e4", "a7a6", "e4e5", "d7d5", "e5d6"])).toBe("đi Tốt e5 ăn quân ở d6");
  });

  it("reads a claimed draw", () => {
    renderWithIntl(<Label move={CLAIM} state={played()} />);

    expect(screen.getByRole("paragraph")).toHaveTextContent("đòi hoà");
  });

  it("reads in English", () => {
    expect(labelOf(["e2e4", "e7e5", "d1h5", "b8c6", "h5f7"], "en")).toBe(
      "took on f7 with the queen from h5, check",
    );
  });

  it("reads in Japanese", () => {
    expect(labelOf(["g1f3"], "ja")).toBe("ナイトをg1からf3へ動かしました");
  });
});

describe("useChessPlayerLabel", () => {
  function Labels() {
    const label = useChessPlayerLabel();
    return <p>{`${label(0)} ${label(1)}`}</p>;
  }

  it("names the seats White and Black", () => {
    renderWithIntl(<Labels />);

    expect(screen.getByRole("paragraph")).toHaveTextContent("Trắng Đen");
  });
});
