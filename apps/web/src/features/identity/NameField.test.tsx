import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { parsePlayerName } from "./identity";
import { NameField } from "./NameField";

/** A name step as a page uses it: the field, and a button that goes on only with a valid name. */
function NameStep({
  initial = "",
  onCommit,
  onConfirm,
}: {
  readonly initial?: string;
  readonly onCommit?: (name: string) => void;
  readonly onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [tried, setTried] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        const name = parsePlayerName(value);
        if (name !== null) onConfirm(name);
      }}
    >
      <NameField value={value} onChange={setValue} onCommit={onCommit} showError={tried} />
      <button type="submit">Tiếp tục</button>
    </form>
  );
}

const field = () => screen.getByRole("textbox", { name: "Tên của bạn" });
const confirm = () => userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));

describe("NameField", () => {
  it("reads a hint with the field, and the error after it once refused", () => {
    const { rerender } = renderWithIntl(
      <NameField value="" onChange={vi.fn()} showError={false} hint="Ai cũng thấy tên này." />,
    );
    expect(field()).toHaveAccessibleDescription("Ai cũng thấy tên này.");

    rerender(<NameField value="" onChange={vi.fn()} showError hint="Ai cũng thấy tên này." />);

    expect(field()).toHaveAccessibleDescription(
      "Ai cũng thấy tên này. Tên cần có từ 1 đến 24 ký tự.",
    );
  });

  it("refuses a name of spaces only, saying why at the field", async () => {
    const onConfirm = vi.fn();
    renderWithIntl(<NameStep onConfirm={onConfirm} />);

    await userEvent.type(field(), "   ");
    await confirm();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription("Tên cần có từ 1 đến 24 ký tự.");
  });

  it("refuses a name of 25 characters, and takes one of 24", async () => {
    const onConfirm = vi.fn();
    renderWithIntl(<NameStep onConfirm={onConfirm} />);

    await userEvent.type(field(), "a".repeat(25));
    await confirm();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(field()).toHaveAccessibleDescription("Tên cần có từ 1 đến 24 ký tự.");

    await userEvent.type(field(), "{Backspace}");

    expect(field()).not.toHaveAccessibleDescription();
    await confirm();
    expect(onConfirm).toHaveBeenCalledWith("a".repeat(24));
  });

  it("shows no error before the player tries to go on", async () => {
    renderWithIntl(<NameStep onConfirm={vi.fn()} />);

    await userEvent.click(field());
    await userEvent.tab();

    expect(field()).toHaveAttribute("aria-invalid", "false");
    expect(field()).not.toHaveAccessibleDescription();
  });

  it("reports a valid name, trimmed, when the player leaves the field", async () => {
    const onCommit = vi.fn();
    renderWithIntl(<NameStep initial="Minh" onCommit={onCommit} onConfirm={vi.fn()} />);

    await userEvent.type(field(), " Anh  ");
    await userEvent.tab();

    expect(onCommit).toHaveBeenCalledExactlyOnceWith("Minh Anh");
  });

  it("reports nothing when the player leaves the field with an invalid name", async () => {
    const onCommit = vi.fn();
    renderWithIntl(<NameStep onCommit={onCommit} onConfirm={vi.fn()} />);

    await userEvent.type(field(), "  ");
    await userEvent.tab();

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("is labelled in English", () => {
    renderWithIntl(<NameStep onConfirm={vi.fn()} />, { locale: "en" });

    expect(screen.getByRole("textbox", { name: "Your name" })).toBeInTheDocument();
  });
});
