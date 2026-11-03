// Cờ cá ngựa: the board and the fixed rules (design §1, §3). The points that vary by region and are
// modelled as options live in `options.ts`; everything here is fixed: one die, no "blockade" of two
// horses, the start cell is not safe, the home column is climbed step by step, and a win needs the
// four highest steps.

/** Cells of the shared track, a closed loop every horse walks the same way. */
export const TRACK_LENGTH = 56;

/** Cells between the start cells of two neighbouring colours. */
export const SEGMENT = 14;

/** Horses of each player. */
export const HORSES = 4;

/** Steps of each colour's home column, numbered 1 (lowest) to 6. */
const HOME_STEPS = 6;

/** The colours of the board, in the direction of play: top, right, bottom, left. */
export const LUDO_COLOUR = {
  Red: 0,
  Blue: 1,
  Yellow: 2,
  Green: 3,
} as const;

export type LudoColour = (typeof LUDO_COLOUR)[keyof typeof LUDO_COLOUR];

/** The names of the colours, by colour, for translation keys and display. */
export const LUDO_COLOUR_NAMES = ["red", "blue", "yellow", "green"] as const;

export type LudoColourName = (typeof LUDO_COLOUR_NAMES)[number];

/**
 * The colour of each seat by number of players: two players sit at opposite corners (G10), three
 * take the first three colours.
 */
export const SEAT_COLOURS: Readonly<Record<2 | 3 | 4, readonly LudoColour[]>> = {
  2: [LUDO_COLOUR.Red, LUDO_COLOUR.Yellow],
  3: [LUDO_COLOUR.Red, LUDO_COLOUR.Blue, LUDO_COLOUR.Yellow],
  4: [LUDO_COLOUR.Red, LUDO_COLOUR.Blue, LUDO_COLOUR.Yellow, LUDO_COLOUR.Green],
};

// A horse's position is its progress, counted from the start cell of its own colour:
// -1 in the stable, 0…55 on the track (55: its own gate, the cell just before its start cell),
// 56…61 on steps 1…6 of its home column.

/** Progress of a horse still in its stable. */
export const IN_STABLE = -1;

/** Progress of a horse on its own gate (chân chuồng), the last cell of its lap. */
export const OWN_GATE = TRACK_LENGTH - 1;

/** Progress of the highest step, 6; step `k` is `OWN_GATE + k`. */
export const LAST_STEP = OWN_GATE + HOME_STEPS;

/** The lowest step that counts for a win: four horses on steps 3–6 win. */
export const WINNING_STEP = 3;

/**
 * The progress of the four gates, seen from any horse: the gates are the cells just before each
 * start cell, and start cells are `SEGMENT` apart. The last one is the horse's own gate.
 */
export const GATE_PROGRESS = [13, 27, 41, 55] as const;

/** The die faces, each equally likely. */
export const DIE_FACES = [1, 2, 3, 4, 5, 6] as const;

export type LudoOutcome = (typeof DIE_FACES)[number];
