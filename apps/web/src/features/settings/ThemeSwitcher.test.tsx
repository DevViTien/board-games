import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { applyTheme } from "./theme";
import { ThemeSwitcher } from "./ThemeSwitcher";

const html = () => document.documentElement;

function themeCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("theme="))
    ?.slice("theme=".length);
}

afterEach(() => {
  applyTheme("system");
});

describe("ThemeSwitcher", () => {
  it("is a group named Giao diện with Sáng, Tối and Theo hệ thống, the system's by default", () => {
    renderWithIntl(<ThemeSwitcher initialTheme="system" />);

    expect(screen.getByRole("group", { name: "Giao diện" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("radio").map((radio) => radio.closest("label")?.textContent),
    ).toEqual(["Sáng", "Tối", "Theo hệ thống"]);
    expect(screen.getByRole("radio", { name: "Theo hệ thống" })).toBeChecked();
  });

  it("Chọn giao diện tối: applies it at once and remembers it", async () => {
    renderWithIntl(<ThemeSwitcher initialTheme="system" />);

    await userEvent.click(screen.getByRole("radio", { name: "Tối" }));

    expect(html()).toHaveAttribute("data-theme", "dark");
    expect(themeCookie()).toBe("dark");
    expect(screen.getByRole("radio", { name: "Tối" })).toBeChecked();
  });

  it("Chọn bằng bàn phím: the arrow keys choose the next theme, which is applied", async () => {
    renderWithIntl(<ThemeSwitcher initialTheme="system" />);

    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Theo hệ thống" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: "Sáng" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Sáng" })).toHaveFocus();
    expect(html()).toHaveAttribute("data-theme", "light");
    expect(themeCookie()).toBe("light");
  });

  it("Theo hệ thống: forgets the choice, leaving the system's setting to apply", async () => {
    applyTheme("dark");
    renderWithIntl(<ThemeSwitcher initialTheme="dark" />);

    await userEvent.click(screen.getByRole("radio", { name: "Theo hệ thống" }));

    expect(html()).not.toHaveAttribute("data-theme");
    expect(themeCookie()).toBeUndefined();
    expect(screen.getByRole("radio", { name: "Theo hệ thống" })).toBeChecked();
  });

  it("shows the theme the page is in, chosen elsewhere too", async () => {
    applyTheme("dark");
    renderWithIntl(<ThemeSwitcher initialTheme="dark" />);
    expect(screen.getByRole("radio", { name: "Tối" })).toBeChecked();

    // Another switcher (or tab) changed <html>: this one follows.
    await act(async () => {
      applyTheme("light");
      await Promise.resolve();
    });

    expect(screen.getByRole("radio", { name: "Sáng" })).toBeChecked();
  });
});
