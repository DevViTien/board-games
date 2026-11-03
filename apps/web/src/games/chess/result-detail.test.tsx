import type { GameResult } from "@board-games/engine";
import { chess, type ChessState } from "@board-games/games/chess";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { useChessResultDetail } from "./result-detail";
import { CLAIM, fromFen, played } from "./test-helpers";

function Detail({ state, result }: { state: ChessState; result: GameResult | null }) {
  const detail = useChessResultDetail();
  return <p>{result === null ? "none" : (detail(result, state) ?? "none")}</p>;
}

function detailOf(state: ChessState, result: GameResult | null = chess.result(state)) {
  renderWithIntl(<Detail state={state} result={result} />);
  return screen.getByRole("paragraph").textContent;
}

const THREEFOLD = played("g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8");

describe("useChessResultDetail", () => {
  it("Thắng bằng chiếu hết", () => {
    expect(detailOf(played("f2f3", "e7e5", "g2g4", "d8h4"))).toBe("Chiếu hết");
  });

  it("Hoà vì hết nước đi: names the side without a move", () => {
    expect(detailOf(fromFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"))).toBe(
      "Đen hết nước đi mà không bị chiếu",
    );
  });

  it("Hoà vì đòi theo luật 50 nước: names the side that claimed", () => {
    const state = chess.applyMove(fromFen("4k3/8/8/8/8/8/8/R3K3 w - - 100 80"), CLAIM);

    expect(detailOf(state)).toBe("Trắng đòi hoà theo luật 50 nước");
  });

  it("names the side that claimed a threefold repetition", () => {
    expect(detailOf(chess.applyMove(THREEFOLD, CLAIM))).toBe(
      "Trắng đòi hoà: thế cờ lặp lại ba lần",
    );
  });

  it("tells a draw by insufficient material", () => {
    expect(detailOf(fromFen("8/8/8/4k3/8/8/8/4K3 w - - 0 1"))).toBe(
      "Không bên nào đủ quân để chiếu hết",
    );
  });

  it.each([
    ["fivefold-repetition", "Thế cờ lặp lại năm lần"],
    ["seventy-five-move", "75 nước liền không đi Tốt, không ăn quân"],
  ])("tells the draw the game makes by itself: %s", (reason, words) => {
    expect(detailOf(played(), { kind: "draw", reason })).toBe(words);
  });

  it("says nothing of a reason it does not know", () => {
    expect(detailOf(played(), { kind: "draw" })).toBe("none");
  });
});
