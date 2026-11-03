import {
  IN_STABLE,
  ludo,
  LUDO_DEFAULT_OPTIONS,
  type LudoEvent,
  type LudoMove,
  type LudoState,
  OWN_GATE,
} from "@board-games/games/ludo";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import { useLudoMoveLabel } from "./move-label";
import { useLudoPlayerLabel } from "./player-label";

function game(players: 2 | 3 | 4): LudoState {
  return ludo.setup({ playerCount: players, options: LUDO_DEFAULT_OPTIONS });
}

/** A state after a move that did `last`. */
function after(last: LudoEvent, players: 2 | 3 | 4 = 4): LudoState {
  return { ...game(players), last };
}

const ROLL: LudoMove = { type: "roll" };
const roll = (face: 1 | 2 | 3 | 4 | 5 | 6, lost = false, again = false): LudoEvent => ({
  kind: "roll",
  player: 1,
  face,
  lost,
  again,
});
const horseMove = (
  from: number,
  to: number,
  kicked: { player: number; horse: number; from: number } | null = null,
): LudoEvent => ({ kind: "move", player: 1, horse: 1, face: 3, from, to, kicked, again: false });

function MoveLabel({ state }: { state: LudoState }) {
  const label = useLudoMoveLabel();
  return <p>{label(ROLL, state)}</p>;
}

function PlayerLabels({ state }: { state: LudoState }) {
  const label = useLudoPlayerLabel();
  return <p>{state.colours.map((_colour, seat) => label(seat, state)).join(" ")}</p>;
}

describe("Nhãn nước đi Cờ cá ngựa", () => {
  it.each<[string, LudoEvent, Record<Locale, string>]>([
    ["a roll", roll(5), { vi: "gieo được 5", en: "rolled 5", ja: "5を出しました" }],
    [
      "a roll that lost the turn",
      roll(3, true),
      {
        vi: "gieo được 3, mất lượt",
        en: "rolled 3 and lost the turn",
        ja: "3を出し、手番を失いました",
      },
    ],
    [
      "a 6 that moved nothing (Máy gieo 6 không đi được)",
      roll(6, false, true),
      {
        vi: "gieo được 6, không đi được, được gieo thêm",
        en: "rolled 6, could not move and rolls again",
        ja: "6を出しましたが動かせず、もう一度振ります",
      },
    ],
    [
      "a horse brought out",
      horseMove(IN_STABLE, 0),
      { vi: "cho ngựa 2 ra chuồng", en: "brought horse 2 out", ja: "駒2を陣地から出しました" },
    ],
    [
      "a horse moved to a square",
      horseMove(10, 16),
      {
        vi: "đi ngựa 2 tới ô 17",
        en: "moved horse 2 to square 17",
        ja: "駒2を17マス目へ進めました",
      },
    ],
    [
      "a horse moved to its home entry",
      horseMove(45, OWN_GATE),
      {
        vi: "đi ngựa 2 tới chân chuồng",
        en: "moved horse 2 to the home entry",
        ja: "駒2をゴール入口へ進めました",
      },
    ],
    [
      "a horse moved up a home step",
      horseMove(OWN_GATE + 3, OWN_GATE + 4),
      {
        vi: "đi ngựa 2 lên bậc 4",
        en: "moved horse 2 up to home step 4",
        ja: "駒2をゴールの4段目へ進めました",
      },
    ],
    [
      "a kick",
      horseMove(10, 16, { player: 0, horse: 2, from: 30 }),
      {
        vi: "đi ngựa 2 tới ô 17, đá ngựa Đỏ",
        en: "moved horse 2 to square 17, sending a Red horse home",
        ja: "駒2を17マス目へ進めました。赤の駒を陣地に戻しました",
      },
    ],
  ])("reads %s in three languages", (_what, last, texts) => {
    for (const locale of ["vi", "en", "ja"] as const) {
      const { unmount } = renderWithIntl(<MoveLabel state={after(last)} />, { locale });
      expect(screen.getByText(texts[locale])).toBeInTheDocument();
      unmount();
    }
  });

  it("names the seats by colour: Đỏ and Vàng with two players", () => {
    renderWithIntl(<PlayerLabels state={game(2)} />);

    expect(screen.getByText("Đỏ Vàng")).toBeInTheDocument();
  });

  it("names four seats by colour in English", () => {
    renderWithIntl(<PlayerLabels state={game(4)} />, { locale: "en" });

    expect(screen.getByText("Red Blue Yellow Green")).toBeInTheDocument();
  });

  it("names the kicked horse's colour from the seats of a two-player game", () => {
    const last = horseMove(10, 16, { player: 1, horse: 0, from: 3 });
    renderWithIntl(<MoveLabel state={{ ...after(last, 2), last: { ...last, player: 0 } }} />);

    expect(screen.getByText("đi ngựa 2 tới ô 17, đá ngựa Vàng")).toBeInTheDocument();
  });
});
