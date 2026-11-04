import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "@/i18n/actions";
import { renderWithIntl } from "@/test/render-with-intl";

import { LocaleMenu } from "./LocaleMenu";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn(() => Promise.resolve()) }));

const button = () => screen.getByRole("button", { name: /^(Ngôn ngữ|Language|言語): / });
const item = (name: string) => screen.getByRole("menuitemradio", { name });

describe("LocaleMenu", () => {
  beforeEach(() => {
    vi.mocked(setLocale).mockClear();
  });

  it("Tên của nút: named by the language in use, its code shown, and opens a menu", () => {
    renderWithIntl(<LocaleMenu />);

    expect(button()).toHaveAccessibleName("Ngôn ngữ: Tiếng Việt, VI");
    expect(button()).toHaveTextContent("VI");
    expect(button()).toHaveAttribute("aria-haspopup", "menu");
  });

  it("offers every language named in itself, each in its own language, the one in use ticked", async () => {
    renderWithIntl(<LocaleMenu />, { locale: "en" });

    expect(button()).toHaveAccessibleName("Language: English, EN");
    await userEvent.click(button());

    expect(screen.getAllByRole("menuitemradio").map((choice) => choice.textContent)).toEqual([
      "Tiếng Việt",
      "English",
      "日本語",
    ]);
    expect(item("English")).toHaveAttribute("aria-checked", "true");
    expect(item("日本語")).toHaveAttribute("lang", "ja");
    expect(item("Tiếng Việt")).toHaveAttribute("lang", "vi");
  });

  it("Đổi ngôn ngữ: saves the language the player chooses", async () => {
    renderWithIntl(<LocaleMenu />);

    await userEvent.click(button());
    await userEvent.click(item("English"));

    expect(setLocale).toHaveBeenCalledExactlyOnceWith("en");
  });

  it("Đổi ngôn ngữ bằng bàn phím: ↓ opens on Tiếng Việt, ↓ moves to English without saving, Enter saves", async () => {
    renderWithIntl(<LocaleMenu />);

    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}");
    expect(item("Tiếng Việt")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(item("English")).toHaveFocus();
    expect(setLocale).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");

    expect(setLocale).toHaveBeenCalledExactlyOnceWith("en");
    expect(button()).toHaveFocus();
  });

  it("choosing the language in use saves nothing", async () => {
    renderWithIntl(<LocaleMenu />);

    await userEvent.click(button());
    await userEvent.click(item("Tiếng Việt"));

    expect(setLocale).not.toHaveBeenCalled();
  });

  it("Đang đổi ngôn ngữ: busy until the page changes, not opening again, the focus kept", async () => {
    let finish: () => void = () => undefined;
    vi.mocked(setLocale).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderWithIntl(<LocaleMenu />);

    await userEvent.click(button());
    await userEvent.click(item("日本語"));

    expect(button()).toHaveAttribute("aria-busy", "true");
    expect(button()).toHaveFocus();
    expect(button()).toHaveAccessibleDescription("Đang đổi ngôn ngữ…");
    // The spinner stands still when motion is reduced.
    expect(button().querySelector("svg")).toHaveClass("animate-spin", "motion-reduce:animate-none");
    await userEvent.click(button());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(setLocale).toHaveBeenCalledExactlyOnceWith("ja");
    finish();
  });
});

describe("LocaleMenu when the language cannot be saved", () => {
  it("keeps the language in use and says so politely, nothing thrown to the page", async () => {
    vi.mocked(setLocale).mockRejectedValueOnce(new Error("Failed to fetch"));
    renderWithIntl(<LocaleMenu />);

    await userEvent.click(button());
    await userEvent.click(item("English"));

    const line = await screen.findByText("Chưa đổi được ngôn ngữ. Hãy thử lại.");
    expect(line).toHaveAttribute("aria-live", "polite");
    expect(button()).toHaveAccessibleName("Ngôn ngữ: Tiếng Việt, VI");
    expect(button()).not.toHaveAttribute("aria-busy");
    expect(button()).toHaveFocus();

    // A new choice clears it.
    await userEvent.click(button());
    await userEvent.click(item("日本語"));
    expect(screen.queryByText("Chưa đổi được ngôn ngữ. Hãy thử lại.")).not.toBeInTheDocument();
  });
});
