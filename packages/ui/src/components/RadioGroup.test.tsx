import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { RadioGroup } from "./RadioGroup";

type Level = "easy" | "medium" | "hard";

const LEVELS = [
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Vừa" },
  { value: "hard", label: "Khó" },
] as const;

/** A group that keeps its own value, as a screen using it would. */
function Levels({ onChange }: { readonly onChange?: (value: Level) => void }) {
  const [value, setValue] = useState<Level>("medium");
  return (
    <RadioGroup
      legend="Mức độ"
      options={LEVELS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });

describe("RadioGroup", () => {
  it("is a group named by its legend, with one radio per option", () => {
    render(<Levels />);

    const group = screen.getByRole("group", { name: "Mức độ" });
    expect(group.tagName).toBe("FIELDSET");
    expect(screen.getAllByRole("radio").map((option) => option.getAttribute("value"))).toEqual([
      "easy",
      "medium",
      "hard",
    ]);
  });

  it("marks the chosen option as checked", () => {
    render(<Levels />);

    expect(radio("Vừa")).toBeChecked();
    expect(radio("Dễ")).not.toBeChecked();
    expect(radio("Khó")).not.toBeChecked();
  });

  it("has a check mark for the chosen option, which forced colours show instead of its background", async () => {
    render(<Levels />);
    const checkMarks = () =>
      screen
        .getAllByRole("radio")
        .filter((option) => (option.closest("label")?.querySelector("svg") ?? null) !== null)
        .map((option) => option.getAttribute("value"));

    expect(checkMarks()).toEqual(["medium"]);
    await userEvent.click(screen.getByText("Khó"));
    expect(checkMarks()).toEqual(["hard"]);
    expect(radio("Khó").closest("label")?.querySelector("svg")).toHaveClass("forced-colors:block");
  });

  it("changes the value when an option is clicked", async () => {
    const onChange = vi.fn();
    render(<Levels onChange={onChange} />);

    await userEvent.click(screen.getByText("Khó"));

    expect(onChange).toHaveBeenCalledWith("hard");
    expect(radio("Khó")).toBeChecked();
    expect(radio("Vừa")).not.toBeChecked();
  });

  it("is reached with Tab and changed with the arrow keys", async () => {
    const onChange = vi.fn();
    render(
      <>
        <button type="button">before</button>
        <Levels onChange={onChange} />
      </>,
    );
    const user = userEvent.setup();

    screen.getByRole("button", { name: "before" }).focus();
    await user.tab();
    expect(radio("Vừa")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(radio("Khó")).toBeChecked();
    expect(radio("Khó")).toHaveFocus();

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(radio("Dễ")).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith("easy");
  });

  it("takes one Tab stop for the whole group", async () => {
    render(
      <>
        <Levels />
        <button type="button">after</button>
      </>,
    );
    const user = userEvent.setup();

    await user.tab();
    expect(radio("Vừa")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });
});
