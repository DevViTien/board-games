import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "./Dialog";

// Focus trapping, Esc and giving the focus back are browser behaviour of <dialog>; they are checked
// end to end in Playwright. These tests cover what the component itself does.

function renderDialog(open = true) {
  const onClose = vi.fn();
  const dialog = (isOpen: boolean) => (
    <Dialog open={isOpen} title="Luật chơi Cờ caro" closeLabel="Đóng" onClose={onClose}>
      <p>Năm quân liền là thắng.</p>
    </Dialog>
  );
  const view = render(dialog(open));
  return {
    onClose,
    rerender: (isOpen: boolean) => {
      view.rerender(dialog(isOpen));
    },
  };
}

describe("Dialog", () => {
  it("is named by its title and shows its content when open", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "Luật chơi Cờ caro" });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("heading", { level: 2, name: "Luật chơi Cờ caro" })).toBeVisible();
    expect(screen.getByText("Năm quân liền là thắng.")).toBeInTheDocument();
  });

  it("lets the keyboard reach and scroll its content: a region named by the title, next after it", async () => {
    renderDialog();

    const content = screen.getByRole("region", { name: "Luật chơi Cờ caro" });
    expect(content).toContainElement(screen.getByText("Năm quân liền là thắng."));
    screen.getByRole("heading", { name: "Luật chơi Cờ caro" }).focus();
    await userEvent.tab();
    await userEvent.tab();
    expect(content).toHaveFocus();
  });

  it("puts the focus on the title when it opens, so it is read from the top", () => {
    const { rerender } = renderDialog(false);

    rerender(true);

    expect(screen.getByRole("heading", { name: "Luật chơi Cờ caro" })).toHaveFocus();
  });

  it("the browser closing it by itself: the parent is told, and one that keeps it open has it back", () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Ván 1" closeLabel="Đóng" onClose={onClose}>
        <p>Đang nhập dở.</p>
      </Dialog>,
    );
    const dialog = screen.getByRole<HTMLDialogElement>("dialog");

    dialog.close();
    fireEvent(dialog, new Event("close"));

    expect(onClose).toHaveBeenCalledOnce();
    // Still open as far as the parent goes, so it is shown again.
    expect(dialog).toHaveAttribute("open");
  });

  it("a late close event of a dialog opened again meanwhile is not reported", () => {
    const { onClose } = renderDialog(true);

    fireEvent(screen.getByRole("dialog"), new Event("close"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("a close the parent asked for is not shown again, nor reported", () => {
    const { onClose, rerender } = renderDialog(true);
    rerender(false);
    const dialog = screen.getByRole<HTMLDialogElement>("dialog", { hidden: true });

    fireEvent(dialog, new Event("close"));

    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).not.toHaveAttribute("open");
  });

  it("closes with its named close button", async () => {
    const { onClose } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Đóng" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes with Esc (the dialog's cancel event)", () => {
    const { onClose } = renderDialog();

    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("tells the parent when the browser closes it without a cancel event", () => {
    const { onClose } = renderDialog();

    const dialog = screen.getByRole<HTMLDialogElement>("dialog");
    dialog.close();
    fireEvent(dialog, new Event("close"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("is not open when `open` is false", () => {
    renderDialog(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens again after being closed", async () => {
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            Luật chơi
          </button>
          <Dialog
            open={open}
            title="Luật chơi Cờ caro"
            closeLabel="Đóng"
            onClose={() => {
              setOpen(false);
            }}
          />
        </>
      );
    }
    render(<Opener />);

    await userEvent.click(screen.getByRole("button", { name: "Luật chơi" }));
    await userEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Luật chơi", hidden: true }));

    expect(screen.getByRole("dialog", { name: "Luật chơi Cờ caro" })).toHaveAttribute("open");
  });
});
