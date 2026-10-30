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

  it("shows the current language and offers every supported one", () => {
    renderWithIntl(<LocaleSwitcher />, { locale: "en" });

    const select = screen.getByRole("combobox", { name: "Language" });
    expect(select).toHaveValue("en");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Tiếng Việt",
      "English",
      "日本語",
    ]);
  });

  it("saves the language the player picks", async () => {
    renderWithIntl(<LocaleSwitcher />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ngôn ngữ" }), "ja");

    expect(setLocale).toHaveBeenCalledWith("ja");
  });
});
