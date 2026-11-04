interface RulesPoint {
  readonly x: number;
  readonly y: number;
}

interface RulesArrowProps {
  readonly from: RulesPoint;
  readonly to: RulesPoint;
  /** How far the arrow bends across the line between its ends (0: straight; negative: up). */
  readonly bend?: number;
  /** How short of each end it stops, so it never covers a piece. */
  readonly gap: number;
  /** The width of its line, in the figure's units. */
  readonly width: number;
  readonly dashed?: boolean;
}

const n = (value: number) => value.toFixed(3);

/** A move in a rules figure: a curve from `from` to `to` with a head, in ink. */
export function RulesArrow({ from, to, bend = 0, gap, width, dashed = false }: RulesArrowProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  // The control point: the middle, moved `bend` across the line.
  const control = {
    x: (from.x + to.x) / 2 - (dy / length) * bend,
    y: (from.y + to.y) / 2 + (dx / length) * bend,
  };
  const shorten = (point: RulesPoint): RulesPoint => {
    const span = Math.hypot(control.x - point.x, control.y - point.y) || 1;
    return {
      x: point.x + ((control.x - point.x) / span) * gap,
      y: point.y + ((control.y - point.y) / span) * gap,
    };
  };
  const start = shorten(from);
  const end = shorten(to);
  // The head points along the curve's end: from the control point to the end.
  const span = Math.hypot(end.x - control.x, end.y - control.y) || 1;
  const ux = (end.x - control.x) / span;
  const uy = (end.y - control.y) / span;
  const head = width * 3;
  const side = head * 0.7;
  return (
    <g
      fill="none"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-fg"
    >
      <path
        d={`M${n(start.x)} ${n(start.y)}Q${n(control.x)} ${n(control.y)} ${n(end.x)} ${n(end.y)}`}
        strokeDasharray={dashed ? `${n(width * 2)} ${n(width * 1.6)}` : undefined}
      />
      <path
        d={`M${n(end.x - ux * head - uy * side)} ${n(end.y - uy * head + ux * side)}L${n(end.x)} ${n(end.y)}L${n(end.x - ux * head + uy * side)} ${n(end.y - uy * head - ux * side)}`}
      />
    </g>
  );
}
