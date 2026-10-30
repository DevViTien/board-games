import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renders a non-submitting button by default", () => {
    render(<Button>Chơi</Button>);

    expect(screen.getByRole("button", { name: "Chơi" })).toHaveAttribute("type", "button");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Chơi</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Chơi" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Chơi
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Chơi" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets className override variant classes", () => {
    render(<Button className="px-8">Chơi</Button>);

    const button = screen.getByRole("button", { name: "Chơi" });
    expect(button).toHaveClass("px-8");
    expect(button).not.toHaveClass("px-4");
  });
});
