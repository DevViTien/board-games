import type { Rng } from "@board-games/engine";
import { Body, Box, Plane, Quaternion, Vec3, World } from "cannon-es";

// The physics of the 3D die (design of redesign-ludo-play §1). FAIRNESS: the number never comes from
// here. The engine (on this device) or the server (online) draws it; this module only finds a throw
// that ends, by itself, with that number on top. A pool of throws is simulated before the number is
// known (from random starting conditions, a picture, not a value of the game), each recorded frame by
// frame; once the number is in, a throw of the pool whose natural top face is that number is played
// back. No face is ever turned mid-throw, except as a rare fallback (`pick`), hidden in the spin of
// the lift-off. Pure: no DOM, no three.js, so it is tested in Node.

/** The fixed simulation step, in seconds. */
export const SIM_STEP_S = 1 / 120;
/** Numbers per recorded frame: position x, y, z and quaternion x, y, z, w. */
const FRAME_SIZE = 7;
/** Half the side of the die. */
export const DIE_HALF = 0.5;
const GRAVITY = -40;
/** A throw that has not rested after this long is not kept. */
const MAX_SIM_S = 2;
/** The shortest and longest throw kept, from the lift-off to rest. */
export const MIN_FLIGHT_S = 0.9;
export const MAX_FLIGHT_S = 1.4;
/** How flat a throw must rest to be kept: the top face's normal · up. */
export const FLAT_DOT = 0.99;

/** Where a throw starts: above the middle of the floor, where the lift-off carries the die. */
const LIFT_POINT = { x: 0, y: 3.1, z: 0.5 } as const;

/**
 * The invisible walls around the middle of the floor: inside what the stage's camera sees on its
 * square canvas (`dice-stage.ts`), so the die never rolls out of view.
 */
export const DICE_WALLS = { x: 2, zNear: 2.4, zFar: -1.25 } as const;

/**
 * The strengths of a throw the pool holds, weakest first: a quick tap throws at the first, a hold
 * of 1.5 s at the last. A stronger throw flies longer.
 */
export const POWER_LEVELS = [0, 0.5, 1] as const;

/**
 * The faces of the die, by the body axis pointing out of them: +x, -x, +y, -y, +z, -z (the order of
 * three.js's `BoxGeometry` material groups). Opposite faces add up to 7.
 */
