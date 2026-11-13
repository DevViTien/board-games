import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./ConfirmDialog";

// Focus trapping and Esc are browser behaviour of <dialog>; they are checked end to end in
// Playwright. These tests cover only what the component itself does.

function renderDialog(open = true) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const dialog = (isOpen: boolean) => (
    <ConfirmDialog
      open={isOpen}
      title="Bắt đầu ván mới?"
      description="Ván đang chơi sẽ bị bỏ."
      confirmLabel="Ván mới"
      cancelLabel="Tiếp tục chơi"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
  const view = render(dialog(open));
  return {
    onConfirm,
    onCancel,
    rerender: (isOpen: boolean) => {
      view.rerender(dialog(isOpen));
    },
  };
}

describe("ConfirmDialog", () => {
  it("shows the title, description and both buttons when open", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "Bắt đầu ván mới?" });
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription("Ván đang chơi sẽ bị bỏ.");
    expect(screen.getByRole("button", { name: "Ván mới" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiếp tục chơi" })).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is pressed", async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Ván mới" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when the cancel button is pressed", async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.click(screen.getByRole("button", { name: "Tiếp tục chơi" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel when the browser closes the dialog without a cancel event", () => {
    // Chromium's close watcher may skip `cancel` (repeated Esc without user activation) and close
    // the dialog directly; the parent must still learn that it is closed, or it cannot reopen it.
    const { onConfirm, onCancel } = renderDialog();

    const dialog = screen.getByRole<HTMLDialogElement>("dialog");
    dialog.close();
    fireEvent(dialog, new Event("close"));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not call onCancel when the parent itself closes the dialog", () => {
    const { onCancel, rerender } = renderDialog();
    rerender(false);

    fireEvent(screen.getByRole("dialog", { hidden: true }), new Event("close"));

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("is not open when `open` is false", () => {
    renderDialog(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the confirm button focusable but inert while it cannot be pressed, saying why", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Đầu hàng ván này?"
        confirmLabel="Đầu hàng"
        cancelLabel="Chơi tiếp"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        confirmUnavailableReason="Chờ kết nối lại với máy chủ"
      />,
    );
    const confirm = screen.getByRole("button", { name: "Đầu hàng" });

    await userEvent.click(confirm);

    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(confirm).toHaveAccessibleDescription("Chờ kết nối lại với máy chủ");
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("ConfirmDialog with choices", () => {
  it("shows its choices between the question and the buttons", () => {
    render(
      <ConfirmDialog
        open
        title="Đổi bản đồ"
        confirmLabel="Bắt đầu ván mới"
        cancelLabel="Huỷ"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        wide
      >
        <input type="radio" aria-label="Tiệm chè" />
      </ConfirmDialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Đổi bản đồ" });
    const radio = screen.getByRole("radio", { name: "Tiệm chè" });
    const confirm = screen.getByRole("button", { name: "Bắt đầu ván mới" });
    expect(dialog).toContainElement(radio);
    expect(radio.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
