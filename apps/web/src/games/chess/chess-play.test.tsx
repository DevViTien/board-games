import { createRng, type PlayerIndex } from "@board-games/engine";
import { chess, type ChessMove, type ChessState } from "@board-games/games/chess";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PlayScreen } from "@/features/play/PlayScreen";
import type { GameUI } from "@/games/types";
import { changingTransport } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type { ReadySnapshot } from "@/transport/types";

import { chessEntry } from ".";
import { CLAIM, played, uci } from "./test-helpers";

// The play screen with Cờ vua: the seats as bars around the board, what is said, and an online
// room's updates. Boards are tested in Board.test.tsx.

const ui = chessEntry.open(
  (_definition, gameUi) => gameUi as unknown as GameUI<ChessState, ChessMove>,
);

const MINH = { kind: "remote", name: "Minh" } as const;
const YOU = { kind: "human" } as const;

type ChessSnapshot = ReadySnapshot<ChessState, ChessMove>;

/** Chess after `moves` (UCI, or "claim"), as an online game seen from `viewer`. */
function onlineSnapshot(
  viewer: PlayerIndex,
  moves: readonly string[],
  overrides: Partial<ChessSnapshot> = {},
): ChessSnapshot {
  const toMove = (move: string): ChessMove => (move === "claim" ? CLAIM : uci(move));
  const state = moves.reduce<ChessState>(
    (current, move) => chess.applyMove(current, toMove(move)),
    played(),
  );
  const result = chess.result(state);
  const currentPlayer = chess.currentPlayer(state);
  const last = moves.at(-1);
  return {
    status: "ready",
    state,
    legalMoves: result === null ? chess.legalMoves(state) : [],
    currentPlayer,
    result,
    lastEntry: last === undefined ? null : { move: toMove(last) },
    lastMover:
      moves.length === 0 ? null : last === "claim" ? currentPlayer : (moves.length - 1) % 2,
    moveCount: moves.length,
    canUndo: false,
    canRedo: false,
    canMove: result === null && currentPlayer === viewer,
    viewer,
    seats: viewer === 0 ? [YOU, MINH] : [MINH, YOU],
    waitingFor: result === null && currentPlayer !== viewer ? "opponent" : null,
    inProgress: false,
    supportsUndo: false,
    canStartNewGame: result !== null,
    resign: null,
    turn: null,
    cooperative: false,
    ending: null,
    connection: "online",
    options: {},
    ...overrides,
  };
}

function renderOnline(snapshot: ChessSnapshot) {
  const room = changingTransport(snapshot);
  renderWithIntl(<PlayScreen gameId="chess" transport={room.transport} ui={ui} />);
  return room;
}

async function renderLocal() {
  const transport = createLocalTransport({
    definition: chess,
    store: createMemoryStore(),
    rng: createRng(1),
  });
  renderWithIntl(<PlayScreen gameId="chess" transport={transport} ui={ui} />);
  await screen.findByRole("grid", { name: "Bàn cờ" });
  return transport;
}

const bar = (name: string) => screen.getByRole("group", { name });
const grid = () => screen.getByRole("grid", { name: "Bàn cờ" });
const before = (a: Element, b: Element) =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
const square = (name: string) => screen.getByRole("button", { name });
const status = () => screen.getByRole("status");

