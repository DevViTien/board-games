import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "@/i18n/actions";
import { renderWithIntl } from "@/test/render-with-intl";

import { LocaleSwitcher } from "./LocaleSwitcher";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn(() => Promise.resolve()) }));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    vi.mocked(setLocale).mockClear();
  });

  it("offers every language, each named in itself, the current one pressed", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });

    const group = screen.getByRole("group", { name: "Language" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Tiếng Việt",
      "English",
      "日本語",
    ]);
    expect(screen.getByRole("button", { name: "English", pressed: true })).toHaveAttribute(
      "lang",
      "en",
    );
    expect(screen.getByRole("button", { name: "Tiếng Việt", pressed: false })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("Đổi ngôn ngữ: saves the language the player presses", async () => {
    renderWithIntl(<LocaleSwitcher />);

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(setLocale).toHaveBeenCalledExactlyOnceWith("en");
  });

  it("does not reload the page in another language for each arrow key", async () => {
    renderWithIntl(<LocaleSwitcher />);

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");

    expect(setLocale).not.toHaveBeenCalled();
  });

  it("is busy while the language is saved, ignoring presses, the focus kept", async () => {
    let finish: () => void = () => undefined;
    vi.mocked(setLocale).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderWithIntl(<LocaleSwitcher />);
    const english = screen.getByRole("button", { name: "English" });

    await userEvent.click(english);
    expect(screen.getByRole("group", { name: "Ngôn ngữ" })).toHaveAttribute("aria-busy", "true");
    await userEvent.click(screen.getByRole("button", { name: "日本語" }));

    expect(setLocale).toHaveBeenCalledExactlyOnceWith("en");
    expect(screen.getByRole("button", { name: "日本語" })).toHaveFocus();
    finish();
  });
});
