/** A mark on a notebook cell of a figure: X, O, or nothing. */
export type CaroMark = "x" | "o" | "";

/** A mark drawn in a cell whose top-left corner is (x, y), `size` units wide. */
export function CaroCellMark({
  mark,
  x,
  y,
  size,
}: {
  readonly mark: CaroMark;
  readonly x: number;
  readonly y: number;
  readonly size: number;
}) {
  const inset = size * 0.26;
  if (mark === "x") {
    return (
      <path
        d={`M${String(x + inset)} ${String(y + inset)}L${String(x + size - inset)} ${String(y + size - inset)}M${String(x + size - inset)} ${String(y + inset)}L${String(x + inset)} ${String(y + size - inset)}`}
        strokeWidth={size * 0.11}
        strokeLinecap="round"
        className="stroke-game-mark-1"
      />
    );
  }
  if (mark === "o") {
    return (
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={size / 2 - inset}
        fill="none"
        strokeWidth={size * 0.11}
        className="stroke-game-mark-2"
      />
    );
  }
  return null;
}

/** A row of notebook cells with their marks, from (x, y). */
export function CaroStrip({
  marks,
  x,
  y,
  size = 28,
}: {
  readonly marks: readonly CaroMark[];
  readonly x: number;
  readonly y: number;
  readonly size?: number;
}) {
  return (
    <g>
      {marks.map((mark, index) => (
        <g key={index}>
          <rect
            x={x + index * size}
            y={y}
            width={size}
            height={size}
            strokeWidth="1"
            className="fill-game-board stroke-game-line"
          />
          <CaroCellMark mark={mark} x={x + index * size} y={y} size={size} />
        </g>
      ))}
    </g>
  );
}

/** The stroke through a line of five that wins, like a pen's. */
export function CaroWinStroke({
  from,
  to,
}: {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}) {
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      strokeWidth="3"
      strokeLinecap="round"
      className="stroke-game-mark-1 opacity-60"
    />
  );
}
