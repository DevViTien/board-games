import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import RootError from "./error";
import RulesError from "./rules/[gameId]/error";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));

describe.each([
  ["the root", RootError],
  ["the rules page", RulesError],
] as const)("error page of %s", (_, ErrorPage) => {
  it("is translated, has the top bar, and offers to try again or go back to the menu", async () => {
    const retry = vi.fn();
    renderWithIntl(<ErrorPage error={new Error("boom")} retry={retry} />, { locale: "en" });

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
    const bar = within(screen.getByRole("banner"));
    expect(bar.getByRole("link", { name: "Back to menu" })).toHaveAttribute("href", "/");
    expect(bar.getByRole("button", { name: /^Theme: / })).toBeInTheDocument();
    expect(bar.getByRole("button", { name: /^Language: / })).toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: "Back to menu" }),
    ).toHaveAttribute("href", "/");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
