import { cn } from "@board-games/ui";

/** A card and a column of scores: the tool's picture, drawn here. */
export function CardScoreArtwork({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-16", className)}>
      <g transform="rotate(-10 26 34)">
        <rect
          x="9"
          y="12"
          width="30"
          height="42"
          rx="5"
          strokeWidth="2.5"
          className="fill-surface stroke-fg"
        />
        <path
          d="M24 25c3 4 6 6 6 9a3.2 3.2 0 0 1-6 1.4 3.2 3.2 0 0 1-6-1.4c0-3 3-5 6-9z"
          className="fill-danger"
        />
      </g>
      <rect
        x="31"
        y="10"
        width="26"
        height="44"
        rx="5"
        strokeWidth="2.5"
        className="fill-surface stroke-fg"
      />
      <path
        d="M37 20h9M37 29h14M37 38h9M37 47h14"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-accent"
      />
    </svg>
  );
}
