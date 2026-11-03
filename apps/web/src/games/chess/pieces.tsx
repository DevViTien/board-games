import type { ChessColor, ChessPieceType } from "@board-games/games/chess";
import { cn } from "@board-games/ui";

// The pieces are Lichess's "staunty" set by sadsnake1 (CC BY-NC-SA 4.0), served unmodified from
// `public/pieces/staunty/` with their licence beside them (design §4 of add-chess-board). Drawn as
// images, never inlined nor edited: a changed copy would have to be shared alike. Their colours are
// their own (White #f0f0f0 edged #3c3c3c, Black #5f5955 edged #1e1e1e), mirrored by the chess
// tokens `--chess-piece-light`, `--game-mark-1`, `--chess-piece-dark`, `--game-mark-2` so the
// contrast tests check them against the squares.

/** The folder the piece files are served from. */
const PIECES_URL = "/pieces/staunty";

/** The address of a piece's file: `/pieces/staunty/wN.svg`. */
export function pieceSrc(colour: ChessColor, type: ChessPieceType): string {
  return `${PIECES_URL}/${colour}${type.toUpperCase()}.svg`;
}

/**
 * Each piece as a silhouette in the colour of the text (a figurine of the score sheet), masked by
 * its file. Written out so Tailwind finds every class.
 */
const FIGURINE_MASK: Readonly<Record<ChessPieceType, string>> = {
  k: "[mask-image:url(/pieces/staunty/wK.svg)]",
  q: "[mask-image:url(/pieces/staunty/wQ.svg)]",
  r: "[mask-image:url(/pieces/staunty/wR.svg)]",
  b: "[mask-image:url(/pieces/staunty/wB.svg)]",
  n: "[mask-image:url(/pieces/staunty/wN.svg)]",
  p: "[mask-image:url(/pieces/staunty/wP.svg)]",
};

/**
 * How a piece is painted: in its side's colours, or "ink", a silhouette in the colour of the text
 * around it, as a printed chess book shows figurines (the score sheet).
 */
type PieceLook = ChessColor | "ink";

interface ChessPieceProps {
  readonly type: ChessPieceType;
  readonly look: PieceLook;
  readonly className?: string | undefined;
}

/** A piece, decorative: its name is on the square, the button or the words beside it. */
export function ChessPiece({ type, look, className }: ChessPieceProps) {
  if (look === "ink") {
    return (
      <span
        aria-hidden
        data-piece-figurine={type}
        className={cn(
          "inline-block bg-current [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]",
          FIGURINE_MASK[type],
          className,
        )}
      />
    );
  }
  return (
    // A static vector file, sized by its square: nothing for next/image to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pieceSrc(look, type)}
      alt=""
      aria-hidden
      // The files' own size: a box before the file arrives (no layout shift), sized by CSS.
      width={50}
      height={50}
      draggable={false}
      className={cn("pointer-events-none select-none", className)}
    />
  );
}
