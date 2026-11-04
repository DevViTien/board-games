import { createRng } from "@board-games/engine";
import {
  BoxGeometry,
  CanvasTexture,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";

import type { DiceStage, DieColours, StagePoint } from "./stage-types";
import {
  createThrowPool,
  DIE_HALF,
  drawnQuaternion,
  FACE_ON_AXIS,
  faceOnTop,
  frameAt,
  type PickedThrow,
  playbackSpeed,
  SIM_STEP_S,
} from "./throw-sim";

// The 3D die (design of redesign-ludo-play §1–§3): three.js draws, `throw-sim.ts` simulates. Loaded
// only through `load-dice3d.ts`'s `import()`, so three.js and cannon-es stay out of every page's
// first load. One stage lives as long as the Ludo play screen.

/** Simulations per frame at most, so a frame never stalls. */
const SIMS_PER_FRAME = 2;
/** The pool is kept this full while nothing shows. */
const POOL_TARGET = 36;
/** The lift-off from the hand onto the chosen throw's first frame. */
const TRANSITION_MS = 100;
/** Rest is noticed on the frame after it: a frame and a little more kept for it. */
const REST_MARGIN_MS = 32;
/**
 * How long the lift-off may simulate more for a number the pool lacks, before turning the faces:
 * by time, not frames, so slow frames never eat the throw's budget.
 */
const EXTRA_WAIT_MS = 100;
/** A hold reaches full strength after this long. */
const FULL_POWER_MS = 1500;
/** Where the hand holds the die. */
const HOLD_POINT = new Vector3(0, 2.9, 0.5);
const LIFT_HEIGHT = 3.4;

/** Pips of each face, on a face of side 1. */
const PIPS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  1: [[0.5, 0.5]],
  2: [
    [0.28, 0.28],
    [0.72, 0.72],
  ],
  3: [
    [0.28, 0.28],
    [0.5, 0.5],
    [0.72, 0.72],
  ],
  4: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  5: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.5, 0.5],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  6: [
    [0.28, 0.27],
    [0.72, 0.27],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.73],
    [0.72, 0.73],
  ],
};

/** A box whose edges are rounded by `radius`; its UVs follow, so a face's picture stays flat. */
function roundedBox(radius: number, segments: number): BoxGeometry {
  const s = 2 * segments + 1;
  const geometry = new BoxGeometry(1, 1, 1, s, s, s);
  const remap = (c: number) => {
    const t = (c + 0.5) * s;
    if (t <= segments + 1e-6) return -0.5 + (radius * t) / segments;
    if (t >= s - segments - 1e-6) return 0.5 - (radius * (s - t)) / segments;
    return -0.5 + radius + ((t - segments) / (s - 2 * segments)) * (1 - 2 * radius);
  };
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  if (position === undefined || normal === undefined || uv === undefined) return geometry;
  const inner = 0.5 - radius;
  for (let i = 0; i < position.count; i += 1) {
    const x = remap(position.getX(i));
    const y = remap(position.getY(i));
    const z = remap(position.getZ(i));
    const ix = Math.max(-inner, Math.min(inner, x));
    const iy = Math.max(-inner, Math.min(inner, y));
    const iz = Math.max(-inner, Math.min(inner, z));
    const length = Math.hypot(x - ix, y - iy, z - iz) || 1;
    const nx = (x - ix) / length;
    const ny = (y - iy) / length;
    const nz = (z - iz) / length;
    position.setXYZ(i, ix + nx * radius, iy + ny * radius, iz + nz * radius);
    normal.setXYZ(i, nx, ny, nz);
    uv.setXY(i, remap(uv.getX(i) - 0.5) + 0.5, remap(uv.getY(i) - 0.5) + 0.5);
  }
  return geometry;
}

function faceCanvas(face: number, colours: DieColours): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context === null) return canvas;
  // The frame in the roller's colour: the rounded edge of the geometry maps onto it.
  context.fillStyle = colours.line;
  context.fillRect(0, 0, size, size);
  context.fillStyle = colours.body;
  context.beginPath();
  context.roundRect(24, 24, size - 48, size - 48, 34);
  context.fill();
  context.fillStyle = colours.pip;
  for (const [u, v] of PIPS[face] ?? []) {
    context.beginPath();
    context.arc(u * size, v * size, face === 1 ? 26 : 20, 0, Math.PI * 2);
    context.fill();
  }
  return canvas;
}

function blobCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context === null) return canvas;
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.55, "rgba(0,0,0,0.6)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return canvas;
}

/** The key of a die's materials. */
function colourKey(colours: DieColours): string {
  return `${colours.body}|${colours.line}|${colours.pip}`;
}

/** A seed for the pictures of throws (never a value of the game): from `crypto`. */
function visualSeed(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] ?? 0;
}

type Mode = "off" | "hold" | "lift" | "transition" | "play" | "rest";

export function createDiceStage(): DiceStage {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");

  const scene = new Scene();
  // Fixed for a square canvas: the walls of `throw-sim.ts` stay inside what it sees.
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 11, 5.5);
  camera.lookAt(0, 0, 0.3);
  camera.updateMatrixWorld();

  scene.add(new HemisphereLight(0xffffff, 0x8a7e66, 1.35));
  const sun = new DirectionalLight(0xffffff, 1.9);
  sun.position.set(2.5, 10, 4);
  scene.add(sun);

  // A soft blob shadow drawn ahead (no shadow map: cheaper on phones), lighter as the die rises.
  const blobTexture = new CanvasTexture(blobCanvas());
  const shadowMaterial = new MeshBasicMaterial({
    map: blobTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.3,
  });
  const blobGeometry = new PlaneGeometry(1, 1);
  const blob = new Mesh(blobGeometry, shadowMaterial);
  blob.rotation.x = -Math.PI / 2;
  blob.visible = false;
  scene.add(blob);

  const geometry = roundedBox(0.14, 4);
  const die = new Mesh(geometry, [] as MeshStandardMaterial[]);
  die.visible = false;
  scene.add(die);

  /** Materials by colours: a theme or a roller seen before is not drawn again. */
  const materials = new Map<string, MeshStandardMaterial[]>();
  const pool = createThrowPool(createRng(visualSeed()));

  let mode: Mode = "off";
  let frame = 0;
  let previous = 0;
  let holdStartedAt = 0;
  let power = 0;
  const bodyPosition = new Vector3();
  const bodyQuaternion = new Quaternion();
  let turn = new Quaternion();
  let liftStartedAt = 0;
  const liftFrom = new Vector3();
  const liftQuaternion = new Quaternion();
  let liftAxis = new Vector3(0, 1, 0);
  let liftSpin = 0;
  let landing: {
    face: number;
    withinMs: number;
    onRest: () => void;
    /** When the number came (`land`): the budget counts from it. */
    at: number;
  } | null = null;
  let picked: PickedThrow | null = null;
  let transitionStartedAt = 0;
  const transitionPosition = new Vector3();
  const transitionQuaternion = new Quaternion();
  let playStartedAt = 0;
  let speed = 1;
  let preparing = 0;
  let failed = false;
  const failureListeners = new Set<() => void>();
  const random = createRng(visualSeed());

  function fail(): void {
    if (failed) return;
    failed = true;
    mode = "off";
    cancelAnimationFrame(frame);
    for (const listener of failureListeners) listener();
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fail();
  });

  function setColours(colours: DieColours): void {
    const key = colourKey(colours);
    let faces = materials.get(key);
    if (faces === undefined) {
      faces = FACE_ON_AXIS.map((face) => {
        const texture = new CanvasTexture(faceCanvas(face, colours));
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 4;
        return new MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0 });
      });
      materials.set(key, faces);
    }
    die.material = faces;
  }

  /** The drawing buffer's size in CSS pixels, as last set. */
  let drawnWidth = 0;
  let drawnHeight = 0;

  /**
   * Fits the drawing buffer to the canvas as laid out: the overlay lays the canvas out only after
   * a hold has begun. The camera's frame stays (the canvas is square).
   */
  function fitCanvas(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0 || (width === drawnWidth && height === drawnHeight)) return;
    drawnWidth = width;
    drawnHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function draw(): void {
    fitCanvas();
    die.position.copy(bodyPosition);
    die.quaternion.copy(bodyQuaternion).multiply(turn);
    const lift = Math.max(0, bodyPosition.y - DIE_HALF);
    blob.visible = die.visible;
    blob.position.set(bodyPosition.x + 0.18 + lift * 0.1, 0.01, bodyPosition.z + 0.1 + lift * 0.05);
    const size = 1.95 + lift * 0.45;
    blob.scale.set(size, size, 1);
    shadowMaterial.opacity = 0.3 * Math.max(0.25, 1 - lift * 0.22);
    renderer.render(scene, camera);
  }

  function spinBy(axis: Vector3, angle: number): void {
    bodyQuaternion.premultiply(new Quaternion().setFromAxisAngle(axis, angle)).normalize();
  }

  function liftPose(elapsed: number, position: Vector3, quaternion: Quaternion): void {
    position.set(
      liftFrom.x,
      liftFrom.y + (LIFT_HEIGHT - liftFrom.y) * (1 - Math.exp(-elapsed / 70)),
      liftFrom.z,
    );
    quaternion.setFromAxisAngle(liftAxis, (liftSpin * elapsed) / 1000).multiply(liftQuaternion);
  }

  function startTransition(now: number): void {
    if (landing === null) return;
    picked = pool.pick(landing.face, power);
    if (picked === null) return;
    turn = new Quaternion(picked.turn.x, picked.turn.y, picked.turn.z, picked.turn.w);
    transitionPosition.copy(bodyPosition);
    transitionQuaternion.copy(bodyQuaternion);
    transitionStartedAt = now;
    const totalMs = TRANSITION_MS + picked.trajectory.durationS * 1000 + REST_MARGIN_MS;
    // From what is left of the budget: the lift-off (and the frames waiting for a throw of the
    // number) has used some of it.
    speed = playbackSpeed(totalMs, landing.withinMs - (now - landing.at));
    mode = "transition";
  }

  function tick(now: number): void {
    try {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      if (mode === "hold") {
        const t = now - holdStartedAt;
        power = Math.min(1, t / FULL_POWER_MS);
        const amplitude = 0.03 + 0.11 * power;
        bodyPosition.set(
          HOLD_POINT.x + Math.sin(t * 0.047) * amplitude + Math.sin(t * 0.13) * amplitude * 0.4,
          HOLD_POINT.y + Math.sin(t * 0.061 + 1) * amplitude * 0.6,
          HOLD_POINT.z + Math.cos(t * 0.053) * amplitude,
        );
        const axis = new Vector3(Math.sin(t * 0.002), 1, Math.cos(t * 0.0017)).normalize();
        spinBy(axis, (2 + 9 * power) * dt);
        pool.step(SIMS_PER_FRAME);
      } else if (mode === "lift") {
        liftPose(now - liftStartedAt, bodyPosition, bodyQuaternion);
        if (landing !== null) {
          if (pool.has(landing.face) || now - landing.at >= EXTRA_WAIT_MS || pool.size() === 0) {
            startTransition(now);
          }
        }
        pool.step(SIMS_PER_FRAME);
      }
      if (mode === "transition" && picked !== null) {
        const amount = Math.min(1, ((now - transitionStartedAt) * speed) / TRANSITION_MS);
        const first = frameAt(picked.trajectory, 0);
        bodyPosition.lerpVectors(
          transitionPosition,
          new Vector3(first.p.x, first.p.y, first.p.z),
          amount,
        );
        bodyQuaternion
          .copy(transitionQuaternion)
          .slerp(new Quaternion(first.q.x, first.q.y, first.q.z, first.q.w), amount);
        if (amount >= 1) {
          mode = "play";
          playStartedAt = now;
        }
      } else if (mode === "play" && picked !== null) {
        // By the time passed, not the frames drawn: a dropped frame never makes the throw longer.
        const { trajectory } = picked;
        const at = (((now - playStartedAt) / 1000) * speed) / SIM_STEP_S;
        const index = Math.min(trajectory.count - 1, Math.floor(at));
        const a = frameAt(trajectory, index);
        const b = frameAt(trajectory, index + 1);
        const amount = Math.min(1, at - index);
        bodyPosition.set(
          a.p.x + (b.p.x - a.p.x) * amount,
          a.p.y + (b.p.y - a.p.y) * amount,
          a.p.z + (b.p.z - a.p.z) * amount,
        );
        bodyQuaternion
          .set(a.q.x, a.q.y, a.q.z, a.q.w)
          .slerp(new Quaternion(b.q.x, b.q.y, b.q.z, b.q.w), amount);
        if (at >= trajectory.count - 1) {
          const last = frameAt(trajectory, trajectory.count - 1);
          bodyPosition.set(last.p.x, last.p.y, last.p.z);
          bodyQuaternion.set(last.q.x, last.q.y, last.q.z, last.q.w);
          mode = "rest";
        }
      }
      draw();
      if (mode === "rest") {
        const onRest = landing?.onRest;
        landing = null;
        onRest?.();
        return;
      }
      if (mode !== "off") frame = requestAnimationFrame(tick);
    } catch {
      fail();
    }
  }

  function startLoop(): void {
    cancelAnimationFrame(frame);
    previous = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function prepareStep(): void {
    preparing = 0;
    if (failed || mode !== "off") return;
    pool.step(SIMS_PER_FRAME);
    if (pool.size() < POOL_TARGET) preparing = requestAnimationFrame(prepareStep);
  }

  return {
    canvas,
    prepare(colours) {
      if (failed) return;
      try {
        // The faces of the player about to roll, in the page's colours: the materials a first
        // press uses. Compiled with the die and its shadow shown (three.js gathers the lights
        // of visible objects only), their textures sent to the GPU now, then hidden again.
        setColours(colours);
        die.visible = true;
        blob.visible = true;
        renderer.compile(scene, camera);
        for (const material of materials.get(colourKey(colours)) ?? []) {
          if (material.map !== null) renderer.initTexture(material.map);
        }
        renderer.initTexture(blobTexture);
        die.visible = false;
        blob.visible = false;
      } catch {
        fail();
        return;
      }
      if (preparing === 0) preparing = requestAnimationFrame(prepareStep);
    },
    hold(colours) {
      if (failed) return;
      cancelAnimationFrame(preparing);
      preparing = 0;
      fitCanvas();
      setColours(colours);
      turn = new Quaternion();
      bodyQuaternion.setFromAxisAngle(
        new Vector3(
          random.nextFloat() - 0.5,
          random.nextFloat() - 0.5,
          random.nextFloat() - 0.5,
        ).normalize(),
        random.nextFloat() * Math.PI * 2,
      );
      bodyPosition.copy(HOLD_POINT);
      die.visible = true;
      landing = null;
      picked = null;
      power = 0;
      mode = "hold";
      holdStartedAt = performance.now();
      startLoop();
    },
    release(strength) {
      if (failed || mode !== "hold") return;
      power = Math.max(0, Math.min(1, strength));
      mode = "lift";
      liftStartedAt = performance.now();
      liftFrom.copy(bodyPosition);
      liftQuaternion.copy(bodyQuaternion);
      liftAxis = new Vector3(
        random.nextFloat() - 0.5,
        random.nextFloat() - 0.5,
        random.nextFloat() - 0.5,
      ).normalize();
      liftSpin = 20 + 14 * power;
    },
    land(face, withinMs, onRest) {
      if (failed || mode !== "lift") return false;
      if (pool.size() === 0) pool.step(SIMS_PER_FRAME);
      if (pool.size() === 0) return false;
      landing = { face, withinMs, onRest, at: performance.now() };
      return true;
    },
    topFace() {
      if (!die.visible) return null;
      const q = drawnQuaternion(
        { x: bodyQuaternion.x, y: bodyQuaternion.y, z: bodyQuaternion.z, w: bodyQuaternion.w },
        { x: turn.x, y: turn.y, z: turn.z, w: turn.w },
      );
      return faceOnTop(q).face;
    },
    diePoint() {
      return project(bodyPosition);
    },
    holdPoint() {
      return project(HOLD_POINT);
    },
    stop() {
      mode = "off";
      landing = null;
      cancelAnimationFrame(frame);
      die.visible = false;
      blob.visible = false;
      if (!failed) {
        try {
          renderer.render(scene, camera);
        } catch {
          fail();
        }
      }
      if (!failed && preparing === 0) preparing = requestAnimationFrame(prepareStep);
    },
    onFailure(listener) {
      failureListeners.add(listener);
    },
    dispose() {
      mode = "off";
      cancelAnimationFrame(frame);
      cancelAnimationFrame(preparing);
      failureListeners.clear();
      geometry.dispose();
      blobGeometry.dispose();
      blobTexture.dispose();
      shadowMaterial.dispose();
      for (const faces of materials.values()) {
        for (const material of faces) {
          material.map?.dispose();
          material.dispose();
        }
      }
      materials.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };

  function project(point: Vector3): StagePoint {
    const projected = point.clone().project(camera);
    return { x: (projected.x + 1) / 2, y: (1 - projected.y) / 2 };
  }
}
