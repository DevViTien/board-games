import type { PlayerIndex } from "@board-games/engine";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Locale } from "@/i18n/config";
import { AI, roomView } from "@/test/fake-realtime";
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
    expect(players()).toEqual(["MinhChủ phòng", "Đang chờ…"]);
  });

  it("shows every seat of a room for three, the creator first and two seats waiting", () => {
    renderLobby({ seats: ["Minh", null, null] });

    expect(players()).toEqual(["MinhChủ phòng", "Đang chờ…", "Đang chờ…"]);
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
    const { onSit } = renderLobby();
    const field = screen.getByRole("textbox", { name: "Tên của bạn" });
    await userEvent.clear(field);
    await userEvent.type(field, "   ");

    await sit();

    expect(onSit).not.toHaveBeenCalled();
    expect(field).toHaveAccessibleDescription("Tên cần có từ 1 đến 24 ký tự.");
    expect(field).toHaveFocus();
  });

  it("asks a visitor without a name for one: an empty field with the focus and a hint", () => {
    const { onSit } = renderLobby({ name: "" });
    const field = screen.getByRole("textbox", { name: "Tên của bạn" });

    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription("Mọi người trong phòng sẽ thấy tên này.");
    expect(sitButton()).toBeInTheDocument();
    expect(onSit).not.toHaveBeenCalled();
  });

  it("refuses an empty name from a visitor without one, the error read with the hint", async () => {
    const { onSit } = renderLobby({ name: "" });

    await sit();

    expect(onSit).not.toHaveBeenCalled();
    const field = screen.getByRole("textbox", { name: "Tên của bạn" });
    expect(field).toHaveAccessibleDescription(
      "Mọi người trong phòng sẽ thấy tên này. Tên cần có từ 1 đến 24 ký tự.",
    );
    expect(field).toHaveFocus();
  });

  it("leaves the focus alone for a player who has a name", () => {
    renderLobby();

    const field = screen.getByRole("textbox", { name: "Tên của bạn" });
    expect(field).not.toHaveFocus();
    expect(field).not.toHaveAccessibleDescription();
  });

  it("does not ask twice while the seat is on its way", async () => {
    const { onSit } = renderLobby();

    await sit();
    await sit();

    expect(onSit).toHaveBeenCalledOnce();
  });

  it("marks the player's own seat, and waits for friends without a join button", () => {
    renderLobby({ you: 0 });

    expect(players()).toEqual(["Minh (bạn)Chủ phòng", "Đang chờ…"]);
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

describe("RoomLobby AI seats", () => {
  /** The lobby of a Cờ cá ngựa room as `you` sees it, Lan its host in the first seat. */
  interface AiLobbyOptions {
    readonly seats?: readonly (string | typeof AI | null)[];
    readonly you?: PlayerIndex | null;
    readonly supportsAI?: boolean;
    readonly moves?: number;
    readonly onAiSeat?: (seat: PlayerIndex, on: boolean) => boolean;
    readonly aiSeatRefusals?: number;
    readonly locale?: Locale;
  }

  function renderAiLobby({
    seats = ["Lan", null, null],
    you = 0,
    supportsAI = true,
    moves = 0,
    onAiSeat = vi.fn(() => true),
    aiSeatRefusals = 0,
    locale = "vi",
  }: AiLobbyOptions = {}) {
    const room = roomView({ seats, revision: 3 });
    const props = {
      gameId: "ludo" as const,
      supportsAI,
      you,
      status: "online" as const,
      name: "Lan",
      onSit: vi.fn(() => true),
      onAiSeat,
      onResume: vi.fn(),
    };
    const withMoves = {
      ...room,
      record: { ...room.record, entries: Array.from({ length: moves }, () => ({ move: {} })) },
    };
    const view = renderWithIntl(
      <RoomLobby {...props} room={withMoves} aiSeatRefusals={aiSeatRefusals} />,
      { locale },
    );
    return {
      onAiSeat,
      rerender: (next: { seats?: typeof seats; revision?: number; aiSeatRefusals?: number }) => {
        view.rerender(
          <RoomLobby
            {...props}
            room={{
              ...withMoves,
              ...roomView({ seats: next.seats ?? seats, revision: next.revision ?? 3 }),
            }}
            aiSeatRefusals={next.aiSeatRefusals ?? aiSeatRefusals}
          />,
        );
      },
    };
  }

  const addButtons = () => screen.queryAllByRole("button", { name: /^Cho máy chơi ghế/ });
  const removeButtons = () => screen.queryAllByRole("button", { name: /^Bỏ máy ở ghế/ });

  it("shows an AI seat as the computer's and marks the host", () => {
    renderAiLobby({ seats: ["Lan", AI, null], you: null });

    expect(players()).toEqual(["LanChủ phòng", "Máy", "Đang chờ…"]);
  });

  it("offers the host to let the computer play each empty seat, named by its number", async () => {
    const { onAiSeat } = renderAiLobby({ seats: ["Lan", null, null, null] });

    expect(addButtons().map((button) => button.textContent)).toEqual([
      "Cho máy chơi",
      "Cho máy chơi",
      "Cho máy chơi",
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Cho máy chơi ghế 3" }));

    expect(onAiSeat).toHaveBeenCalledWith(2, true);
  });

  it("Ghế trống cuối cùng báo bắt đầu ván: says the game starts with the last empty seat", () => {
    renderAiLobby({ seats: ["Lan", "An", null] });

    expect(
      screen.getByRole("button", { name: "Cho máy chơi ghế 3 và bắt đầu ván" }),
    ).toBeInTheDocument();
  });

  it("Bỏ máy ở sảnh chờ: turns the seat back into a waiting one, the focus kept on its button", async () => {
    const { onAiSeat, rerender } = renderAiLobby({ seats: ["Lan", null, AI] });
    const remove = screen.getByRole("button", { name: "Bỏ máy ở ghế 3" });

    await userEvent.click(remove);
    expect(onAiSeat).toHaveBeenCalledWith(2, false);
    expect(remove).toHaveAttribute("aria-disabled", "true");
    rerender({ seats: ["Lan", null, null], revision: 4 });

    expect(players()[2]).toBe("Đang chờ…Cho máy chơi");
    const add = screen.getByRole("button", { name: "Cho máy chơi ghế 3" });
    expect(add).toHaveFocus();
    expect(add).not.toHaveAttribute("aria-disabled", "true");
  });

  it("waits no more once the server refused the request", async () => {
    const { onAiSeat, rerender } = renderAiLobby({ seats: ["Lan", null, null] });
    await userEvent.click(screen.getByRole("button", { name: "Cho máy chơi ghế 2" }));
    expect(screen.getByRole("button", { name: "Cho máy chơi ghế 2" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "Cho máy chơi ghế 3" }));
    expect(onAiSeat).toHaveBeenCalledOnce();

    rerender({ aiSeatRefusals: 1 });

    expect(screen.getByRole("button", { name: "Cho máy chơi ghế 2" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("keeps waiting while the room changes for something else, until the seat is as asked", async () => {
    const { rerender } = renderAiLobby({ seats: ["Lan", null, null, null] });
    await userEvent.click(screen.getByRole("button", { name: "Cho máy chơi ghế 3" }));

    // Someone sits in the second seat: the request is not answered by that.
    rerender({ seats: ["Lan", "An", null, null], revision: 4 });
    expect(screen.getByRole("button", { name: "Cho máy chơi ghế 3" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    rerender({ seats: ["Lan", "An", AI, null], revision: 5 });
    expect(screen.getByRole("button", { name: "Bỏ máy ở ghế 3" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it.each(["vi", "en", "ja"] as const)(
    "names each AI button by its visible words first, in %s",
    (locale) => {
      renderAiLobby({ seats: ["Lan", null, AI, null], locale });

      const buttons = screen
        .getAllByRole("button")
        .filter((button) => button.hasAttribute("aria-label"));
      expect(buttons).toHaveLength(3);
      for (const button of buttons) {
        const label = button.getAttribute("aria-label") ?? "";
        expect(label.startsWith(button.textContent)).toBe(true);
      }
    },
  );

  it("Phòng hai ghế: offers no AI seat in a room for two", () => {
    renderAiLobby({ seats: ["Lan", null] });

    expect(addButtons()).toEqual([]);
  });

  it("Người khác không thấy nút: shows no AI buttons to anyone but the host", () => {
    renderAiLobby({ seats: ["Lan", "An", null, AI], you: 1 });

    expect(addButtons()).toEqual([]);
    expect(removeButtons()).toEqual([]);
  });

  it("shows no AI buttons to someone without a seat", () => {
    renderAiLobby({ seats: ["Lan", null, AI], you: null });

    expect(addButtons()).toEqual([]);
    expect(removeButtons()).toEqual([]);
  });

  it("Game không hỗ trợ máy: offers no AI seat for a game without an AI", () => {
    renderAiLobby({ supportsAI: false });

    expect(addButtons()).toEqual([]);
  });

  it("offers no AI buttons once the game has a move", () => {
    renderAiLobby({ seats: ["Lan", null, AI], moves: 1 });

    expect(addButtons()).toEqual([]);
    expect(removeButtons()).toEqual([]);
  });

  it("offers the host buttons at empty and AI seats only", () => {
    renderAiLobby({ seats: ["Lan", "An", AI, null] });

    expect(removeButtons().map((button) => button.getAttribute("aria-label"))).toEqual([
      "Bỏ máy ở ghế 3",
    ]);
    expect(addButtons().map((button) => button.getAttribute("aria-label"))).toEqual([
      "Cho máy chơi ghế 4 và bắt đầu ván",
    ]);
  });
});
