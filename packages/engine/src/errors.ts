export const ENGINE_ERROR = {
  InvalidPlayerCount: "invalid-player-count",
  InvalidOptions: "invalid-options",
  IllegalMove: "illegal-move",
  GameOver: "game-over",
  NothingToUndo: "nothing-to-undo",
  NothingToRedo: "nothing-to-redo",
  GameMismatch: "game-mismatch",
  CorruptRecord: "corrupt-record",
  UnsupportedRecordVersion: "unsupported-record-version",
} as const;

export type EngineErrorCode = (typeof ENGINE_ERROR)[keyof typeof ENGINE_ERROR];

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure {
  readonly ok: false;
  readonly error: EngineErrorCode;
}

/** Expected failures (an illegal move, a corrupt record) are values, not exceptions. */
export type Result<T> = Success<T> | Failure;

export function ok<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function err(error: EngineErrorCode): Failure {
  return { ok: false, error };
}
