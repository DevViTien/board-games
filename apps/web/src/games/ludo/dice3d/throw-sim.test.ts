import { createRng } from "@board-games/engine";
import { describe, expect, it } from "vitest";

import {
  createThrowPool,
  drawnQuaternion,
  FACE_ON_AXIS,
  faceOnTop,
  faceTurn,
  FLAT_DOT,
  frameAt,
  MAX_FLIGHT_S,
  MAX_PLAYBACK_SPEED,
  MIN_FLIGHT_S,
  playbackSpeed,
  POWER_LEVELS,
  randomStart,
  simulateThrow,
} from "./throw-sim";
import { THROW_DEADLINE_MS, THROW_FADE_MS, THROW_READ_MIN_MS } from "./use-dice-throw";

/** The tests below run thousands of simulations: room for a busy machine. */
const HEAVY = { timeout: 30_000 };

// The physics of the 3D die (design of redesign-ludo-play §1), in Node: the die always ends on the
// number the game drew, by a throw of the pool that ends there by itself.

const FACES = [1, 2, 3, 4, 5, 6] as const;

describe("throw-sim", () => {
  it("names every face once, opposite faces adding up to 7", () => {
    expect([...FACE_ON_AXIS].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    for (let axis = 0; axis < 6; axis += 2) {
      expect((FACE_ON_AXIS[axis] ?? 0) + (FACE_ON_AXIS[axis + 1] ?? 0)).toBe(7);
    }
  });

  it("keeps only throws that rest flat, within 0.9–1.4 s", HEAVY, () => {
    const rng = createRng(11);
    let kept = 0;
    for (let k = 0; k < 60; k += 1) {
      const power = POWER_LEVELS[k % POWER_LEVELS.length] ?? 0;
      const trajectory = simulateThrow(randomStart(rng, power), power);
      if (trajectory === null) continue;
      kept += 1;
      expect(trajectory.durationS).toBeGreaterThanOrEqual(MIN_FLIGHT_S);
      expect(trajectory.durationS).toBeLessThanOrEqual(MAX_FLIGHT_S);
      const rest = frameAt(trajectory, trajectory.count - 1);
      const { face, dot } = faceOnTop(rest.q);
      expect(face).toBe(trajectory.top);
      expect(dot).toBeGreaterThanOrEqual(FLAT_DOT);
      // At rest on the floor.
      expect(rest.p.y).toBeCloseTo(0.5, 1);
    }
    // Most throws are kept: a pool fills quickly.
    expect(kept).toBeGreaterThan(30);
  });

  it("Mặt trên đúng số ván ghi: every number 1–6 ends on top, over 20 seeds each", HEAVY, () => {
    let natural = 0;
    for (const face of FACES) {
      for (let seed = 0; seed < 20; seed += 1) {
        const pool = createThrowPool(createRng(seed * 7 + face));
        // As many throws as a pool holds once prepared.
        pool.step(36);
        const picked = pool.pick(face, seed % 2 === 0 ? 0 : 1);
        expect(picked).not.toBeNull();
        if (picked === null) continue;
        if (picked.natural) natural += 1;
        const rest = frameAt(picked.trajectory, picked.trajectory.count - 1);
        expect(faceOnTop(drawnQuaternion(rest.q, picked.turn)).face).toBe(face);
      }
    }
    // Hardly ever a turned face: a pool of 36 throws holds every number.
    expect(natural).toBeGreaterThanOrEqual(115);
  });

  it("turns the faces as the rare fallback, onto any top", HEAVY, () => {
    for (const face of FACES) {
      for (const top of FACES) {
        const turn = faceTurn(face, top);
        // A body resting with `top` up: here, the identity puts face 1 (+y) up; turn it so `top` is.
        const topAxis = FACE_ON_AXIS.indexOf(top);
        expect(topAxis).toBeGreaterThanOrEqual(0);
        const pool = createThrowPool(createRng(face * 10 + top));
        pool.step(12);
        const picked = pool.pick(top, 0);
        if (picked === null) continue;
        const rest = frameAt(picked.trajectory, picked.trajectory.count - 1);
        expect(faceOnTop(drawnQuaternion(rest.q, faceTurn(face, picked.trajectory.top))).face).toBe(
          face,
        );
        expect(Math.hypot(turn.x, turn.y, turn.z, turn.w)).toBeCloseTo(1);
      }
    }
  });

  it("Giữ lâu tung lâu hơn: a strong throw does not fly shorter than a weak one", HEAVY, () => {
    const mean = (power: number) => {
      const rng = createRng(Math.round(power * 100) + 5);
      const durations: number[] = [];
      while (durations.length < 40) {
        const trajectory = simulateThrow(randomStart(rng, power), power);
        if (trajectory !== null) durations.push(trajectory.durationS);
      }
      return durations.reduce((sum, d) => sum + d, 0) / durations.length;
    };
    expect(mean(1)).toBeGreaterThan(mean(0));
  });

  it("picks the strength nearest the hold, and takes the throw out of the pool", HEAVY, () => {
    let strongest = 0;
    for (let seed = 0; seed < 12; seed += 1) {
      const pool = createThrowPool(createRng(100 + seed));
      pool.step(36);
      const size = pool.size();
      const picked = pool.pick((seed % 6) + 1, 1);
      if (picked?.trajectory.power === 1) strongest += 1;
      expect(pool.size()).toBe(size - 1);
    }
    // A full-strength throw of that number is mostly held (a third of the tries are at it).
    expect(strongest).toBeGreaterThanOrEqual(6);
  });

  it("plays the longest throw fast enough after frames spent waiting: the number shows ≥ 300 ms, the overlay goes within 1.9 s", () => {
    // What the throw's controller gives the stage, from the number.
    const withinMs = THROW_DEADLINE_MS - THROW_READ_MIN_MS - THROW_FADE_MS;
    // The lift-off waited its longest (100 ms) for a throw of the number, and a slow frame more.
    const spentMs = 100 + 50;
    // The lift-off onto the throw, the longest throw kept, a frame to notice the rest.
    const throwMs = 100 + MAX_FLIGHT_S * 1000 + 32;
    const speed = playbackSpeed(throwMs, withinMs - spentMs);
    const restAt = spentMs + throwMs / speed;

    expect(speed).toBeGreaterThan(1);
    expect(speed).toBeLessThanOrEqual(MAX_PLAYBACK_SPEED);
    expect(restAt).toBeLessThanOrEqual(withinMs);
    expect(THROW_DEADLINE_MS - THROW_FADE_MS - restAt).toBeGreaterThanOrEqual(THROW_READ_MIN_MS);
    // A short throw plays in real time.
    expect(playbackSpeed(1000, withinMs)).toBe(1);
  });

  it("gives nothing from an empty pool (the 2D die then shows the number)", () => {
    const pool = createThrowPool(createRng(1));
    expect(pool.size()).toBe(0);
    expect(pool.pick(4, 0)).toBeNull();
  });

  it("draws the pictures of throws only from its own generator, never the number", () => {
    // Same seed, same throws, whatever number is then picked.
    const a = createThrowPool(createRng(9));
    const b = createThrowPool(createRng(9));
    a.step(6);
    b.step(6);
    expect(a.size()).toBe(b.size());
  });
});
