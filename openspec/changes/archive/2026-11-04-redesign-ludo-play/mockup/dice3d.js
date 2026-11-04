/*
 * The 3D die of the mockup: Three.js renders, cannon-es simulates. FAIRNESS: the number never
 * comes from physics. At release a number is requested from a separate source; once it is known
 * the throw is pre-simulated headless (fixed step, transforms recorded per step), the body face
 * that ends on top is read, and the mesh is turned inside the body by one of the 24 rotations of
 * the cube so that the requested number sits on that face. A cube symmetry leaves the shape, so the
 * recorded trajectory is unchanged; the recording is then played back.
 *
 * Classic script (works from file://): the libraries are loaded with dynamic import().
 */
(function () {
  "use strict";

  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.min.js";
  const CANNON_URL = "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

  let T = null;
  let C = null;
  let loadMs = null;
  let loading = null;

  function load() {
    if (loading) return loading;
    const t0 = performance.now();
    loading = Promise.all([import(THREE_URL), import(CANNON_URL)]).then(([three, cannon]) => {
      T = three;
      C = cannon;
      loadMs = performance.now() - t0;
    });
    return loading;
  }

  let webgl = null;
  function webglAvailable() {
    if (webgl !== null) return webgl;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      webgl = Boolean(gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl = false;
    }
    return webgl;
  }

  // BoxGeometry's material groups: +x, -x, +y, -y, +z, -z. Opposite faces add up to 7.
  const FACE_NUM = [3, 4, 1, 6, 2, 5];
  const AXES = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const PIPS = {
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

  const DT = 1 / 120;
  const GRAVITY = -40;
  const HALF = 0.5;
  const LIFT_MIN_MS = 90;

  /** The 24 proper rotations of the cube, as quaternions. */
  function cubeRotations() {
    const perms = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    const out = [];
    for (const p of perms) {
      for (let s = 0; s < 8; s += 1) {
        const sign = [s & 1 ? -1 : 1, s & 2 ? -1 : 1, s & 4 ? -1 : 1];
        const m = [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ];
        for (let r = 0; r < 3; r += 1) m[r][p[r]] = sign[r];
        const det =
          m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
          m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
          m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        if (det !== 1) continue;
        const M = new T.Matrix4().set(
          m[0][0], m[0][1], m[0][2], 0,
          m[1][0], m[1][1], m[1][2], 0,
          m[2][0], m[2][1], m[2][2], 0,
          0, 0, 0, 1,
        );
        out.push(new T.Quaternion().setFromRotationMatrix(M));
      }
    }
    return out;
  }

  /** A box whose edges are rounded by `r`; its UVs follow, so a face's picture stays flat. */
  function roundedBox(r, m) {
    const S = 2 * m + 1;
    const g = new T.BoxGeometry(1, 1, 1, S, S, S);
    const remap = (c) => {
      const t = (c + 0.5) * S;
      if (t <= m + 1e-6) return -0.5 + (r * t) / m;
      if (t >= S - m - 1e-6) return 0.5 - (r * (S - t)) / m;
      return -0.5 + r + ((t - m) / (S - 2 * m)) * (1 - 2 * r);
    };
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const h = 0.5 - r;
    for (let i = 0; i < pos.count; i += 1) {
      const x = remap(pos.getX(i));
      const y = remap(pos.getY(i));
      const z = remap(pos.getZ(i));
      const ix = Math.max(-h, Math.min(h, x));
      const iy = Math.max(-h, Math.min(h, y));
      const iz = Math.max(-h, Math.min(h, z));
      let dx = x - ix;
      let dy = y - iy;
      let dz = z - iz;
      const length = Math.hypot(dx, dy, dz) || 1;
      dx /= length;
      dy /= length;
      dz /= length;
      pos.setXYZ(i, ix + dx * r, iy + dy * r, iz + dz * r);
      nor.setXYZ(i, dx, dy, dz);
      uv.setXY(i, remap(uv.getX(i) - 0.5) + 0.5, remap(uv.getY(i) - 0.5) + 0.5);
    }
    return g;
  }

  function faceCanvas(n, colours) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const x = canvas.getContext("2d");
    // The frame (edge) in the roller's colour; the rounded edge of the geometry maps onto it.
    x.fillStyle = colours.line;
    x.fillRect(0, 0, size, size);
    x.fillStyle = colours.body;
    x.beginPath();
    x.roundRect(24, 24, size - 48, size - 48, 34);
    x.fill();
    x.fillStyle = colours.pip;
    for (const [u, v] of PIPS[n]) {
      x.beginPath();
      x.arc(u * size, v * size, n === 1 ? 26 : 20, 0, Math.PI * 2);
      x.fill();
    }
    return canvas;
  }

  /** Index (0–5) of the body axis that points up for a quaternion {x,y,z,w}. */
  function topAxis(q) {
    const quat = new T.Quaternion(q.x, q.y, q.z, q.w);
    let best = -1;
    let bestDot = -2;
    AXES.forEach((axis, index) => {
      const v = new T.Vector3(...axis).applyQuaternion(quat);
      if (v.y > bestDot) {
        bestDot = v.y;
        best = index;
      }
    });
    return { index: best, dot: bestDot };
  }

  /**
   * Simulates a throw from a state, headless, until the die rests. Returns the recorded frames
   * (x, y, z, qx, qy, qz, qw per step) or null if it does not rest flat in time.
   */
  function simulate(start, walls) {
    const world = new C.World({ gravity: new C.Vec3(0, GRAVITY, 0) });
    world.defaultContactMaterial.friction = 0.4;
    world.defaultContactMaterial.restitution = 0.25;
    const addPlane = (position, euler) => {
      const body = new C.Body({ mass: 0, shape: new C.Plane() });
      body.position.set(...position);
      body.quaternion.setFromEuler(...euler);
      world.addBody(body);
    };
    addPlane([0, 0, 0], [-Math.PI / 2, 0, 0]);
    addPlane([walls.x, 0, 0], [0, -Math.PI / 2, 0]);
    addPlane([-walls.x, 0, 0], [0, Math.PI / 2, 0]);
    addPlane([0, 0, walls.zFar], [0, 0, 0]);
    addPlane([0, 0, walls.zNear], [0, Math.PI, 0]);
    const die = new C.Body({
      mass: 1,
      shape: new C.Box(new C.Vec3(HALF, HALF, HALF)),
      linearDamping: 0.2,
      angularDamping: 0.32,
    });
    die.position.set(start.p.x, start.p.y, start.p.z);
    die.quaternion.set(start.q.x, start.q.y, start.q.z, start.q.w);
    die.velocity.set(start.v.x, start.v.y, start.v.z);
    die.angularVelocity.set(start.w.x, start.w.y, start.w.z);
    world.addBody(die);
    const maxSteps = Math.round(2.6 / DT);
    const frames = new Float32Array(maxSteps * 7);
    let still = 0;
    let count = 0;
    let settled = -1;
    for (let i = 0; i < maxSteps; i += 1) {
      world.step(DT);
      const o = i * 7;
      frames[o] = die.position.x;
      frames[o + 1] = die.position.y;
      frames[o + 2] = die.position.z;
      frames[o + 3] = die.quaternion.x;
      frames[o + 4] = die.quaternion.y;
      frames[o + 5] = die.quaternion.z;
      frames[o + 6] = die.quaternion.w;
      count = i + 1;
      if (
        die.velocity.length() < 0.14 &&
        die.angularVelocity.length() < 0.5 &&
        die.position.y < HALF + 0.08
      ) {
        still += 1;
        if (still >= 6) {
          settled = i - 5;
          break;
        }
      } else still = 0;
    }
    if (settled < 0) return null;
    const n = settled + 1;
    const o = settled * 7;
    const top = topAxis({ x: frames[o + 3], y: frames[o + 4], z: frames[o + 5], w: frames[o + 6] });
    if (top.dot < 0.97) return null;
    return { frames: frames.slice(0, n * 7), count: n, top: top.index, duration: n * DT };
  }

  /** Eases the last frames onto a perfectly flat rest, so the top face is crisp. */
  function snapFlat(sim) {
    const k = Math.min(10, sim.count);
    const last = (sim.count - 1) * 7;
    const f = sim.frames;
    const qFinal = new T.Quaternion(f[last + 3], f[last + 4], f[last + 5], f[last + 6]);
    const up = new T.Vector3(...AXES[sim.top]).applyQuaternion(qFinal);
    const align = new T.Quaternion().setFromUnitVectors(up.normalize(), new T.Vector3(0, 1, 0));
    const qSnap = align.multiply(qFinal);
    for (let j = 0; j < k; j += 1) {
      const i = sim.count - k + j;
      const o = i * 7;
      const a = (j + 1) / k;
      const q = new T.Quaternion(f[o + 3], f[o + 4], f[o + 5], f[o + 6]).slerp(qSnap, a);
      f[o + 1] = f[o + 1] + (HALF - f[o + 1]) * a;
      f[o + 3] = q.x;
      f[o + 4] = q.y;
      f[o + 5] = q.z;
      f[o + 6] = q.w;
    }
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function randomAxis() {
    return new T.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
  }

  /** The initial conditions of a throw from a pose, stronger with `power` (0–1). */
  function throwFrom(p, q, axis, spin, power) {
    const angle = rand(0, Math.PI * 2);
    const h = 2 + 7 * power + rand(-0.5, 0.5);
    const w = axis.clone().multiplyScalar(spin);
    return {
      p: { x: p.x, y: p.y, z: p.z },
      q: { x: q.x, y: q.y, z: q.z, w: q.w },
      v: { x: Math.cos(angle) * h, y: 0.5 + 7 * power + rand(-0.4, 0.4), z: Math.sin(angle) * h },
      w: { x: w.x, y: w.y, z: w.z },
    };
  }

  /**
   * Pre-simulates candidate throws (all from the same pose), a few per call to `step`, and keeps
   * the one whose length is closest to `targetS`. The choice never looks at faces, so it cannot
   * bias the number; the number is not even known yet when planning starts.
   */
  function makePlanner(p, q, axis, spin, power, targetS, walls) {
    const planner = { best: null, tries: 0, ms: 0, done: false };
    planner.step = (count) => {
      const t0 = performance.now();
      for (let k = 0; k < count && !planner.done; k += 1) {
        planner.tries += 1;
        const sim = simulate(throwFrom(p, q, planner.tries === 1 ? axis : randomAxis(), spin, power), walls);
        if (sim !== null) {
          const score = Math.abs(sim.duration - targetS);
          if (planner.best === null || score < planner.best.score) planner.best = { ...sim, score };
          if (score < 0.12) planner.done = true;
        }
        if (planner.tries >= 8) planner.done = true;
      }
      // Never seen in practice: a gentle drop always rests.
      for (let k = 0; planner.done && planner.best === null && k < 20; k += 1) {
        planner.best = simulate(throwFrom(p, q, randomAxis(), 6, 0), walls);
      }
      planner.ms += performance.now() - t0;
      return planner;
    };
    return planner;
  }

  function planThrow(p, q, axis, spin, power, targetS, walls) {
    const planner = makePlanner(p, q, axis, spin, power, targetS, walls).step(99);
    return { sim: planner.best, tries: planner.tries, ms: planner.ms };
  }

  /** A rotation S of the cube with S · (face of `number`) = (body face `top`). */
  function remapFor(rotations, number, top) {
    const d = new T.Vector3(...AXES[FACE_NUM.indexOf(number)]);
    const target = new T.Vector3(...AXES[top]);
    const options = rotations.filter((s) => d.clone().applyQuaternion(s).distanceTo(target) < 1e-4);
    return options[Math.floor(Math.random() * options.length)];
  }

  /** The number on top of a mesh with world quaternion `q`. */
  function readTop(q) {
    return FACE_NUM[topAxis(q).index];
  }

  function createStage(host) {
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.prepend(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 11, 5.5);
    camera.lookAt(0, 0, 0.3);

    scene.add(new T.HemisphereLight(0xffffff, 0x8a7e66, 1.35));
    const sun = new T.DirectionalLight(0xffffff, 1.9);
    sun.position.set(2.5, 10, 4);
    scene.add(sun);

    // A soft blob shadow (no shadow map: cheaper on phones), softer and lighter as the die rises.
    const blobCanvas = document.createElement("canvas");
    blobCanvas.width = 128;
    blobCanvas.height = 128;
    const bx = blobCanvas.getContext("2d");
    const gradient = bx.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.55, "rgba(0,0,0,0.6)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    bx.fillStyle = gradient;
    bx.fillRect(0, 0, 128, 128);
    const shadowMaterial = new T.MeshBasicMaterial({
      map: new T.CanvasTexture(blobCanvas),
      transparent: true,
      depthWrite: false,
      opacity: 0.3,
    });
    let shadowOpacity = 0.3;
    const blob = new T.Mesh(new T.PlaneGeometry(1, 1), shadowMaterial);
    blob.rotation.x = -Math.PI / 2;
    blob.visible = false;
    scene.add(blob);

    const geometry = roundedBox(0.14, 4);
    let materials = [];
    const die = new T.Mesh(geometry, materials);
        die.visible = false;
    scene.add(die);

    const rotations = cubeRotations();
    const textureCache = new Map();

    let walls = { x: 1.5, zNear: 2.5, zFar: -2.5 };
    let width = 1;
    let height = 1;
    const holdPoint = new T.Vector3(0, 2.4, 0.5);

    function floorPoint(nx, ny, y) {
      const v = new T.Vector3(nx, ny, 0.5).unproject(camera);
      const dir = v.sub(camera.position).normalize();
      const t = (y - camera.position.y) / dir.y;
      return camera.position.clone().add(dir.multiplyScalar(t));
    }

    function resize() {
      width = host.clientWidth || 1;
      height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // A narrow (portrait) screen gets a wider lens, so the die has room to roll sideways.
      const distance = camera.position.length();
      camera.fov = Math.max(35, (2 * Math.atan(2.3 / (distance * camera.aspect)) * 180) / Math.PI);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      // Invisible walls around the centre: inside what the camera sees, at most 2.6 from the middle.
      const near = floorPoint(0.92, -0.75, HALF);
      const far = floorPoint(0.92, 0.55, HALF);
      walls = {
        x: Math.min(2.6, Math.abs(near.x) - 0.55),
        zNear: Math.min(2.6, near.z - 0.4),
        zFar: Math.max(-2.6, far.z + 0.2),
      };
      window.__wallsRaw = walls;
      if (!(walls.x > 1.1) || !(walls.zNear - walls.zFar > 2.4)) walls = { x: 1.3, zNear: 2.2, zFar: -2.2 };
      window.__walls = walls;
    }

    function setColours(colours) {
      const key = `${colours.body}|${colours.line}|${colours.pip}`;
      let mats = textureCache.get(key);
      if (!mats) {
        mats = FACE_NUM.map((n) => {
          const texture = new T.CanvasTexture(faceCanvas(n, colours));
          texture.colorSpace = T.SRGBColorSpace;
          texture.anisotropy = 4;
          return new T.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0 });
        });
        textureCache.set(key, mats);
      }
      materials = mats;
      die.material = mats;
      shadowOpacity = colours.shadow;
    }

    // ---- state of one roll
    let mode = "off"; // hold | lift | play | rest | off
    let raf = 0;
    let holdStart = 0;
    let holdMs = 0;
    let power = 0;
    const bodyQ = new T.Quaternion();
    const bodyP = new T.Vector3();
    let S = new T.Quaternion();
    let liftStart = 0;
    let liftAxis = null;
    let liftSpin = 0;
    const liftFrom = new T.Vector3();
    const liftQ = new T.Quaternion();
    let planner = null;
    let playOffset = 0;
    let numberInfo = null;
    let plan = null;
    let playStart = 0;
    let speed = 1;
    let frameTimes = [];
    let lastFrame = 0;
    let resolveRest = null;
    let restInfo = null;
    let prevTime = 0;
    let holdAxis = new T.Vector3(0, 1, 0);

    function apply() {
      die.position.copy(bodyP);
      die.quaternion.copy(bodyQ).multiply(S);
      const lift = Math.max(0, bodyP.y - HALF);
      blob.visible = die.visible;
      blob.position.set(bodyP.x + 0.18 + lift * 0.1, 0.01, bodyP.z + 0.1 + lift * 0.05);
      const size = 1.95 + lift * 0.45;
      blob.scale.set(size, size, 1);
      shadowMaterial.opacity = shadowOpacity * Math.max(0.25, 1 - lift * 0.22);
    }

    function spinBy(axis, angle) {
      const dq = new T.Quaternion().setFromAxisAngle(axis, angle);
      bodyQ.premultiply(dq).normalize();
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;
      if (mode === "hold") {
        const t = now - holdStart;
        power = Math.min(1, t / 1500);
        const amp = 0.03 + 0.11 * power;
        bodyP.set(
          holdPoint.x + Math.sin(t * 0.047) * amp + Math.sin(t * 0.13) * amp * 0.4,
          holdPoint.y + Math.sin(t * 0.061 + 1) * amp * 0.6,
          holdPoint.z + Math.cos(t * 0.053) * amp,
        );
        holdAxis.set(Math.sin(t * 0.002), 1, Math.cos(t * 0.0017)).normalize();
        spinBy(holdAxis, (2 + 9 * power) * dt);
      } else if (mode === "lift") {
        const t = now - liftStart;
        liftPose(t, bodyP, bodyQ);
        if (!planner.done) planner.step(2);
        if (numberInfo !== null && planner.done && t >= LIFT_MIN_MS) startPlay(now, t);
      } else if (mode === "play") {
        frameTimes.push(now - lastFrame);
        lastFrame = now;
        const tp = playOffset + ((now - playStart) / 1000) * speed;
        const sim = plan.sim;
        const fi = Math.min(sim.count - 1, tp / DT);
        const i0 = Math.floor(fi);
        const i1 = Math.min(sim.count - 1, i0 + 1);
        const a = fi - i0;
        const f = sim.frames;
        const o0 = i0 * 7;
        const o1 = i1 * 7;
        bodyP.set(
          f[o0] + (f[o1] - f[o0]) * a,
          f[o0 + 1] + (f[o1 + 1] - f[o0 + 1]) * a,
          f[o0 + 2] + (f[o1 + 2] - f[o0 + 2]) * a,
        );
        const q0 = new T.Quaternion(f[o0 + 3], f[o0 + 4], f[o0 + 5], f[o0 + 6]);
        const q1 = new T.Quaternion(f[o1 + 3], f[o1 + 4], f[o1 + 5], f[o1 + 6]);
        bodyQ.copy(q0).slerp(q1, a);
        if (tp >= sim.duration) finish(now);
      }
      apply();
      renderer.render(scene, camera);
      if (mode !== "off" && mode !== "rest") raf = requestAnimationFrame(tick);
    }

    /** The scripted lift-off, a function of time: up and spinning fast, while the number comes. */
    function liftPose(t, outP, outQ) {
      outP.set(liftFrom.x, liftFrom.y + (3.1 - liftFrom.y) * (1 - Math.exp(-t / 70)), liftFrom.z);
      outQ.setFromAxisAngle(liftAxis, (liftSpin * t) / 1000).multiply(liftQ);
    }

    function startPlay(now, t) {
      // The number is known: the trajectory was planned from the lift-off pose at LIFT_MIN_MS; turn
      // the faces so the number lands on top, then play the recording back.
      const late = numberInfo.at - liftStart > LIFT_MIN_MS + 120;
      const flightTarget = (0.9 + 0.7 * power) * 1000; // from release
      let sim;
      let offset;
      if (late) {
        // A slow answer: re-plan from where the die hangs now (a one-off hitch).
        const again = planThrow(bodyP, bodyQ, liftAxis, liftSpin, power, Math.max(0.45, (flightTarget - t) / 1000), walls);
        sim = again.sim;
        offset = 0;
        planner.ms += again.ms;
      } else {
        sim = planner.best;
        offset = (t - LIFT_MIN_MS) / 1000;
      }
      snapFlat(sim);
      plan = { sim };
      S = remapFor(rotations, numberInfo.n, sim.top);
      const budgetPhys = 2200 - 500 - 150 - 110 - (now - numberInfo.at); // rest, fade, margin
      const physTargetMs = Math.max(450, Math.min(flightTarget - t, budgetPhys));
      const remaining = (sim.duration - offset) * 1000;
      speed = Math.max(0.8, Math.min(1.25, remaining / physTargetMs));
      speed = Math.max(speed, remaining / budgetPhys);
      playOffset = offset;
      mode = "play";
      playStart = now;
      lastFrame = now;
      frameTimes = [];
      restInfo = {
        liftMs: t,
        planMs: planner.ms,
        tries: planner.tries,
        physMs: remaining / speed,
        speed,
        late,
      };
    }

    function finish(now) {
      mode = "rest";
      const finalQ = die.quaternion.clone();
      const top = readTop(finalQ);
      const ft = frameTimes.slice(1);
      const avg = ft.length ? ft.reduce((s, x) => s + x, 0) / ft.length : 0;
      const worst = ft.length ? Math.max(...ft) : 0;
      const info = {
        ...restInfo,
        n: numberInfo.n,
        top,
        ok: top === numberInfo.n,
        holdMs,
        latencyMs: numberInfo.latency,
        numberAt: numberInfo.at,
        flightMs: now - liftStart,
        fpsAvg: avg ? 1000 / avg : 0,
        fpsMin: worst ? 1000 / worst : 0,
        frames: ft.length,
      };
      window.__lastThrow = info;
      if (resolveRest) resolveRest(info);
    }

    return {
      resize,
      beginHold(colours) {
        resize();
        setColours(colours);
        cancelAnimationFrame(raf);
        S = new T.Quaternion();
        bodyQ.setFromEuler(new T.Euler(rand(0, 6), rand(0, 6), rand(0, 6)));
        bodyP.copy(holdPoint);
        die.visible = true;
        numberInfo = null;
        plan = null;
        mode = "hold";
        holdStart = performance.now();
        prevTime = holdStart;
        power = 0;
        raf = requestAnimationFrame(tick);
      },
      power: () => power,
      /** Where the die is on screen (px), and its size there. */
      dieScreen() {
        const c = die.position.clone().project(camera);
        const top = die.position.clone().add(new T.Vector3(0, 0, -0.6)).project(camera);
        return { x: ((c.x + 1) / 2) * width, y: ((1 - c.y) / 2) * height, r: Math.abs(top.y - c.y) * height / 2 };
      },
      holdScreenPoint() {
        const v = holdPoint.clone().project(camera);
        return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
      },
      /** Throws; `numberPromise` resolves to { n, at, latency }. Resolves once at rest. */
      release(numberPromise) {
        holdMs = performance.now() - holdStart;
        mode = "lift";
        liftStart = performance.now();
        liftFrom.copy(bodyP);
        liftQ.copy(bodyQ);
        liftAxis = randomAxis();
        liftSpin = 20 + 14 * power;
        // Plan now (spread over the lift-off frames): physics never needs the number.
        const pAt = new T.Vector3();
        const qAt = new T.Quaternion();
        liftPose(LIFT_MIN_MS, pAt, qAt);
        const flightTarget = (0.9 + 0.7 * power) * 1000;
        const physTarget = Math.min(flightTarget - LIFT_MIN_MS, 2200 - 650 - 110 - (LIFT_MIN_MS - 80));
        planner = makePlanner(pAt, qAt, liftAxis, liftSpin, power, physTarget / 1000, walls);
        planner.step(2);
        numberPromise.then((info) => {
          numberInfo = info;
        });
        return new Promise((resolve) => {
          resolveRest = resolve;
        });
      },
      hide() {
        mode = "off";
        cancelAnimationFrame(raf);
        die.visible = false;
        blob.visible = false;
        renderer.render(scene, camera);
      },
      walls: () => walls,
      blob,
      render: () => renderer.render(scene, camera),
    };
  }

  /** Headless check: every number lands on top, for several throws each. */
  function selfTest(perNumber = 8) {
    const rotations = cubeRotations();
    const walls = { x: 1.4, zNear: 2.4, zFar: -2.4 };
    const results = [];
    for (let n = 1; n <= 6; n += 1) {
      for (let k = 0; k < perNumber; k += 1) {
        const power = Math.random();
        const p = new T.Vector3(0, 3, 0.5);
        const q = new T.Quaternion().setFromEuler(new T.Euler(rand(0, 6), rand(0, 6), rand(0, 6)));
        const plan = planThrow(p, q, randomAxis(), 20 + 14 * power, power, 1, walls);
        snapFlat(plan.sim);
        const S = remapFor(rotations, n, plan.sim.top);
        const o = (plan.sim.count - 1) * 7;
        const f = plan.sim.frames;
        const qMesh = new T.Quaternion(f[o + 3], f[o + 4], f[o + 5], f[o + 6]).multiply(S);
        results.push({ n, top: readTop(qMesh), ms: plan.ms, dur: plan.sim.duration });
      }
    }
    return results;
  }

  /** Debug: how long throws of a given power rest after, from the lift-off pose. */
  function durations(power, count = 20) {
    const walls = window.__walls || { x: 1.3, zNear: 2.2, zFar: -2.2 };
    const out = [];
    for (let k = 0; k < count; k += 1) {
      const q = new T.Quaternion().setFromEuler(new T.Euler(rand(0, 6), rand(0, 6), rand(0, 6)));
      const sim = simulate(throwFrom(new T.Vector3(0, 3.05, 0.5), q, randomAxis(), 20 + 14 * power, power), walls);
      out.push(sim ? Math.round(sim.duration * 1000) : -1);
    }
    return out;
  }

  window.Dice3D = {
    durations,
    load,
    webglAvailable,
    get loadMs() {
      return loadMs;
    },
    get ready() {
      return T !== null && C !== null;
    },
    createStage,
    selfTest,
  };
})();
