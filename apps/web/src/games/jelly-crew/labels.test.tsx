import type { GameResult, PlayerIndex } from "@board-games/engine";
import {
  jellyCrew,
  jellyCrewLayout,
  type JellyCrewMove,
  type JellyCrewState,
} from "@board-games/games/jelly-crew";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import {
  useJellyCrewMoveLabel,
  useJellyCrewPlayerLabel,
  useJellyCrewResultDetail,
  useJellyCrewSeatSummary,
} from "./words";

const KITCHEN = jellyCrewLayout("kitchen", 2);
const at = (x: number, y: number) => y * KITCHEN.width + x;

function start(playerCount = 2): JellyCrewState {
  return jellyCrew.setup({ playerCount, options: { map: "kitchen" } });
}

function play(state: JellyCrewState, moves: readonly JellyCrewMove[]): JellyCrewState {
  return moves.reduce((current, move) => jellyCrew.applyMove(current, move), state);
}

function MoveLine({ move, state }: { move: JellyCrewMove; state: JellyCrewState }) {
  return <p>{useJellyCrewMoveLabel()(move, state)}</p>;
}

function PlayerLine({ player }: { player: PlayerIndex }) {
  return <p>{useJellyCrewPlayerLabel()(player)}</p>;
}

function SeatLine({ player, state }: { player: PlayerIndex; state: JellyCrewState }) {
  const summary = useJellyCrewSeatSummary()(player, state);
  return <p>{summary === null ? "-" : `${summary.full} | ${summary.short}`}</p>;
}

function ResultLine({ result, state }: { result: GameResult; state: JellyCrewState }) {
  return <p>{useJellyCrewResultDetail()(result, state)}</p>;
}

function line(element: React.JSX.Element, locale: Locale = "vi"): string | null {
  const { unmount } = renderWithIntl(element, { locale });
  const text = screen.getByRole("paragraph").textContent;
  unmount();
  return text;
}

/** The move just played, read from the state after it. */
function lastLine(state: JellyCrewState, locale: Locale = "vi") {
  const move = state.last?.move;
  if (move === undefined) throw new Error("No move played");
  return line(<MoveLine move={move} state={state} />, locale);
}

const SOLUTION: readonly JellyCrewMove[] = [
  "D",
  "end",
  "D",
  "D",
  "D",
  "L",
  "L",
  "end",
  "R",
  "R",
  "R",
  "R",
  "R",
  "end",
  "end",
  "R",
  "L",
  "L",
  "L",
  "L",
  "end",
  "R",
  "U",
  "U",
  "end",
  "D",
  "D",
  "end",
  "L",
  "L",
  "L",
  "L",
];

describe("Bảng người chơi của Đội gom thạch", () => {
  it("names the seats by their characters' colours", () => {
    expect([0, 1, 2, 3].map((player) => line(<PlayerLine player={player} />))).toEqual([
      "Lam",
      "Hồng",
      "Cam",
      "Ngọc",
    ]);
    expect(line(<PlayerLine player={1} />, "en")).toBe("Pink");
  });

  it("Ghế đang giữ nút: a seat on a plate says so, the others nothing", () => {
    const state = { ...start(), board: { ...KITCHEN.start, chars: [at(1, 1), at(15, 4)] } };

    expect(line(<SeatLine player={1} state={state} />)).toBe("Giữ nút ● | Giữ nút ●");
    expect(line(<SeatLine player={0} state={state} />)).toBe("-");
  });
});

describe("Đọc nước đi và kết quả", () => {
  it("reads a step, and a door opening with it", () => {
    expect(lastLine(play(start(), ["D"]))).toBe("đi xuống");
    // Hồng onto plate ●.
    expect(lastLine(play(start(), ["end", "D", "D", "D", "L", "L"]))).toBe(
      "đi sang trái, cửa ● mở",
    );
  });

  it("reads a push, and the molds when their count changes", () => {
    const pushed = play(start(), SOLUTION.slice(0, 9));
    expect(lastLine(pushed)).toBe("đẩy thạch dâu sang phải");
    const fitting = play(start(), SOLUTION.slice(0, 14));
    expect(lastLine(play(start(), SOLUTION.slice(0, 13)))).toBe(
      "đẩy thạch dâu sang phải, khuôn 1/4",
    );
    expect(lastLine(fitting)).toBe("xong lượt");
  });

  it("reads ending a turn, a step back and a reset", () => {
    expect(lastLine(play(start(), ["D", "end"]))).toBe("xong lượt");
    expect(lastLine(play(start(), ["D", "back"]))).toBe("lùi một bước");
    expect(lastLine(play(start(), ["D", "reset"]))).toBe("đặt lại bản đồ");
    expect(lastLine(play(start(), ["D", "end"]), "en")).toBe("ended the turn");
  });

  it("reads a turn ended while holding a plate", () => {
    const onPlate = play(start(), ["end", "D", "D", "D", "L", "L", "end"]);
    expect(lastLine(onPlate)).toBe("giữ nút ●, xong lượt");
  });

  it("Chi tiết khi thắng: the steps and rounds it took", () => {
    const won = play(start(), SOLUTION);
    const result = jellyCrew.result(won);
    if (result === null) throw new Error("Not won");
    expect(line(<ResultLine result={result} state={won} />)).toBe("Đầy khuôn sau 25 bước, 4 vòng.");
  });

  it("Chi tiết khi hết vòng: the rounds and the mold cells left empty", () => {
    const over = play(
      start(),
      Array.from({ length: KITCHEN.rounds * 2 }, (): JellyCrewMove => "end"),
    );
    const result = jellyCrew.result(over);
    if (result === null) throw new Error("Not over");
    expect(line(<ResultLine result={result} state={over} />)).toBe(
      `Hết ${String(KITCHEN.rounds)} vòng, còn 4 ô khuôn trống.`,
    );
  });
});
