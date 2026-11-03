/** The two sides, as `chess.js` and FEN name them: seat 0 plays White and moves first, seat 1 Black. */
export const CHESS_COLOR = {
  White: "w",
  Black: "b",
} as const;

export type ChessColor = (typeof CHESS_COLOR)[keyof typeof CHESS_COLOR];

/** Piece types, lowercase as in FEN and `chess.js`. Codes only: the app names and draws them. */
export const CHESS_PIECE = {
  King: "k",
  Queen: "q",
  Rook: "r",
  Bishop: "b",
  Knight: "n",
  Pawn: "p",
} as const;

export type ChessPieceType = (typeof CHESS_PIECE)[keyof typeof CHESS_PIECE];

/**
 * What a pawn reaching the last rank may become, in the order the promotion picker shows them.
 * `legalMoves` lists the four promotion moves of a pawn in this order too.
 */
export const CHESS_PROMOTION_PIECES = [
  CHESS_PIECE.Queen,
  CHESS_PIECE.Rook,
  CHESS_PIECE.Bishop,
  CHESS_PIECE.Knight,
] as const;

export type ChessPromotionPiece = (typeof CHESS_PROMOTION_PIECES)[number];

/** Why a game ended (`GameResult.reason`); the app translates them. */
export const CHESS_RESULT_REASON = {
  Checkmate: "checkmate",
  Stalemate: "stalemate",
  InsufficientMaterial: "insufficient-material",
  ThreefoldClaim: "threefold-claim",
  FiftyMoveClaim: "fifty-move-claim",
  FivefoldRepetition: "fivefold-repetition",
  SeventyFiveMove: "seventy-five-move",
} as const;

export type ChessResultReason = (typeof CHESS_RESULT_REASON)[keyof typeof CHESS_RESULT_REASON];

/** The `type` of the claim-a-draw move, and its move key. */
export const CHESS_CLAIM_DRAW = "claim-draw";

/** Files from White's left, ranks from White's side. */
export const CHESS_FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const CHESS_RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type ChessSquare = `${(typeof CHESS_FILES)[number]}${(typeof CHESS_RANKS)[number]}`;

/** Times the same position must have occurred for the player to move to claim a draw. */
export const CLAIM_REPETITIONS = 3;
/** Half-moves without a pawn move or a capture after which the player to move may claim a draw. */
export const CLAIM_HALF_MOVES = 100;
/** Times the same position must occur for the game to end in a draw by itself. */
export const AUTOMATIC_REPETITIONS = 5;
/** Half-moves without a pawn move or a capture after which the game ends in a draw by itself. */
export const AUTOMATIC_HALF_MOVES = 150;
