import type { LudoColourName } from "@board-games/games/ludo";

import type { Point } from "./board-layout";

/**
 * The symbol of a colour, so pieces differ without colour: Red ●, Blue ■, Yellow ▲, Green ◆,
 * centred on `at` with a half-size of `size`.
 */
export function ColourSymbol({
  colour,
  at,
  size,
  className,
}: {
  colour: LudoColourName;
  at: Point;
  size: number;
  className: string;
}) {
  const { x, y } = at;
  switch (colour) {
    case "red":
      return <circle cx={x} cy={y} r={size} className={className} />;
    case "blue":
      return (
        <rect
          x={x - size * 0.85}
          y={y - size * 0.85}
          width={size * 1.7}
          height={size * 1.7}
          className={className}
        />
      );
    case "yellow":
      return (
        <polygon
          points={`${x},${y - size} ${x + size},${y + size * 0.8} ${x - size},${y + size * 0.8}`}
          className={className}
        />
      );
    case "green":
      return (
        <polygon
          points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`}
          className={className}
        />
      );
  }
}
