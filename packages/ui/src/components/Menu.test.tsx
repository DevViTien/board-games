import { removePopoverStub, restorePopoverStub } from "@board-games/config/vitest/popover";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { Menu, MenuButton, MenuRadioGroup, MenuRadioItem } from "./Menu";

const CHOICES = ["Sáng", "Tối", "Theo hệ thống"] as const;

function ThemeMenu({
  onChoose = vi.fn(),
  onButtonClick,
  onBoard = vi.fn(),
  busy = false,
}: {
  readonly onChoose?: (choice: string) => void;
  readonly onButtonClick?: () => void;
  readonly onBoard?: () => void;
  readonly busy?: boolean;
}) {
  const [chosen, setChosen] = useState<string>("Theo hệ thống");
  return (
    <>
      <Menu>
        <MenuButton aria-label={`Giao diện: ${chosen}`} busy={busy} onClick={onButtonClick}>
          icon
        </MenuButton>
        <MenuRadioGroup>
          {CHOICES.map((choice) => (
            <MenuRadioItem
              key={choice}
              checked={choice === chosen}
              onSelect={() => {
                setChosen(choice);
                onChoose(choice);
              }}
            >
              {choice}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </Menu>
      <button type="button">Sau</button>
      <p>Chỗ khác</p>
      <button type="button" onClick={onBoard}>
        Ô bàn cờ
      </button>
    </>
  );
}

const button = () => screen.getByRole("button", { name: /^Giao diện/ });
const item = (name: string) => screen.getByRole("menuitemradio", { name });

// Every behaviour with the browser's `popover`, and without it (Safari 16, Firefox before 125),
// where React state opens the menu.
describe.each([
  ["with popover", false],
  ["without popover", true],
] as const)("Menu %s", (_, withoutPopover) => {
  beforeAll(() => {
    if (withoutPopover) removePopoverStub();
  });
  afterAll(() => {
    if (withoutPopover) restorePopoverStub();
  });

  it("is a menu button: closed, it names its menu and says it opens one", () => {
    render(<ThemeMenu />);

    expect(button()).toHaveAccessibleName("Giao diện: Theo hệ thống");
    expect(button()).toHaveAttribute("aria-haspopup", "menu");
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(document.getElementById(button().getAttribute("aria-controls") ?? "")).toHaveAttribute(
      "role",
      "menu",
    );
  });

  it.each(["{Enter}", " ", "{ArrowDown}"])(
    "opens with %s on the chosen item, and the menu is named by its button",
    async (key) => {
      const user = userEvent.setup();
      render(<ThemeMenu />);
      button().focus();

      await user.keyboard(key);

      expect(screen.getByRole("menu", { name: "Giao diện: Theo hệ thống" })).toBeVisible();
      expect(button()).toHaveAttribute("aria-expanded", "true");
      expect(item("Theo hệ thống")).toHaveFocus();
      expect(item("Theo hệ thống")).toHaveAttribute("aria-checked", "true");
      expect(item("Sáng")).toHaveAttribute("aria-checked", "false");
    },
  );

  it("opens with ↑ on the last item", async () => {
    const user = userEvent.setup();
    render(<ThemeMenu />);
    button().focus();

    await user.keyboard("{ArrowUp}");

    expect(item("Theo hệ thống")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(item("Tối")).toHaveFocus();
  });

  it("moves round with ↑ and ↓, to the ends with Home and End, and to an item by its first letter", async () => {
    const user = userEvent.setup();
    render(<ThemeMenu />);
    await user.click(button());

    await user.keyboard("{ArrowDown}");
    expect(item("Sáng")).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(item("Theo hệ thống")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("Sáng")).toHaveFocus();
    await user.keyboard("{End}");
    expect(item("Theo hệ thống")).toHaveFocus();
    await user.keyboard("t");
    expect(item("Tối")).toHaveFocus();
    await user.keyboard("t");
    expect(item("Theo hệ thống")).toHaveFocus();
    // Nothing chosen on the way.
    expect(button()).toHaveAccessibleName("Giao diện: Theo hệ thống");
  });

  it.each(["{Enter}", " "])(
    "chooses with %s, closes and gives the focus back to the button",
    async (key) => {
      const user = userEvent.setup();
      const onChoose = vi.fn();
      render(<ThemeMenu onChoose={onChoose} />);
      button().focus();
      await user.keyboard("{Enter}{ArrowDown}{ArrowDown}");

      await user.keyboard(key);

      expect(onChoose).toHaveBeenCalledExactlyOnceWith("Tối");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(button()).toHaveFocus();
      expect(button()).toHaveAccessibleName("Giao diện: Tối");
      expect(button()).toHaveAttribute("aria-expanded", "false");
    },
  );

  it("closes on Esc without choosing, the focus back on the button", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ThemeMenu onChoose={onChoose} />);
    button().focus();
    await user.keyboard("{Enter}{ArrowDown}");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(button()).toHaveFocus();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("closes on Tab and lets the focus move on", async () => {
    const user = userEvent.setup();
    render(<ThemeMenu />);
    button().focus();
    await user.keyboard("{Enter}");

    await user.tab();

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sau" })).toHaveFocus();
  });

  it("opens and closes with a press on its button, and closes on a press elsewhere", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<ThemeMenu onChoose={onChoose} />);

    await user.click(button());
    expect(screen.getByRole("menu")).toBeVisible();
    await user.click(button());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(button());
    await user.click(screen.getByText("Chỗ khác"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onChoose).not.toHaveBeenCalled();
    // Closed from outside: the focus is not taken back to the button.
    expect(button()).not.toHaveFocus();
  });

  it("swallows the press that closes it: what is under it is not activated", async () => {
    const user = userEvent.setup();
    const onBoard = vi.fn();
    render(<ThemeMenu onBoard={onBoard} />);
    await user.click(button());

    await user.click(screen.getByRole("button", { name: "Ô bàn cờ" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onBoard).not.toHaveBeenCalled();
    expect(button()).not.toHaveFocus();
    // The menu closed, the next press plays.
    await user.click(screen.getByRole("button", { name: "Ô bàn cờ" }));
    expect(onBoard).toHaveBeenCalledOnce();
  });

  it("runs a caller's onClick on its button, and still opens", async () => {
    const user = userEvent.setup();
    const onButtonClick = vi.fn();
    render(<ThemeMenu onButtonClick={onButtonClick} />);

    await user.click(button());

    expect(onButtonClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("menu")).toBeVisible();
  });

  it(
    withoutPopover
      ? "without popover: closed by the hidden attribute, never visible by default"
      : "with popover: a popover the browser opens",
    () => {
      render(<ThemeMenu />);
      const menu = document.getElementById(button().getAttribute("aria-controls") ?? "");

      if (withoutPopover) {
        expect(menu).not.toHaveAttribute("popover");
        expect(menu).toHaveAttribute("hidden");
        expect(button()).not.toHaveAttribute("popovertarget");
      } else {
        expect(menu).toHaveAttribute("popover", "auto");
        expect(button()).toHaveAttribute("popovertarget", menu?.id);
      }
      expect(menu).not.toBeVisible();
    },
  );

  it("chooses with a press, each item at least 44 px high and ticked when chosen", async () => {
    const user = userEvent.setup();
    render(<ThemeMenu />);
    await user.click(button());

    expect(item("Sáng")).toHaveClass("min-h-11");
    await user.click(item("Sáng"));

    expect(button()).toHaveAccessibleName("Giao diện: Sáng");
    await user.click(button());
    // The tick shows on the chosen item only: not by colour alone.
    expect(item("Sáng").querySelector("svg")).not.toHaveClass("invisible");
    expect(item("Tối").querySelector("svg")).toHaveClass("invisible");
  });

  it("while busy, says so and does not open", async () => {
    const user = userEvent.setup();
    render(<ThemeMenu busy />);

    expect(button()).toHaveAttribute("aria-busy", "true");
    await user.click(button());
    button().focus();
    await user.keyboard("{ArrowDown}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
