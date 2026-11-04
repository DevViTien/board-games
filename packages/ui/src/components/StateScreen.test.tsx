import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StateScreen } from "./StateScreen";

describe("StateScreen", () => {
  it("is a page titled by a level-1 heading, with its explanation and ways on", () => {
    render(
      <StateScreen title="Không tìm thấy phòng" description="Mã phòng có thể sai." tone="danger">
        <a href="/">Về menu</a>
      </StateScreen>,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Không tìm thấy phòng" }),
    ).not.toHaveFocus();
    expect(screen.getByText("Mã phòng có thể sai.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("is a status line while loading, its picture still when motion is reduced", () => {
    const { container } = render(<StateScreen title="Đang tải…" busy />);

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải…");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    const pulsing = container.querySelectorAll(".animate-loading-pulse");
    expect(pulsing).toHaveLength(4);
    for (const block of pulsing) expect(block).toHaveClass("motion-reduce:animate-none");
  });

  it("focuses its title when asked, for a page that replaced another", () => {
    render(<StateScreen title="Phòng đã đủ người" focusTitle />);

    expect(screen.getByRole("heading", { level: 1, name: "Phòng đã đủ người" })).toHaveFocus();
  });

  it("hides its picture from screen readers", () => {
    const { container } = render(<StateScreen title="Không tải được game" />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("puts the page's top bar above its main content", () => {
    render(<StateScreen title="Không tìm thấy trang" topBar={<header>Thanh trên</header>} />);

    const bar = screen.getByRole("banner");
    expect(bar).toHaveTextContent("Thanh trên");
    expect(screen.getByRole("main")).not.toContainElement(bar);
  });
});
