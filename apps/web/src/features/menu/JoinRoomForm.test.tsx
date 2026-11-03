import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { JoinRoomForm } from "./JoinRoomForm";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  router.push.mockReset();
});

const codeField = () => screen.getByRole("textbox", { name: "Mã phòng" });
const join = () => userEvent.click(screen.getByRole("button", { name: "Vào phòng" }));

describe("JoinRoomForm", () => {
  it("is a section of the menu with its own heading, the button named apart from it", () => {
    renderWithIntl(<JoinRoomForm />);

    const section = screen.getByRole("region", { name: "Vào phòng bằng mã" });
    expect(
      within(section).getByRole("heading", { level: 2, name: "Vào phòng bằng mã" }),
    ).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Vào phòng" })).toBeInTheDocument();
  });

  it("asks for a code the way a code is typed: capitals, no autofill or spell check, Enter goes", () => {
    renderWithIntl(<JoinRoomForm />);

    const field = codeField();
    expect(field).toHaveAttribute("name", "code");
    expect(field).toHaveAttribute("autocomplete", "off");
    expect(field).toHaveAttribute("autocapitalize", "characters");
    expect(field).toHaveAttribute("enterkeyhint", "go");
    expect(field).toHaveAttribute("spellcheck", "false");
  });

  it("opens the room of a code typed in lower case with spaces around it", async () => {
    renderWithIntl(<JoinRoomForm />);

    await userEvent.type(codeField(), "  abc234 ");
    await join();

    expect(router.push).toHaveBeenCalledExactlyOnceWith("/room/ABC234");
  });

  it("opens the room when the code is confirmed with Enter", async () => {
    renderWithIntl(<JoinRoomForm />);

    await userEvent.type(codeField(), "abc 234{Enter}");

    expect(router.push).toHaveBeenCalledWith("/room/ABC234");
  });

  it("says at the field that a code is not valid, and stays on the menu", async () => {
    renderWithIntl(<JoinRoomForm />);

    await userEvent.type(codeField(), "12");
    await join();

    expect(router.push).not.toHaveBeenCalled();
    expect(codeField()).toHaveAttribute("aria-invalid", "true");
    expect(codeField()).toHaveAccessibleDescription(
      "Mã phòng gồm 6 chữ cái và chữ số, ví dụ ABC234.",
    );
    // Back to the field from the button, so the message is read with it.
    expect(codeField()).toHaveFocus();
  });

  it("clears the error once the player edits the code", async () => {
    renderWithIntl(<JoinRoomForm />);
    await userEvent.type(codeField(), "12");
    await join();

    await userEvent.type(codeField(), "3");

    expect(codeField()).not.toHaveAccessibleDescription();
  });

  it("is labelled in English", () => {
    renderWithIntl(<JoinRoomForm />, { locale: "en" });

    expect(screen.getByRole("region", { name: "Join a room by code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Room code" })).toBeInTheDocument();
  });
});
