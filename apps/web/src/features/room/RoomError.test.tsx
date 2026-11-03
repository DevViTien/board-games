import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { ROOM_PROBLEM, RoomError, roomProblemOf } from "./RoomError";

const menuLink = () => screen.getByRole("link", { name: "Về menu" });

describe("RoomError", () => {
  it("says the room was not found, with a way back to the menu", () => {
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.NotFound} onRetry={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Không tìm thấy phòng" })).toBeInTheDocument();
    expect(screen.getByText(/hết hạn sau 7 ngày/)).toBeInTheDocument();
    expect(menuLink()).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says the room is full, with a way back to the menu", () => {
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.Full} />);

    expect(screen.getByRole("heading", { name: "Phòng đã đủ người" })).toBeInTheDocument();
    expect(menuLink()).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says the app has just been updated, and reloads the page on request", async () => {
    const onReload = vi.fn();
    renderWithIntl(<RoomError problem={ROOM_PROBLEM.Outdated} onReload={onReload} />);

    expect(screen.getByRole("heading", { name: "App vừa được cập nhật" })).toBeInTheDocument();
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
