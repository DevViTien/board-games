import {
  CHESS_PIECE,
  type ChessPieceType,
  type ChessPromotionPiece,
} from "@board-games/games/chess";
import { useTranslations } from "next-intl";

/** How a move ends: nothing, check or checkmate. */
type SanCheck = "check" | "mate" | null;

/** A move in standard algebraic notation (`Nbd2`, `exd5`, `e8=Q+`, `O-O`), taken apart. */
export type ParsedSan =
  | { readonly castle: "king" | "queen"; readonly check: SanCheck }
  | {
      readonly castle: null;
      readonly piece: ChessPieceType;
      /** The file, rank or square telling two pieces apart (`b` of `Nbd2`, `e` of `exd5`), or "". */
      readonly disambiguation: string;
      readonly capture: boolean;
      readonly to: string;
      readonly promotion: ChessPromotionPiece | null;
      readonly check: SanCheck;
    };

const CASTLE = /^(O-O(?:-O)?)([+#])?$/;
const MOVE = /^([KQRBN])?([a-h]?[1-8]?)(x)?([a-h][1-8])(?:=([QRBN]))?([+#])?$/;

const PIECE_OF_LETTER: Readonly<Record<string, ChessPieceType>> = {
  K: CHESS_PIECE.King,
  Q: CHESS_PIECE.Queen,
  R: CHESS_PIECE.Rook,
  B: CHESS_PIECE.Bishop,
  N: CHESS_PIECE.Knight,
};

const PROMOTION_OF_LETTER: Readonly<Record<string, ChessPromotionPiece>> = {
  Q: CHESS_PIECE.Queen,
  R: CHESS_PIECE.Rook,
  B: CHESS_PIECE.Bishop,
  N: CHESS_PIECE.Knight,
};

function checkOf(mark: string | undefined): SanCheck {
  if (mark === "+") return "check";
  if (mark === "#") return "mate";
  return null;
}

/** Takes a move of the score sheet (`state.san`, written by the rules) apart; throws on anything else. */
export function parseSan(san: string): ParsedSan {
  const castle = CASTLE.exec(san);
  if (castle !== null) {
    return { castle: castle[1] === "O-O" ? "king" : "queen", check: checkOf(castle[2]) };
  }
  const move = MOVE.exec(san);
  if (move === null) throw new Error(`Not a move in algebraic notation: ${san}`);
  const [, piece, disambiguation = "", capture, to = "", promotion, check] = move;
  return {
    castle: null,
    piece: piece === undefined ? CHESS_PIECE.Pawn : (PIECE_OF_LETTER[piece] ?? CHESS_PIECE.Pawn),
    disambiguation,
    capture: capture !== undefined,
    to,
    promotion: promotion === undefined ? null : (PROMOTION_OF_LETTER[promotion] ?? null),
    check: checkOf(check),
  };
}

/**
 * Hook returning how a move of the score sheet is read out ("Mã f3", "Tốt e ăn d5, chiếu", "Nhập
 * thành cánh vua", "Tốt e8 phong Hậu, chiếu hết"): the sheet shows figurines, which a screen reader
 * cannot read.
 */
export function useDescribeSan(): (san: string) => string {
  const t = useTranslations("Games.chess");
  return (san) => {
    const parsed = parseSan(san);
    let words: string;
    if (parsed.castle !== null) {
      words = t(parsed.castle === "king" ? "san.castleKing" : "san.castleQueen");
    } else {
      const piece = t(`pieces.${parsed.piece}`);
      const from = parsed.disambiguation;
      const { to } = parsed;
      if (parsed.capture) {
        words =
          from === "" ? t("san.capture", { piece, to }) : t("san.captureFrom", { piece, from, to });
      } else {
        words =
          from === "" ? t("san.quiet", { piece, to }) : t("san.quietFrom", { piece, from, to });
      }
      if (parsed.promotion !== null) {
        words = t("san.promotion", { move: words, piece: t(`pieces.${parsed.promotion}`) });
      }
    }
    if (parsed.check === "check") return t("san.check", { move: words });
    if (parsed.check === "mate") return t("san.mate", { move: words });
    return words;
  };
}
