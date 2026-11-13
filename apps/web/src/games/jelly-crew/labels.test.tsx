import type { GameResult, PlayerIndex } from "@board-games/engine";
import {
  jellyCrew,
  jellyCrewLayout,
  type JellyCrewMove,
  jellyCrewMove,
  type JellyCrewState,
} from "@board-games/games/jelly-crew";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";
import type { GameTime } from "@/transport/types";

import {
  isQuietMove,
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

function ResultLine({
  result,
  state,
  gameTime = null,
}: {
  result: GameResult;
  state: JellyCrewState;
  gameTime?: GameTime | null;
}) {
  return <p>{useJellyCrewResultDetail()(result, state, gameTime)}</p>;
}

function line(element: React.JSX.Element, locale: Locale = "vi"): string | null {
  const { unmount } = renderWithIntl(element, { locale });
  const text = screen.getByRole("paragraph").textContent;
  unmount();
  return text;
}

/** The move just played, read from the state after it. */
function lastLine(state: JellyCrewState, locale: Locale = "vi") {
  const last = state.last;
  if (last === null) throw new Error("No move played");
  return line(<MoveLine move={jellyCrewMove(last.seat, last.action)} state={state} />, locale);
}

describe("Bảng người chơi của Đội gom thạch", () => {
  it("names each seat by its character's colour", () => {
    expect([0, 1, 2, 3].map((player) => line(<PlayerLine player={player} />))).toEqual([
      "Lam",
      "Hồng",
      "Cam",
      "Ngọc",
    ]);
  });

  it("Ghế đang giữ nút: a seat on a plate says which", () => {
    const onPlate = play(start(), ["1D", "1D", "1D", "1L", "1L"]);
    expect(onPlate.board.chars[1]).toBe(at(15, 4));
    expect(line(<SeatLine player={1} state={onPlate} />)).toBe("Giữ nút ● | Giữ nút ●");
    expect(line(<SeatLine player={0} state={onPlate} />)).toBe("-");
  });
});

describe("Đọc nước đi và kết quả", () => {
  it("names the character of each move, and what it did", () => {
    expect(lastLine(play(start(), ["1L"]))).toBe("Hồng đi sang trái");
    expect(lastLine(play(start(), ["1D", "1D", "1D", "1L", "1L"]))).toBe(
      "Hồng đi sang trái, cửa ● mở",
    );
    expect(lastLine(play(start(), ["0D", "0R"]))).toBe("Lam đẩy thạch dâu sang phải");
    expect(lastLine(play(start(), ["0D", "1reset"]))).toBe("Hồng đặt lại bản đồ");
    expect(lastLine(play(start(), ["1L"]), "en")).toBe("Pink goes left");
  });

  it("tells a quiet step from one that did something", () => {
    expect(isQuietMove(play(start(), ["1L"]))).toBe(true);
    expect(isQuietMove(play(start(), ["0D", "0R"]))).toBe(false);
    expect(isQuietMove(play(start(), ["1D", "1D", "1D", "1L", "1L"]))).toBe(false);
    expect(isQuietMove(play(start(), ["0D", "0reset"]))).toBe(false);
    expect(isQuietMove(start())).toBe(false);
  });

  it("Chi tiết khi thắng: the steps and the time", () => {
    const won = { ...start(), steps: 87 };
    const result: GameResult = { kind: "win", winners: [0, 1], reason: "filled" };
    expect(
      line(
        <ResultLine
          result={result}
          state={won}
          gameTime={{ startedAt: 1000, endedAt: 1000 + (7 * 60 + 12) * 1000 }}
        />,
      ),
    ).toBe("Đầy khuôn sau 87 bước, 7 phút 12 giây.");
    expect(
      line(<ResultLine result={result} state={won} gameTime={{ startedAt: 0, endedAt: 45_000 }} />),
    ).toBe("Đầy khuôn sau 87 bước, 45 giây.");
    expect(
      line(
        <ResultLine result={result} state={won} gameTime={{ startedAt: 0, endedAt: 61_000 }} />,
        "en",
      ),
    ).toBe("Molds full after 87 steps, 1 minute 1 second.");
    // A game saved or a room made before the time was kept: the steps only.
    expect(line(<ResultLine result={result} state={won} />)).toBe("Đầy khuôn sau 87 bước.");
  });

  it("Chi tiết khi chạm giới hạn: the moves played", () => {
    const long = { ...start(), moves: 3000 };
    const result: GameResult = { kind: "draw", reason: "too-long" };
    expect(line(<ResultLine result={result} state={long} />)).toBe(
      "Đã đi 3.000 nước mà khuôn chưa đầy.",
    );
  });
});
