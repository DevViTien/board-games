import { IN_STABLE, ludo, LUDO_DEFAULT_OPTIONS, OWN_GATE } from "@board-games/games/ludo";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { useLudoResultDetail } from "./result-detail";
import { useLudoSeatSummary } from "./seat-summary";

const START = ludo.setup({ playerCount: 4, options: LUDO_DEFAULT_OPTIONS });
const S = IN_STABLE;

function Summary({ horses }: { horses: readonly number[] }) {
  const summary = useLudoSeatSummary();
  const { full, short } = summary(0, { ...START, horses: [horses, ...START.horses.slice(1)] });
  return (
    <>
      <p>{full}</p>
      <p>short: {short}</p>
    </>
  );
}

function Result({ winners }: { winners: readonly (0 | 1 | 2 | 3)[] }) {
  const detail = useLudoResultDetail();
  return <p>{detail({ kind: "win", winners }, START)}</p>;
}

describe("useLudoSeatSummary", () => {
  it.each([
    [[S, S, S, S], "Chưa ra quân", "Chưa ra quân"],
    [[0, S, S, S], "1 ngựa trên đường", "1 trên đường"],
    [[OWN_GATE, 12, S, S], "2 ngựa trên đường", "2 trên đường"],
    [[OWN_GATE + 3, S, S, S], "1 ngựa đã lên chuồng", "1 lên chuồng"],
    [[5, 9, OWN_GATE + 6, S], "2 ngựa trên đường · 1 đã lên chuồng", "2 đường · 1 chuồng"],
  ] as const)("tells where the horses are (%j)", (horses, full, short) => {
    renderWithIntl(<Summary horses={horses} />);

    expect(screen.getByText(full)).toBeInTheDocument();
    expect(screen.getByText(`short: ${short}`)).toBeInTheDocument();
  });

  it("counts in English", () => {
    renderWithIntl(<Summary horses={[0, 7, OWN_GATE + 4, S]} />, { locale: "en" });

    expect(screen.getByText("2 horses on the track · 1 horse home")).toBeInTheDocument();
    expect(screen.getByText("short: 2 out · 1 home")).toBeInTheDocument();
  });
});

describe("useLudoResultDetail", () => {
  it("names the colour whose horses all reached home", () => {
    renderWithIntl(<Result winners={[2]} />);

    expect(screen.getByText("Vàng đã đưa cả bốn ngựa lên chuồng")).toBeInTheDocument();
  });
});
