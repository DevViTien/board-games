import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToggleGroup } from "./ToggleGroup";

const LANGUAGES = [
  { value: "vi", label: "Tiếng Việt", lang: "vi" },
  { value: "en", label: "English", lang: "en" },
  { value: "ja", label: "日本語", lang: "ja" },
] as const;

function renderGroup({ busy = false } = {}) {
  const onChange = vi.fn();
  render(
    <ToggleGroup label="Ngôn ngữ" options={LANGUAGES} value="vi" busy={busy} onChange={onChange} />,
  );
  return { onChange };
}

describe("ToggleGroup", () => {
  it("is a named group of toggle buttons, the current one pressed", () => {
    renderGroup();

    expect(screen.getByRole("group", { name: "Ngôn ngữ" })).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("button", { name: "Tiếng Việt" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "日本語" })).toHaveAttribute("lang", "ja");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("reports the option pressed, not the one already chosen", async () => {
    const { onChange } = renderGroup();

    await userEvent.click(screen.getByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: "Tiếng Việt" }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("does not change the choice with the arrow keys", async () => {
    const { onChange } = renderGroup();

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores presses while busy, and keeps the focus on the button pressed", async () => {
    const { onChange } = renderGroup({ busy: true });
    const english = screen.getByRole("button", { name: "English" });

    await userEvent.click(english);

    expect(onChange).not.toHaveBeenCalled();
    expect(english).toHaveFocus();
    expect(english).toBeEnabled();
    expect(screen.getByRole("group", { name: "Ngôn ngữ" })).toHaveAttribute("aria-busy", "true");
  });
});
