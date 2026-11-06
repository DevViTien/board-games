import type { GameResult, PlayerIndex } from "@board-games/engine";
import {
  type Fence,
  fenceRace,
  type FenceRaceMove,
  type FenceRaceState,
} from "@board-games/games/fence-race";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import { useFenceRaceMoveLabel } from "./move-label";
import { useFenceRacePlayerLabel } from "./player-label";
import { useFenceRaceResultDetail } from "./result-detail";
import { useFenceRaceSeatSummary } from "./seat-summary";

function start(players: number): FenceRaceState {
  return fenceRace.setup({ playerCount: players, options: {} });
}

function SeatLine({ player, state }: { player: PlayerIndex; state: FenceRaceState }) {
  const summary = useFenceRaceSeatSummary()(player, state);
  return <p>{`${summary.full} | ${summary.short}`}</p>;
}

function MoveLine({ move, state }: { move: FenceRaceMove; state: FenceRaceState }) {
  return <p>{useFenceRaceMoveLabel()(move, state)}</p>;
}

function ResultLine({ result, state }: { result: GameResult; state: FenceRaceState }) {
  return <p>{useFenceRaceResultDetail()(result, state)}</p>;
}

function PlayerLine({ player, state }: { player: PlayerIndex; state: FenceRaceState }) {
  return <p>{useFenceRacePlayerLabel()(player, state)}</p>;
}

function line(element: React.JSX.Element, locale: Locale = "vi"): string | null {
  const { unmount } = renderWithIntl(element, { locale });
  const text = screen.getByRole("paragraph").textContent;
  unmount();
  return text;
}

/** The fence between rows 4 and 5 (from the bottom), columns C and D, on the two players' board. */
const ACROSS: Fence = { row: 6, col: 2, dir: "h" };
/** The fence between columns C and D, rows 10 and 11. */
const ALONG: Fence = { row: 0, col: 2, dir: "v" };

describe("useFenceRacePlayerLabel", () => {
  it("names the seats by their colours, in order", () => {
    const state = start(4);
    expect(line(<PlayerLine player={0} state={state} />)).toBe("Đỏ");
    expect(line(<PlayerLine player={1} state={state} />)).toBe("Xanh dương");
    expect(line(<PlayerLine player={2} state={state} />)).toBe("Vàng");
    expect(line(<PlayerLine player={3} state={state} />)).toBe("Xanh lá");
    expect(line(<PlayerLine player={1} state={state} />, "en")).toBe("Blue");
  });
});

describe("Bảng người chơi của Cờ rào", () => {
  it("Thông tin người chơi", () => {
    const state: FenceRaceState = {
      ...start(2),
      fencesLeft: [5, 9],
      breaksLeft: [0, 1],
      pawns: [
        { row: 7, col: 4 },
        { row: 0, col: 4 },
      ],
    };

    expect(line(<SeatLine player={0} state={state} />)).toBe(
      "5 rào · đã phá · 7 bước | 5 rào · đã phá · 7 bước",
    );
    expect(line(<SeatLine player={1} state={state} />)).toContain("9 rào · phá · 10 bước");
  });

  it("is the same length of line whoever's turn it is: it has no word about the turn", () => {
    const state = start(2);
    const mine = line(<SeatLine player={0} state={state} />);
    const later = line(<SeatLine player={0} state={{ ...state, toMove: 1 }} />);

    expect(later).toBe(mine);
  });

  it("is translated, with plurals", () => {
    const state: FenceRaceState = {
      ...start(2),
      fencesLeft: [1, 9],
      pawns: [
        { row: 1, col: 4 },
        { row: 0, col: 4 },
      ],
    };

    expect(line(<SeatLine player={0} state={state} />, "en")).toContain("1 fence · break · 1 step");
    expect(line(<SeatLine player={0} state={state} />, "ja")).toContain("柵1");
  });
});

describe("Đọc nước đi và kết quả", () => {
  it("Đọc nước đặt rào", () => {
    const move: FenceRaceMove = { kind: "fence", ...ACROSS };

    expect(line(<MoveLine move={move} state={start(2)} />)).toBe(
      "đặt rào giữa hàng 4 và 5, cột C–D",
    );
    expect(line(<MoveLine move={{ kind: "fence", ...ALONG }} state={start(2)} />)).toBe(
      "đặt rào giữa cột C và D, hàng 10–11",
    );
  });

  it("names a step and a break", () => {
    expect(line(<MoveLine move={{ kind: "step", row: 2, col: 4 }} state={start(2)} />)).toBe(
      "đi tới E9",
    );
    expect(line(<MoveLine move={{ kind: "break", ...ACROSS }} state={start(2)} />)).toBe(
      "phá rào giữa hàng 4 và 5, cột C–D",
    );
  });

  it("counts the rows of the board it is on", () => {
    expect(line(<MoveLine move={{ kind: "step", row: 2, col: 4 }} state={start(4)} />)).toBe(
      "đi tới E7",
    );
  });

  it("Kết quả hết lượt", () => {
    const state: FenceRaceState = {
      ...start(2),
      moveCount: 200,
      pawns: [
        { row: 5, col: 4 },
        { row: 3, col: 4 },
      ],
    };
    const result: GameResult = { kind: "win", winners: [0], reason: "turn-limit" };

    expect(line(<ResultLine result={result} state={state} />)).toBe(
      "Đỏ gần đích hơn khi hết 200 nước: còn 5 bước, Xanh dương còn 7.",
    );
  });

  it("says a draw at the limit, with three players its limit of 198", () => {
    const state: FenceRaceState = {
      ...start(3),
      moveCount: 198,
      pawns: [
        { row: 3, col: 4 },
        { row: 5, col: 4 },
        { row: 4, col: 0 },
      ],
    };
    const result: GameResult = { kind: "draw", reason: "turn-limit" };

    expect(line(<ResultLine result={result} state={state} />)).toBe(
      "Hết 198 nước, Đỏ và Xanh dương cùng còn 3 bước về đích.",
    );
  });

  it("says where a winner reached the gate, after how many moves", () => {
    const state: FenceRaceState = {
      ...start(2),
      moveCount: 41,
      pawns: [
        { row: 0, col: 3 },
        { row: 5, col: 4 },
      ],
    };
    const result: GameResult = { kind: "win", winners: [0], reason: "goal" };

    expect(line(<ResultLine result={result} state={state} />)).toBe(
      "Đỏ về đích ở ô D11 sau 41 nước.",
    );
  });

  it("is translated, in English and Japanese", () => {
    const state: FenceRaceState = {
      ...start(2),
      moveCount: 200,
      pawns: [
        { row: 5, col: 4 },
        { row: 3, col: 4 },
      ],
    };
    const result: GameResult = { kind: "win", winners: [0], reason: "turn-limit" };

    expect(line(<ResultLine result={result} state={state} />, "en")).toContain("Red");
    expect(line(<ResultLine result={result} state={state} />, "ja")).toContain("赤");
  });
});
