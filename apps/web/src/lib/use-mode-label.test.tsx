import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";
import type { SeatView } from "@/transport/types";

import { seatsOf, useModeLabel } from "./use-mode-label";

function ModeLabel({ seats }: { readonly seats: readonly SeatView[] }) {
  const modeLabel = useModeLabel();
  return <p>{modeLabel(seats)}</p>;
}

function label(seats: readonly SeatView[], locale: Locale = "vi") {
  const view = renderWithIntl(<ModeLabel seats={seats} />, { locale });
  const text = screen.getByRole("paragraph").textContent;
  view.unmount();
  return text;
}

const HUMAN = { kind: "human" } as const;

describe("useModeLabel", () => {
  it("names a game without an AI seat as played on the same device", () => {
    expect(label([HUMAN, HUMAN])).toBe("Cùng máy");
    expect(label(seatsOf({ kind: "local" }))).toBe("Cùng máy");
  });

  it("does not count the seats of players elsewhere (online)", () => {
    expect(label([HUMAN, { kind: "remote", name: "Minh" }])).toBe("Cùng máy");
    expect(
      label([
        { kind: "remote", name: null },
        { kind: "ai", level: "hard" },
      ]),
    ).toBe("Với máy · Khó");
  });

  it("names the level when the AI seats play one", () => {
    expect(label([HUMAN, { kind: "ai", level: "hard" }])).toBe("Với máy · Khó");
    expect(label([{ kind: "ai", level: "easy" }, HUMAN, { kind: "ai", level: "easy" }])).toBe(
      "Với máy · Dễ",
    );
  });

  it("names no level when the AI seats play several", () => {
    expect(label([HUMAN, { kind: "ai", level: "easy" }, { kind: "ai", level: "hard" }])).toBe(
      "Với máy",
    );
  });

  it("reads the seats of a saved game against the AI", () => {
    const seats = seatsOf({
      kind: "ai",
      first: "random",
      seats: [HUMAN, { kind: "ai", level: "medium" }],
    });

    expect(label(seats, "en")).toBe("Vs computer · Medium");
  });
});