describe("PlayScreen with Cờ vua: the seats around the board", () => {
  it("Thanh người chơi quanh bàn Cờ vua: Black above the board, White below it to move, no panel", async () => {
    await renderLocal();

    expect(before(bar("Đen"), grid())).toBe(true);
    expect(before(grid(), bar("Trắng"))).toBe(true);
    expect(within(bar("Trắng")).getByText("Đến lượt")).toBeInTheDocument();
    expect(within(bar("Đen")).queryByText("Đến lượt")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Người chơi" })).not.toBeInTheDocument();
    // Ván mới: nobody is ahead.
    expect(bar("Trắng")).not.toHaveTextContent("Hơn");
    expect(bar("Đen")).not.toHaveTextContent("Hơn");
  });

  it("Thanh đổi chỗ khi lật bàn: White above, Black below", async () => {
    await renderLocal();

    await userEvent.click(screen.getByRole("button", { name: "Lật bàn" }));

    expect(before(bar("Trắng"), grid())).toBe(true);
    expect(before(grid(), bar("Đen"))).toBe(true);
  });

  it("Hơn một Mã: White's bar says a knight and 3 points, Black's nothing", async () => {
    await renderLocal();

    // 1. e4 Nf6 2. Nc3 Ng4 3. Qxg4
    for (const [from, to] of [
      ["e2", "e4"],
      ["g8", "f6"],
      ["b1", "c3"],
      ["f6", "g4"],
      ["d1", "g4"],
    ] as const) {
      await userEvent.click(document.querySelector(`[data-square="${from}"]`) ?? document.body);
      await userEvent.click(document.querySelector(`[data-square="${to}"]`) ?? document.body);
    }

    expect(bar("Trắng")).toHaveTextContent("Hơn 3 điểm: Mã");
    expect(bar("Đen")).not.toHaveTextContent("Hơn");
  });

  it("names the online player on their own bar, with the connection", () => {
    renderOnline(onlineSnapshot(1, []));

    expect(before(bar("Minh · Trắng"), grid())).toBe(true);
    expect(before(grid(), bar("Bạn · Đen"))).toBe(true);
    expect(within(bar("Bạn · Đen")).getByText("Đã kết nối")).toBeInTheDocument();
    expect(within(bar("Minh · Trắng")).getByText("Chơi từ xa")).toBeInTheDocument();
  });
});

describe("PlayScreen with Cờ vua: what is said", () => {
  it("Báo chiếu trên thiết bị dùng chung: one status, and the check read out beside the board", async () => {
    await renderLocal();

    for (const [from, to] of [
      ["e2", "e4"],
      ["f7", "f6"],
      ["d1", "h5"],
    ] as const) {
      await userEvent.click(document.querySelector(`[data-square="${from}"]`) ?? document.body);
      await userEvent.click(document.querySelector(`[data-square="${to}"]`) ?? document.body);
    }

    expect(screen.getAllByRole("status")).toHaveLength(1);
    const check = screen.getByText("Chiếu!").parentElement;
    expect(check).toHaveTextContent("Chiếu! Đen đang bị chiếu");
    expect(check).toHaveAttribute("aria-live", "polite");
  });

  it("Đối thủ đi Mã: the turn line tells Minh's knight move", () => {
    renderOnline(onlineSnapshot(1, ["g1f3"]));

    expect(status()).toHaveTextContent(/^Minh vừa đi Mã g1 tới f3\. Đến lượt bạn \(Đen\)$/);
  });

  it("Đối thủ ăn quân và chiếu: the capture and the check, the check line silent", () => {
    renderOnline(onlineSnapshot(1, ["e2e4", "e7e5", "d1h5", "b8c6", "h5f7"]));

    expect(status()).toHaveTextContent(
      /^Minh vừa đi Hậu h5 ăn quân ở f7, chiếu\. Đến lượt bạn \(Đen\)$/,
    );
    expect(screen.getByText("Chiếu!").parentElement).toHaveAttribute("aria-live", "off");
  });

  it("Đối thủ nhập thành: Minh castled on the king's side", () => {
    renderOnline(
      onlineSnapshot(0, ["e2e4", "e7e5", "g1f3", "g8f6", "f1c4", "f8c5", "b1c3", "e8g8"]),
    );

    expect(status()).toHaveTextContent(/^Minh vừa nhập thành cánh vua\. Đến lượt bạn \(Trắng\)$/);
  });

  it("Thắng bằng chiếu hết: Black wins, by checkmate, 0–1 on the sheet", () => {
    renderOnline(onlineSnapshot(1, ["f2f3", "e7e5", "g2g4", "d8h4"]));

    expect(status()).toHaveTextContent("Bạn thắng!");
    expect(screen.getByText("Chiếu hết")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Sổ ghi" })).getByText("0–1"),
    ).toBeInTheDocument();
  });

  it("Đòi hoà khi lặp lại ba lần: the result card says who claimed and why", async () => {
    await renderLocal();

    for (const [from, to] of [
      ["g1", "f3"],
      ["g8", "f6"],
      ["f3", "g1"],
      ["f6", "g8"],
      ["g1", "f3"],
      ["g8", "f6"],
      ["f3", "g1"],
      ["f6", "g8"],
    ] as const) {
      await userEvent.click(document.querySelector(`[data-square="${from}"]`) ?? document.body);
      await userEvent.click(document.querySelector(`[data-square="${to}"]`) ?? document.body);
    }
    await userEvent.click(screen.getByRole("button", { name: "Đòi hoà" }));

    expect(status()).toHaveTextContent("Hoà!");
    expect(screen.getByText("Trắng đòi hoà: thế cờ lặp lại ba lần")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đòi hoà" })).not.toBeInTheDocument();
  });

  it("Đối thủ ở xa không thấy nút: no claim on the screen of the one waiting", () => {
    // Minh (White) may claim: the start position for the third time, Minh to move.
    const snapshot = onlineSnapshot(1, [
      "g1f3",
      "g8f6",
      "f3g1",
      "f6g8",
      "g1f3",
      "g8f6",
      "f3g1",
      "f6g8",
    ]);
    expect(snapshot.legalMoves).toContainEqual(CLAIM);

    renderOnline(snapshot);

    expect(screen.queryByRole("button", { name: "Đòi hoà" })).not.toBeInTheDocument();
  });
});

describe("PlayScreen with Cờ vua: an online room's updates", () => {
  it("Đối thủ nối lại khi đang chọn quân: the knight stays selected", async () => {
    const room = renderOnline(onlineSnapshot(0, []));
    await userEvent.click(square("Mã trắng ở g1"));

    // Minh reconnects: the room changes, the position does not; the state is rebuilt.
    room.change({ ...onlineSnapshot(0, []), seats: [YOU, { kind: "remote", name: "Minh Anh" }] });

    expect(screen.getAllByRole("gridcell", { selected: true })).toHaveLength(1);
    expect(screen.getByRole("gridcell", { selected: true })).toContainElement(
      square("Mã trắng ở g1"),
    );
    expect(hasTargets()).toEqual(["f3", "h3"]);
  });

  it("Bàn bị khoá khi bộ chọn đang mở: the picker closes, no move is sent, nothing selected", async () => {
    const room = renderOnline(onlineSnapshot(0, []));
    // A pawn on the seventh rank, as if after a long game.
    const promote = {
      fen: "8/4P3/8/8/8/8/k7/4K3 w - - 0 1",
      positions: ["8/4P3/8/8/8/8/k7/4K3 w - -"],
      san: [],
      drawClaim: null,
    } satisfies ChessState;
    room.change({ state: promote, legalMoves: chess.legalMoves(promote) });
    await userEvent.click(square("Tốt trắng ở e7"));
    await userEvent.click(square("Ô e8 trống"));
    expect(screen.getByRole("dialog", { name: "Tốt e7 → e8" })).toBeInTheDocument();

    room.change({ connection: "reconnecting", canMove: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("gridcell", { selected: true })).toHaveLength(0);
    expect(room.transport.submit).not.toHaveBeenCalled();
  });
});

/** The squares described as reachable. */
function hasTargets() {
  return [...document.querySelectorAll<HTMLElement>("[data-square]")]
    .filter((button) =>
      (button.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .some((id) => document.getElementById(id)?.textContent === "Đi tới được"),
    )
    .map((button) => button.dataset.square)
    .sort();
}
