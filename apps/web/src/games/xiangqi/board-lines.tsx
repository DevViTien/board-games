/**
 * The drawing under the points (design §6): nine columns and ten rows of lines through the
 * points' centres, the river between rows 5 and 6 with its words, the two palaces' diagonals, and
 * the small corner marks where cannons and soldiers start. In hundredths of a 90 × 100 board, one
 * point every 10. The same whichever side is below: the board is symmetrical, and its words read
 * the same way up. Decorative.
 */
const CENTRE = (index: number) => 5 + index * 10;

/** The points marked: cannons and soldiers at the start, on both sides. */
const MARKED = [
  [1, 2],
  [7, 2],
  [1, 7],
  [7, 7],
  [0, 3],
  [2, 3],
  [4, 3],
  [6, 3],
  [8, 3],
  [0, 6],
  [2, 6],
  [4, 6],
  [6, 6],
  [8, 6],
] as const;

function Marks({ x, y }: { readonly x: number; readonly y: number }) {
  const cx = CENTRE(x);
  const cy = CENTRE(y);
  const corners = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const;
  return (
    <>
      {corners
        .filter(([dx]) => x + dx >= 0 && x + dx <= 8)
        .map(([dx, dy]) => (
          <path
            key={`${String(dx)}${String(dy)}`}
            d={`M${String(cx + dx * 3.4)} ${String(cy + dy * 1.2)}H${String(cx + dx * 1.2)}V${String(cy + dy * 3.4)}`}
            fill="none"
            strokeWidth="0.35"
            className="stroke-game-line"
          />
        ))}
    </>
  );
}

export function BoardLines() {
  const columns = Array.from({ length: 9 }, (_unused, index) => index);
  const rows = Array.from({ length: 10 }, (_unused, index) => index);
  return (
    <svg
      aria-hidden
      viewBox="0 0 90 100"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <g className="stroke-game-line" strokeWidth="0.45">
        {rows.map((row) => (
          <line key={`r${String(row)}`} x1={5} y1={CENTRE(row)} x2={85} y2={CENTRE(row)} />
        ))}
        {columns.map((col) =>
          col === 0 || col === 8 ? (
            <line key={`c${String(col)}`} x1={CENTRE(col)} y1={5} x2={CENTRE(col)} y2={95} />
          ) : (
            <g key={`c${String(col)}`}>
              <line x1={CENTRE(col)} y1={5} x2={CENTRE(col)} y2={45} />
              <line x1={CENTRE(col)} y1={55} x2={CENTRE(col)} y2={95} />
            </g>
          ),
        )}
        <path d="M35 5 55 25M55 5 35 25M35 75 55 95M55 75 35 95" fill="none" />
      </g>
      <rect
        x="4.2"
        y="4.2"
        width="81.6"
        height="91.6"
        fill="none"
        strokeWidth="0.9"
        className="stroke-game-line"
      />
      {MARKED.map(([x, y]) => (
        <Marks key={`${String(x)}-${String(y)}`} x={x} y={y} />
      ))}
      <text
        x="25"
        y="50"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="5.4"
        fontWeight="900"
        letterSpacing="2"
        className="fill-game-line [font-family:var(--font-xiangqi),var(--font-cjk),serif]"
      >
        楚河
      </text>
      <text
        x="65"
        y="50"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="5.4"
        fontWeight="900"
        letterSpacing="2"
        className="fill-game-line [font-family:var(--font-xiangqi),var(--font-cjk),serif]"
      >
        漢界
      </text>
    </svg>
  );
}
