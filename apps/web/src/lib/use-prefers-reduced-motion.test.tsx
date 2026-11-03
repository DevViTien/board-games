import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

function Probe() {
  return <p>{usePrefersReducedMotion() ? "reduce" : "motion"}</p>;
}

describe("usePrefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the system's preference", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    render(<Probe />);

    expect(screen.getByText("reduce")).toBeInTheDocument();
  });

  it("allows motion where the browser cannot tell (no matchMedia)", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(<Probe />);

    expect(screen.getByText("motion")).toBeInTheDocument();
  });
});
