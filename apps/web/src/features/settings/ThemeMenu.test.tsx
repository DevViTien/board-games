import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { TIME_ZONE } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import messages from "../../../messages/vi.json";
import { InitialThemeProvider } from "./InitialThemeProvider";
import { applyTheme } from "./theme";
import { ThemeMenu } from "./ThemeMenu";

const html = () => document.documentElement;

function themeCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("theme="))
    ?.slice("theme=".length);
}

const button = () => screen.getByRole("button", { name: /^Giao diện: / });
const item = (name: string) => screen.getByRole("menuitemradio", { name });

afterEach(() => {
  applyTheme("system");
});

describe("ThemeMenu", () => {
  it("Tên của nút: named by the system's theme by default, and opens a menu", () => {
    renderWithIntl(<ThemeMenu />);

    expect(button()).toHaveAccessibleName("Giao diện: Theo hệ thống");
    expect(button()).toHaveAttribute("aria-haspopup", "menu");
    expect(button().querySelector("svg")).toHaveClass("lucide-monitor");
  });

  it("offers Sáng, Tối and Theo hệ thống, the one in use ticked", async () => {
    renderWithIntl(<ThemeMenu />);

    await userEvent.click(button());

    expect(screen.getAllByRole("menuitemradio").map((choice) => choice.textContent)).toEqual([
      "Sáng",
      "Tối",
      "Theo hệ thống",
    ]);
    expect(item("Theo hệ thống")).toHaveAttribute("aria-checked", "true");
  });

  it("Chọn giao diện tối: applies it at once and remembers it, the icon a moon", async () => {
    renderWithIntl(<ThemeMenu />);

    await userEvent.click(button());
    await userEvent.click(item("Tối"));

    expect(html()).toHaveAttribute("data-theme", "dark");
    expect(themeCookie()).toBe("dark");
    expect(button()).toHaveAccessibleName("Giao diện: Tối");
    expect(button().querySelector("svg")).toHaveClass("lucide-moon");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Chọn bằng bàn phím: Enter opens on the chosen theme, ↓ and Enter choose the next one", async () => {
    applyTheme("light");
    renderWithIntl(<ThemeMenu />);

    await userEvent.tab();
    expect(button()).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(item("Sáng")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(html()).toHaveAttribute("data-theme", "dark");
    expect(themeCookie()).toBe("dark");
    expect(button()).toHaveFocus();
    expect(button()).toHaveAccessibleName("Giao diện: Tối");
  });

  it("Đóng bằng Escape: closes without changing the theme, the focus back on the button", async () => {
    renderWithIntl(<ThemeMenu />);
    await userEvent.click(button());
    await userEvent.keyboard("{ArrowUp}");

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(html()).not.toHaveAttribute("data-theme");
    expect(button()).toHaveFocus();
  });

  it("Theo hệ thống: forgets the choice, leaving the system's setting to apply", async () => {
    applyTheme("dark");
    renderWithIntl(<ThemeMenu />);

    await userEvent.click(button());
    await userEvent.click(item("Theo hệ thống"));

    expect(html()).not.toHaveAttribute("data-theme");
    expect(themeCookie()).toBeUndefined();
    expect(button()).toHaveAccessibleName("Giao diện: Theo hệ thống");
  });

  it("is named and drawn by the theme the server rendered, before hydration reads the page", () => {
    // The server's HTML for a player who picked dark: `<html>` is not read there.
    const markup = renderToString(
      <NextIntlClientProvider locale="vi" messages={messages} timeZone={TIME_ZONE}>
        <InitialThemeProvider theme="dark">
          <ThemeMenu />
        </InitialThemeProvider>
      </NextIntlClientProvider>,
    );

    expect(markup).toContain('aria-label="Giao diện: Tối"');
    expect(markup).toContain("lucide-moon");
  });

  it("shows the theme the page is in, chosen elsewhere too", async () => {
    applyTheme("dark");
    renderWithIntl(<ThemeMenu />);
    expect(button()).toHaveAccessibleName("Giao diện: Tối");

    // Another menu (or tab) changed <html>: this one follows.
    await act(async () => {
      applyTheme("light");
      await Promise.resolve();
    });

    expect(button()).toHaveAccessibleName("Giao diện: Sáng");
  });
});
