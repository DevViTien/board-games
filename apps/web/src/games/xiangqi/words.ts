import type { GameResult, PlayerIndex } from "@board-games/engine";
import {
  isRedPiece,
  kindOf,
  XIANGQI_REASON,
  xiangqiInCheck,
  type XiangqiKind,
  type XiangqiMove,
  type XiangqiState,
} from "@board-games/games/xiangqi";
import { useTranslations } from "next-intl";

import type { SeatSummary } from "../types";

/** The kinds by their letter in the notation. */
const KIND_OF_LETTER: Readonly<Record<string, XiangqiKind>> = {
  Tg: "k",
  S: "a",
  T: "e",
  M: "h",
  X: "r",
  P: "c",
  B: "p",
};
/** Kinds whose forward or backward move ends on a column, not after a number of steps. */
const DIAGONAL: ReadonlySet<XiangqiKind> = new Set(["a", "e", "h"]);

/** Seat 0 is Đỏ and moves first; seat 1 is Đen. */
export function useXiangqiPlayerLabel(): (player: PlayerIndex) => string {
  const t = useTranslations("Games.xiangqi.players");
  return (player) => (player === 0 ? t("red") : t("black"));
}

/**
 * Hook reading a move's notation in words (design §3): "Pháo cột 2 bình sang cột 5", "Mã cột 8
 * tiến lên cột 7", "Xe trước thoái 1". Anything it cannot read is given back as it is.
 */
export function useDescribeNotation(): (note: string) => string {
  const t = useTranslations("Games.xiangqi");
  return (note) => {
    // A mark ("t", "g", "s", or a place from the front) may come before the column: "Bt7.1".
    const parsed = /^(Tg|S|T|M|X|P|B)([tsg1-5]?)([1-9tsg])([./-])(\d)$/u.exec(note);
    if (parsed === null) return note;
    const [, letter = "", mark = "", where = "", sign = "", end = ""] = parsed;
    const kind = KIND_OF_LETTER[letter];
    if (kind === undefined) return note;
    const markWord = (value: string) =>
      value === "t"
        ? t("words.front")
        : value === "s"
          ? t("words.back")
          : value === "g"
            ? t("words.middle")
            : t("words.nth", { n: value });
    const place =
      mark !== ""
        ? t("words.markColumn", { mark: markWord(mark), column: t("words.column", { n: where }) })
        : /\d/u.test(where)
          ? t("words.column", { n: where })
          : markWord(where);
    const n = Number(end);
    const action =
      sign === "-"
        ? t("words.side", { n })
        : sign === "."
          ? DIAGONAL.has(kind)
            ? t("words.forwardTo", { n })
            : t("words.forward", { n })
          : DIAGONAL.has(kind)
            ? t("words.backTo", { n })
            : t("words.backward", { n });
    return t("words.line", { piece: t(`pieces.${kind}`), place, action });
  };
}

/**
 * A move read out as what was done, to follow a name ("Minh vừa đi Pháo cột 2 bình sang cột 5"),
 * with ", chiếu" when it gives check: its notation is the last of `state.notes` (the state after).
 */
export function useXiangqiMoveLabel(): (move: XiangqiMove, state: XiangqiState) => string {
  const t = useTranslations("Games.xiangqi");
  const describe = useDescribeNotation();
  return (_move, state) => {
    const note = state.notes.at(-1);
    const words = t("move.played", { move: note === undefined ? "" : describe(note) });
    return xiangqiInCheck(state) ? t("move.check", { move: words }) : words;
  };
}

/** The result card's line: how the game ended (spec "Kết quả ván Cờ tướng"). */
export function useXiangqiResultDetail(): (
  result: GameResult,
  state: XiangqiState,
) => string | null {
  const t = useTranslations("Games.xiangqi.result");
  const playerLabel = useXiangqiPlayerLabel();
  return (result, state) => {
    switch (result.reason) {
      case XIANGQI_REASON.Checkmate:
        return t("checkmate");
      case XIANGQI_REASON.NoMoves:
        return t("noMoves", { player: playerLabel(state.toMove) });
      case XIANGQI_REASON.PerpetualCheck:
        return t("perpetualCheck", { player: playerLabel(state.ending?.loser ?? 0) });
      case XIANGQI_REASON.Repetition:
        return t("repetition");
      case XIANGQI_REASON.Quiet:
        return t("quiet");
      default:
        return null;
    }
  };
}

/** What each kind is worth for the summary only (spec "Thanh người chơi Cờ tướng"). */
const POINTS: Readonly<Record<XiangqiKind, number>> = { k: 0, r: 9, c: 5, h: 4, e: 2, a: 2, p: 1 };

/** How many points `player` is up on the board (negative: down). */
function xiangqiLead(state: XiangqiState, player: PlayerIndex): number {
  let lead = 0;
  for (const piece of state.board) {
    if (piece == null) continue;
    const points = POINTS[kindOf(piece)];
    lead += (isRedPiece(piece) ? 0 : 1) === player ? points : -points;
  }
  return lead;
}

/** A seat's line beside the board: for the side ahead, its points up ("Hơn 9 điểm", "+9"). */
export function useXiangqiSeatSummary(): (
  player: PlayerIndex,
  state: XiangqiState,
) => SeatSummary | null {
  const t = useTranslations("Games.xiangqi.summary");
  return (player, state) => {
    const points = xiangqiLead(state, player);
    return points <= 0 ? null : { full: t("full", { points }), short: t("short", { points }) };
  };
}
