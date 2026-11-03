import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { Input } from "./Input";

describe("Input", () => {
  it("is a text box by default, named by its label", () => {
    render(
      <>
        <label htmlFor="name">Tên</label>
        <Input id="name" />
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Tên" })).toHaveAttribute("type", "text");
  });

  it("takes what the player types", async () => {
    render(<Input aria-label="Tên" />);

    await userEvent.type(screen.getByRole("textbox", { name: "Tên" }), "Minh");

    expect(screen.getByRole("textbox", { name: "Tên" })).toHaveValue("Minh");
  });

  it("hands its element to a ref, so a form can focus it", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Tên" />);

    ref.current?.focus();

    expect(screen.getByRole("textbox", { name: "Tên" })).toHaveFocus();
  });

  it("is described by its error once marked invalid", () => {
    render(
      <>
        <Input aria-label="Tên" aria-invalid aria-describedby="error" />
        <p id="error">Tên cần có từ 1 đến 24 ký tự.</p>
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Tên" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("Tên cần có từ 1 đến 24 ký tự.");
  });

  it("lets className add to its own classes", () => {
    render(<Input aria-label="Tên" className="font-mono" />);

    expect(screen.getByRole("textbox", { name: "Tên" })).toHaveClass("font-mono", "w-full");
  });
});
