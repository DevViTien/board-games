import { lineOf } from "@board-games/games/forbidden-triangle";

import { guestName, seatOf } from "../board-layout";

/** A line of a drawn table: its two guests and who drew it (0 red, 1 blue), or `null` undrawn. */
type DrawnLine = readonly [a: number, b: number, owner: 0 | 1 | null];

interface TableProps {
  readonly guests: number;
  readonly lines: readonly DrawnLine[];
  /** A triangle to fill: three guests, and whose colour. */
  readonly triangle?: { readonly guests: readonly [number, number, number]; readonly owner: 0 | 1 };
  /** Where the 100 × 100 table goes, and how big it is drawn. */
  readonly x: number;
  readonly size: number;
}

/**
 * A small table of guests, drawn with the board's own geometry and tokens: for the rules page and
 * the menu's picture. Every pair not listed is a faint dotted line.
 */
export function MiniTable({ guests, lines, triangle, x, size }: TableProps) {
  const scale = size / 100;
  const at = (guest: number) => {
    const seat = seatOf(guests, guest);
    return { x: x + seat.x * scale, y: seat.y * scale };
  };
  const owners = new Map(lines.map(([a, b, owner]) => [lineOf(guests, a, b), owner]));
  const pairs: (readonly [number, number])[] = [];
  for (let a = 0; a < guests; a += 1) for (let b = a + 1; b < guests; b += 1) pairs.push([a, b]);
  return (
    <g>
      {triangle !== undefined && (
        <polygon
          points={triangle.guests
            .map((guest) => {
              const { x: px, y: py } = at(guest);
              return `${String(px)},${String(py)}`;
            })
            .join(" ")}
          strokeWidth={1.4}
          strokeLinejoin="round"
          className={
            triangle.owner === 0
              ? "fill-game-mark-1/20 stroke-game-win"
              : "fill-game-mark-2/20 stroke-game-win"
          }
        />
      )}
      {pairs.map(([a, b]) => {
        const owner = owners.get(lineOf(guests, a, b)) ?? null;
        const from = at(a);
        const to = at(b);
        return (
          <line
            key={`${String(a)}-${String(b)}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            strokeLinecap="round"
            strokeWidth={owner === null ? 0.6 : 2}
            strokeDasharray={owner === null ? "0.5 1.6" : owner === 1 ? "3.5 2.5" : undefined}
            className={
              owner === null
                ? "stroke-game-line"
                : owner === 0
                  ? "stroke-game-mark-1"
                  : "stroke-game-mark-2"
            }
          />
        );
      })}
      {Array.from({ length: guests }, (_, guest) => {
        const { x: cx, y: cy } = at(guest);
        return (
          <g key={guest}>
            <circle
              cx={cx}
              cy={cy}
              r={7 * scale * 1.1}
              strokeWidth={1}
              className="fill-(--forbidden-triangle-guest) stroke-(--forbidden-triangle-guest-edge)"
            />
            <text
              x={cx}
              y={cy}
              dy="0.35em"
              textAnchor="middle"
              fontSize={7 * scale}
              fontWeight={700}
              className="fill-(--forbidden-triangle-guest-ink)"
            >
              {guestName(guest)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
