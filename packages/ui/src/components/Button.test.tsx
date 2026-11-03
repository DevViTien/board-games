import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renders a non-submitting button by default", () => {
    render(<Button>Chơi</Button>);

    expect(screen.getByRole("button", { name: "Chơi" })).toHaveAttribute("type", "button");
  });

  it("passes its ref to the button, for a caller to move the focus there", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Gieo</Button>);

    expect(ref.current).toBe(screen.getByRole("button", { name: "Gieo" }));
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

  it("ignores presses but stays focusable when aria-disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button aria-disabled onClick={onClick}>
        Chơi
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Chơi" });

    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.click(button, { pointerEventsCheck: 0 });

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleName("Chơi");
  });

  it("keeps the lip of a focused primary button: the focus ring adds a ring to its shadow", () => {
    render(<Button>Chơi</Button>);

    expect(screen.getByRole("button", { name: "Chơi" })).toHaveClass("shadow-press", "focus-ring");
  });

  it("looks disabled over any colour given by the caller when aria-disabled", () => {
    render(
      <Button aria-disabled className="bg-piece-red text-piece-red-ink">
        Gieo
      </Button>,
    );

    // The disabled look is `!important`, so it wins over the caller's colours.
    expect(screen.getByRole("button", { name: "Gieo" })).toHaveClass(
      "aria-disabled:bg-surface-muted!",
      "aria-disabled:text-fg-muted!",
      "aria-disabled:border-dashed!",
    );
  });

  it("lets className override variant classes", () => {
    render(<Button className="px-8">Chơi</Button>);

    const button = screen.getByRole("button", { name: "Chơi" });
    expect(button).toHaveClass("px-8");
    expect(button).not.toHaveClass("px-5");
  });
});
