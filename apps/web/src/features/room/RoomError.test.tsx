import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { ROOM_PROBLEM, roomProblemOf } from "./room-problem";
import { RoomError } from "./RoomError";

const menuLink = () => within(screen.getByRole("main")).getByRole("link", { name: "Về menu" });

describe("RoomError", () => {
  it("says the room was not found, with a way back to the menu", () => {
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.NotFound} onRetry={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Không tìm thấy phòng" })).toBeInTheDocument();
    expect(screen.getByText(/hết hạn sau 7 ngày/)).toBeInTheDocument();
    expect(menuLink()).toHaveAttribute("href", "/");
    expect(within(screen.getByRole("main")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("says the room is full, with a way back to the menu", () => {
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.Full} />);

    expect(screen.getByRole("heading", { name: "Phòng đã đủ người" })).toBeInTheDocument();
    expect(menuLink()).toHaveAttribute("href", "/");
    expect(within(screen.getByRole("main")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("says the app has just been updated, and reloads the page on request", async () => {
    const onReload = vi.fn();
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.Outdated} onReload={onReload} />);

    expect(screen.getByRole("heading", { name: "Ứng dụng vừa được cập nhật" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tải lại trang" }));

    expect(onReload).toHaveBeenCalledOnce();
    expect(menuLink()).toBeInTheDocument();
  });

  it("says the room cannot be opened, and tries again on request", async () => {
    const onRetry = vi.fn();
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.Broken} onRetry={onRetry} />);

    expect(screen.getByRole("heading", { name: "Không mở được phòng" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(menuLink()).toBeInTheDocument();
  });

  it("gives its title the focus when it replaces another screen, and only then", () => {
    const { unmount } = renderWithIntl(<RoomError problem={ROOM_PROBLEM.NotFound} focusTitle />);

    expect(screen.getByRole("heading", { name: "Không tìm thấy phòng" })).toHaveFocus();
    unmount();

    // A page of its own (a code that cannot be one): the browser's focus is left alone.
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.NotFound} />);
    expect(screen.getByRole("heading", { name: "Không tìm thấy phòng" })).not.toHaveFocus();
  });

  it("renders in Japanese", () => {
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.Full} />, { locale: "ja" });

    expect(screen.getByRole("heading", { name: "ルームは満員です" })).toBeInTheDocument();
  });

  it("tells each way a connection gives up apart", () => {
    expect(roomProblemOf("room-not-found")).toBe(ROOM_PROBLEM.NotFound);
    expect(roomProblemOf("room-full")).toBe(ROOM_PROBLEM.Full);
    expect(roomProblemOf("outdated-client")).toBe(ROOM_PROBLEM.Outdated);
    expect(roomProblemOf("corrupt-record")).toBe(ROOM_PROBLEM.Broken);
    expect(roomProblemOf(null)).toBe(ROOM_PROBLEM.Broken);
  });
});
