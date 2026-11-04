import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TopBar } from "./TopBar";

describe("TopBar", () => {
  it("is the page's banner, with its three parts in order", () => {
    render(
      <TopBar
        start={<a href="/">Về menu</a>}
        center={<h1>Cờ vua</h1>}
        end={<button type="button">Giao diện</button>}
      />,
    );

    const bar = screen.getByRole("banner");
    const parts = [
      screen.getByRole("link", { name: "Về menu" }),
      screen.getByRole("heading", { level: 1, name: "Cờ vua" }),
      screen.getByRole("button", { name: "Giao diện" }),
    ];
    for (const part of parts) expect(bar).toContainElement(part);
    expect(parts[0]?.compareDocumentPosition(parts[1] as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(parts[1]?.compareDocumentPosition(parts[2] as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("sticks to the top on a solid background of the page's, below the safe area", () => {
    render(<TopBar start={null} end={null} />);

    const bar = screen.getByRole("banner");
    expect(bar).toHaveClass("sticky", "top-0", "bg-game-page", "pt-[var(--safe-top)]");
    expect(bar.className).not.toMatch(/\bbg-\S+\/\d|backdrop-blur|bg-transparent/);
    // One row of the height the play screen's maths subtracts.
    expect(bar.firstElementChild).toHaveClass("h-(--top-bar-height)");
  });
});
