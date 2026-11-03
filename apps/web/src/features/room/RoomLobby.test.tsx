import type { PlayerIndex } from "@board-games/engine";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { roomView } from "@/test/fake-realtime";
import { renderWithIntl } from "@/test/render-with-intl";

import { RoomLobby } from "./RoomLobby";

// The lobby remembers nothing itself: the room page saves the name chosen here (RoomRoute.test).
afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
  vi.restoreAllMocks();
});

function renderLobby({
  seats = ["Minh", null],
  you = null,
  name = "Lan",
  onSit = vi.fn(() => true),
}: {
  seats?: readonly (string | null)[];
  you?: PlayerIndex | null;
  name?: string;
  onSit?: (name: string) => boolean;
} = {}) {
  renderWithIntl(
    <RoomLobby
      gameId="tictactoe"
      room={roomView({ seats })}
      you={you}
      status="online"
      name={name}
      onSit={onSit}
      onResume={vi.fn()}
    />,
  );
  return { onSit };
}

const players = () =>
  within(screen.getByRole("region", { name: "Người chơi" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);
const sitButton = () => screen.queryByRole("button", { name: "Vào chơi" });
const sit = () => userEvent.click(screen.getByRole("button", { name: "Vào chơi" }));
const inviteLink = () => screen.getByRole("textbox", { name: "Link mời" });

describe("RoomLobby", () => {
  it("shows the game, the code, the invite link and who sits where", () => {
    renderLobby();

    expect(screen.getByRole("heading", { level: 1, name: "Tic-tac-toe" })).toBeInTheDocument();
    expect(screen.getByText("ABC234")).toBeInTheDocument();
    expect(inviteLink()).toHaveValue(`${window.location.origin}/room/ABC234`);
    expect(players()).toEqual(["Minh", "Đang chờ…"]);
  });

  it("offers a player without a seat to join, under the remembered name, without taking a seat", () => {
    const { onSit } = renderLobby();

    expect(sitButton()).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tên của bạn" })).toHaveValue("Lan");
    expect(onSit).not.toHaveBeenCalled();
  });

  it("takes a seat under the name in the field, trimmed", async () => {
    const { onSit } = renderLobby();
    const field = screen.getByRole("textbox", { name: "Tên của bạn" });

    await userEvent.clear(field);
    await userEvent.type(field, "  Lan Anh ");
    await sit();

    expect(onSit).toHaveBeenCalledExactlyOnceWith("Lan Anh");
  });

  it("does not sit with a name the server would refuse, and takes the player back to the field", async () => {
    const { onSit } = renderLobby({ name: "" });

    await sit();

    expect(onSit).not.toHaveBeenCalled();
    const field = screen.getByRole("textbox", { name: "Tên của bạn" });
    expect(field).toHaveAccessibleDescription("Tên cần có từ 1 đến 24 ký tự.");
    expect(field).toHaveFocus();
  });

  it("does not ask twice while the seat is on its way", async () => {
    const { onSit } = renderLobby();

    await sit();
    await sit();

    expect(onSit).toHaveBeenCalledOnce();
  });

  it("marks the player's own seat, and waits for friends without a join button", () => {
    renderLobby({ you: 0 });

    expect(players()).toEqual(["Minh (bạn)", "Đang chờ…"]);
    expect(sitButton()).not.toBeInTheDocument();
    expect(screen.getByText(/Gửi link mời cho bạn bè/)).toBeInTheDocument();
  });

  it("copies the invite link, and says so", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderLobby({ you: 0 });

    await user.click(screen.getByRole("button", { name: "Sao chép link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/room/ABC234`);
    expect(screen.getByText("Đã sao chép link mời.")).toBeInTheDocument();
  });

  it("selects the link to copy by hand when the clipboard refuses", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    renderLobby({ you: 0 });

    await user.click(screen.getByRole("button", { name: "Sao chép link" }));

    const link = inviteLink();
    expect(link).toHaveFocus();
    expect(link).toHaveProperty("selectionStart", 0);
    expect(link).toHaveProperty("selectionEnd", link.getAttribute("value")?.length);
    expect(screen.getByText(/Chưa sao chép được/)).toBeInTheDocument();
  });

  it("offers to share only where the browser can", () => {
    renderLobby({ you: 0 });
    expect(screen.queryByRole("button", { name: "Chia sẻ" })).not.toBeInTheDocument();
  });

  it("shares the invite link where the browser can", async () => {
    const share = vi.fn(() => Promise.resolve());
    // jsdom has no Web Share API, as desktop Firefox.
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderLobby({ you: 0 });

    await userEvent.click(screen.getByRole("button", { name: "Chia sẻ" }));

    expect(share).toHaveBeenCalledWith({
      title: "Chơi Tic-tac-toe với mình",
      url: `${window.location.origin}/room/ABC234`,
    });
  });
});

describe("RoomLobby rules", () => {
  it("names the room's rules before the player joins", () => {
    renderWithIntl(
      <RoomLobby
        gameId="caro"
        room={{
          ...roomView({ seats: ["Minh", null] }),
          gameId: "caro",
          record: {
            version: 1,
            gameId: "caro",
            playerCount: 2,
            options: { size: 19, rule: "free" },
            entries: [],
          },
        }}
        optionChoices={[
          { name: "size", values: [15, 19] },
          { name: "rule", values: ["blocked-ends", "free"] },
        ]}
        you={null}
        status="online"
        name="Lan"
        onSit={vi.fn(() => true)}
        onResume={vi.fn()}
      />,
    );

    expect(screen.getByText("Luật: 19×19 · Tự do")).toBeInTheDocument();
    expect(sitButton()).toBeInTheDocument();
  });

  it("names no rules for a game without rule options", () => {
    renderLobby();

    expect(screen.queryByText(/^Luật/)).not.toBeInTheDocument();
  });
});
