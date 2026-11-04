// The 3D die's stage, as the rest of the app sees it: no three.js here, so importing these types
// never pulls the library in (`dice-stage.ts` implements them, loaded by `load-dice3d.ts`).

/** The colours of the die, read from the page's tokens (light or dark). */
export interface DieColours {
  /** A face. */
  readonly body: string;
  /** The rounded edge: the roller's colour. */
  readonly line: string;
  /** The pips. */
  readonly pip: string;
}

/** A point of the stage's canvas, as fractions of its width and height (0–1). */
export interface StagePoint {
  readonly x: number;
  readonly y: number;
}

export interface DiceStage {
  /** Its canvas, laid in the overlay while a throw shows. */
  readonly canvas: HTMLCanvasElement;
  /**
   * Prepares the shaders, the textures of a die in `colours` and a pool of throws while nothing
   * shows, so a first press never stalls.
   */
  prepare(colours: DieColours): void;
  /** The die shakes in the hand, in these colours, drawn at the canvas's size as laid out. */
  hold(colours: DieColours): void;
  /** Let go with a strength of 0–1: the die lifts off and spins in place until `land`. */
  release(power: number): void;
  /**
   * The number is known: plays a throw that ends with `face` on top, in at most `withinMs`, then
   * calls `onRest`. `false` when no throw can be played (the 2D die then shows the number).
   */
  land(face: number, withinMs: number, onRest: () => void): boolean;
  /** The face on top of the die as drawn now, or `null` while none shows. */
  topFace(): number | null;
  /** Where the die is on the canvas. */
  diePoint(): StagePoint;
  /** Where the hand holds the die on the canvas: the centre of the power ring. */
  holdPoint(): StagePoint;
  /** Hides the die and stops drawing. */
  stop(): void;
  /** Told once when the stage can draw no more (its WebGL context lost, an error while drawing). */
  onFailure(listener: () => void): void;
  /** Frees everything it holds on the GPU, and its context. */
  dispose(): void;
}

/** What the lazily loaded chunk gives. */
export interface Dice3dModule {
  readonly createDiceStage: () => DiceStage;
}