export const FACE_ON_AXIS = [3, 4, 1, 6, 2, 5] as const;
const AXES: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export interface Quat {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface Vec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The starting conditions of a throw. */
export interface ThrowStart {
  readonly position: Vec;
  readonly quaternion: Quat;
  readonly velocity: Vec;
  readonly spin: Vec;
}

/** A throw simulated to rest, frame by frame. */
export interface Trajectory {
  /** `FRAME_SIZE` numbers per step of `SIM_STEP_S`, the last frame at rest. */
  readonly frames: Float32Array;
  readonly count: number;
  /** From the first frame to rest. */
  readonly durationS: number;
  /** The number on top at rest, faces as `FACE_ON_AXIS` says. */
  readonly top: number;
  /** The strength it was thrown with (one of `POWER_LEVELS`). */
  readonly power: number;
}

/** A frame of a trajectory: its position and its orientation. */
export function frameAt(trajectory: Trajectory, index: number): { p: Vec; q: Quat } {
  const i = Math.max(0, Math.min(trajectory.count - 1, index)) * FRAME_SIZE;
  const f = trajectory.frames;
  return {
    p: { x: f[i] ?? 0, y: f[i + 1] ?? 0, z: f[i + 2] ?? 0 },
    q: { x: f[i + 3] ?? 0, y: f[i + 4] ?? 0, z: f[i + 5] ?? 0, w: f[i + 6] ?? 1 },
  };
}

function toQuaternion(q: Quat): Quaternion {
  return new Quaternion(q.x, q.y, q.z, q.w);
}

function multiply(a: Quat, b: Quat): Quat {
  const product = toQuaternion(a).mult(toQuaternion(b));
  return { x: product.x, y: product.y, z: product.z, w: product.w };
}

/** The body axis (0–5) pointing most upwards for an orientation, and how much (its y). */
function upAxis(q: Quat): { readonly index: number; readonly dot: number } {
  const quaternion = toQuaternion(q);
  let index = 0;
  let dot = -2;
  AXES.forEach(([x, y, z], axis) => {
    const up = quaternion.vmult(new Vec3(x, y, z)).y;
    if (up > dot) {
      dot = up;
      index = axis;
    }
  });
  return { index, dot };
}

/** The number on top of the die drawn at orientation `q` (a mesh turned by nothing else). */
export function faceOnTop(q: Quat): { readonly face: number; readonly dot: number } {
  const { index, dot } = upAxis(q);
  return { face: FACE_ON_AXIS[index] ?? 1, dot };
}

/** A random orientation, uniform over all of them. */
function randomQuaternion(rng: Rng): Quat {
  // Shoemake's method.
  const u1 = rng.nextFloat();
  const u2 = rng.nextFloat() * Math.PI * 2;
  const u3 = rng.nextFloat() * Math.PI * 2;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return { x: a * Math.sin(u2), y: a * Math.cos(u2), z: b * Math.sin(u3), w: b * Math.cos(u3) };
}

function between(rng: Rng, low: number, high: number): number {
  return low + rng.nextFloat() * (high - low);
}

/** Random starting conditions of a throw of strength `power` (0–1) from the lift-off point. */
export function randomStart(rng: Rng, power: number): ThrowStart {
  const angle = between(rng, 0, Math.PI * 2);
  const across = 1.4 + 2.4 * power + between(rng, -0.4, 0.4);
  const axis = new Vec3(between(rng, -1, 1), between(rng, -1, 1), between(rng, -1, 1));
  axis.normalize();
  const spin = 14 + 8 * power + between(rng, -2, 2);
  return {
    position: LIFT_POINT,
    quaternion: randomQuaternion(rng),
    velocity: {
      x: Math.cos(angle) * across,
      y: 2.4 + 3.6 * power + between(rng, -0.4, 0.4),
      z: Math.sin(angle) * across,
    },
    spin: { x: axis.x * spin, y: axis.y * spin, z: axis.z * spin },
  };
}

/**
 * Simulates a throw to rest with a fixed step, recording every frame. `null` when it does not rest
 * flat (`FLAT_DOT`) within `MIN_FLIGHT_S`–`MAX_FLIGHT_S`: such a throw is not kept.
 */
export function simulateThrow(
  start: ThrowStart,
  power: number,
  walls: typeof DICE_WALLS = DICE_WALLS,
): Trajectory | null {
  const world = new World({ gravity: new Vec3(0, GRAVITY, 0) });
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.25;
  const addPlane = (position: Vec, x: number, y: number) => {
    const body = new Body({ mass: 0, shape: new Plane() });
    body.position.set(position.x, position.y, position.z);
    body.quaternion.setFromEuler(x, y, 0);
    world.addBody(body);
  };
  addPlane({ x: 0, y: 0, z: 0 }, -Math.PI / 2, 0);
  addPlane({ x: walls.x, y: 0, z: 0 }, 0, -Math.PI / 2);
  addPlane({ x: -walls.x, y: 0, z: 0 }, 0, Math.PI / 2);
  addPlane({ x: 0, y: 0, z: walls.zFar }, 0, 0);
  addPlane({ x: 0, y: 0, z: walls.zNear }, 0, Math.PI);
  const die = new Body({
    mass: 1,
    shape: new Box(new Vec3(DIE_HALF, DIE_HALF, DIE_HALF)),
    linearDamping: 0.2,
    angularDamping: 0.32,
  });
  die.position.set(start.position.x, start.position.y, start.position.z);
  die.quaternion.set(
    start.quaternion.x,
    start.quaternion.y,
    start.quaternion.z,
    start.quaternion.w,
  );
  die.quaternion.normalize();
  die.velocity.set(start.velocity.x, start.velocity.y, start.velocity.z);
  die.angularVelocity.set(start.spin.x, start.spin.y, start.spin.z);
  world.addBody(die);

  const maxSteps = Math.round(MAX_SIM_S / SIM_STEP_S);
  const frames = new Float32Array(maxSteps * FRAME_SIZE);
  let still = 0;
  let rested = -1;
  for (let step = 0; step < maxSteps; step += 1) {
    world.step(SIM_STEP_S);
    const at = step * FRAME_SIZE;
    frames[at] = die.position.x;
    frames[at + 1] = die.position.y;
    frames[at + 2] = die.position.z;
    frames[at + 3] = die.quaternion.x;
    frames[at + 4] = die.quaternion.y;
    frames[at + 5] = die.quaternion.z;
    frames[at + 6] = die.quaternion.w;
    const quiet =
      die.velocity.length() < 0.14 &&
      die.angularVelocity.length() < 0.5 &&
      die.position.y < DIE_HALF + 0.08;
    still = quiet ? still + 1 : 0;
    if (still >= 6) {
      rested = step - 5;
      break;
    }
  }
  if (rested < 0) return null;
  const count = rested + 1;
  const durationS = count * SIM_STEP_S;
  if (durationS < MIN_FLIGHT_S || durationS > MAX_FLIGHT_S) return null;
  const trajectory: Trajectory = {
    frames: frames.slice(0, count * FRAME_SIZE),
    count,
    durationS,
    top: 1,
    power,
  };
  const { face, dot } = faceOnTop(frameAt(trajectory, count - 1).q);
  if (dot < FLAT_DOT) return null;
  settleFlat(trajectory);
  return { ...trajectory, top: face };
}

/** Eases the last frames onto a perfectly flat rest, so the top face is crisp (it is already up). */
function settleFlat(trajectory: Trajectory): void {
  const { frames, count } = trajectory;
  const last = frameAt(trajectory, count - 1).q;
  const { index } = upAxis(last);
  const [ax, ay, az] = AXES[index] ?? [0, 1, 0];
  const up = toQuaternion(last).vmult(new Vec3(ax, ay, az));
  const align = new Quaternion();
  align.setFromVectors(up, new Vec3(0, 1, 0));
  const flat = align.mult(toQuaternion(last));
  const span = Math.min(10, count);
  for (let k = 0; k < span; k += 1) {
    const step = count - span + k;
    const at = step * FRAME_SIZE;
    const amount = (k + 1) / span;
    const q = toQuaternion(frameAt(trajectory, step).q).slerp(flat, amount);
    frames[at + 1] =
      (frames[at + 1] ?? DIE_HALF) + (DIE_HALF - (frames[at + 1] ?? DIE_HALF)) * amount;
    frames[at + 3] = q.x;
    frames[at + 4] = q.y;
    frames[at + 5] = q.z;
    frames[at + 6] = q.w;
  }
}

/** The quarter or half turn of the cube taking body axis `from` onto body axis `to`. */
function turnBetween(from: number, to: number): Quat {
  const [fx, fy, fz] = AXES[from] ?? [0, 1, 0];
  const [tx, ty, tz] = AXES[to] ?? [0, 1, 0];
  const a = new Vec3(fx, fy, fz);
  const b = new Vec3(tx, ty, tz);
  const dot = a.dot(b);
  const turn = new Quaternion();
  if (dot > 0.5) return { x: 0, y: 0, z: 0, w: 1 };
  if (dot < -0.5) {
    // Opposite faces: half a turn around an axis at right angles to both.
    const side = Math.abs(fx) > 0.5 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
    turn.setFromAxisAngle(side, Math.PI);
  } else {
    turn.setFromAxisAngle(a.cross(b), Math.PI / 2);
  }
  return { x: turn.x, y: turn.y, z: turn.z, w: turn.w };
}

/**
 * The fallback, hardly ever needed: a symmetry of the cube applied to the drawn die (never to the
 * body, so the trajectory is the same) that puts `face` where the trajectory ends with `top`. The
 * mesh is drawn at `bodyQuaternion · turn`.
 */
export function faceTurn(face: number, top: number): Quat {
  const faceAxis = FACE_ON_AXIS.indexOf(face as (typeof FACE_ON_AXIS)[number]);
  const topAxis = FACE_ON_AXIS.indexOf(top as (typeof FACE_ON_AXIS)[number]);
  if (faceAxis < 0 || topAxis < 0) return { x: 0, y: 0, z: 0, w: 1 };
  // The turn takes the face's axis onto the top's: with the body's orientation after it, the face
  // points where the top did, up.
  return turnBetween(faceAxis, topAxis);
}

/** The orientation the die is drawn at for a body orientation and a turn of its faces. */
export function drawnQuaternion(body: Quat, turn: Quat): Quat {
  return multiply(body, turn);
}

/** What the pool gives for a number: a throw, and the turn of the faces (identity when natural). */
export interface PickedThrow {
  readonly trajectory: Trajectory;
  readonly turn: Quat;
  /** Whether the number is the throw's own top face (no turn). */
  readonly natural: boolean;
}

export interface ThrowPool {
  /** Simulates up to `count` more candidate throws, weakest strength first while it lacks them. */
  step(count: number): void;
  /** Throws held. */
  readonly size: () => number;
  /** Whether a throw with `face` on top is held (for a test, or to know whether to simulate more). */
  readonly has: (face: number) => boolean;
  /**
   * Takes out a throw ending with `face` on top, of the strength nearest `power`; without one, the
   * throw of the nearest strength with its faces turned (`faceTurn`); `null` when the pool is empty.
   */
  pick(face: number, power: number): PickedThrow | null;
}

/** Candidates the pool simulates at most, so a long hold does not run the physics for ever. */
const POOL_LIMIT = 48;

/** Playback may run this much faster than the simulation, to end in time. */
export const MAX_PLAYBACK_SPEED = 1.4;

/**
 * How fast to play a throw that takes `throwMs` (the lift-off onto it included) so it ends within
 * `leftMs`, the time left of its budget: never slower than real time, at most
 * `MAX_PLAYBACK_SPEED` (past it, the overlay's hard deadline ends the throw anyway).
 */
export function playbackSpeed(throwMs: number, leftMs: number): number {
  return Math.min(MAX_PLAYBACK_SPEED, Math.max(1, throwMs / Math.max(1, leftMs)));
}

/** A pool of throws simulated ahead (`step`), from starting conditions drawn with `rng`. */
export function createThrowPool(rng: Rng, walls: typeof DICE_WALLS = DICE_WALLS): ThrowPool {
  const held: Trajectory[] = [];
  let tried = 0;

  function nextPower(): number {
    // Round-robin over the strengths, weakest first: a quick tap needs the weakest soonest.
    return POWER_LEVELS[tried % POWER_LEVELS.length] ?? 0;
  }

  function nearest(candidates: readonly Trajectory[], power: number): Trajectory | null {
    let best: Trajectory | null = null;
    for (const candidate of candidates) {
      if (best === null || Math.abs(candidate.power - power) < Math.abs(best.power - power)) {
        best = candidate;
      }
    }
    return best;
  }

  return {
    step(count) {
      for (let k = 0; k < count && held.length < POOL_LIMIT; k += 1) {
        const power = nextPower();
        tried += 1;
        const trajectory = simulateThrow(randomStart(rng, power), power, walls);
        if (trajectory !== null) held.push(trajectory);
      }
    },
    size: () => held.length,
    has: (face) => held.some((trajectory) => trajectory.top === face),
    pick(face, power) {
      const natural = nearest(
        held.filter((trajectory) => trajectory.top === face),
        power,
      );
      const chosen = natural ?? nearest(held, power);
      if (chosen === null) return null;
      held.splice(held.indexOf(chosen), 1);
      return {
        trajectory: chosen,
        turn: natural === null ? faceTurn(face, chosen.top) : { x: 0, y: 0, z: 0, w: 1 },
        natural: natural !== null,
      };
    },
  };
}
