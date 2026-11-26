// EMBER WING — deterministic screenshot staging.
// One job: drive the REAL rules forward with a scripted autopilot so
// ?shot=start|play|drop|end always paints a true moment of the game.
// Fixed 1/60s steps, seeded world, no wall-clock input anywhere.

import { createWorld, update } from './world.js';
import { WORLD } from './config.js';

const DT = 1 / 60;

// A synthetic input frame: the autopilot steers toward a target point
// in the valley and holds a target altitude.
function autopilot(world, want) {
  const p = world.plane;
  const dx = want.x - p.x;
  const dAlt = want.alt - p.alt;
  return {
    left: dx < -18,
    right: dx > 18,
    up: dAlt > 26,
    down: dAlt < -26,
    throttleUp: p.throttle < want.throttle,
    throttleDown: p.throttle > want.throttle,
    drop: false,
    start: false,
    pause: false,
    restart: false,
    mute: false,
  };
}

function step(world, actions, n) {
  for (let i = 0; i < n; i++) update(world, actions, DT);
}

function stepAutopilot(world, want, n) {
  for (let i = 0; i < n; i++) update(world, autopilot(world, want), DT);
}

function nearestFire(world) {
  let best = null;
  let bestDz = 1e9;
  for (const f of world.fires) {
    if (!f.alive) continue;
    const dz = ((f.z - world.plane.z) % WORLD.LENGTH + WORLD.LENGTH) % WORLD.LENGTH;
    if (dz < bestDz) {
      bestDz = dz;
      best = f;
    }
  }
  return { fire: best, dz: bestDz };
}

// Fly the plane to the lake and skim it until the tank is full.
function goScoop(world, maxSeconds) {
  const steps = Math.floor(maxSeconds * 60);
  for (let i = 0; i < steps; i++) {
    const p = world.plane;
    const lakeDz = ((WORLD.LAKE.z0 - p.z) % WORLD.LENGTH + WORLD.LENGTH) % WORLD.LENGTH;
    const over = p.z >= WORLD.LAKE.z0 && p.z <= WORLD.LAKE.z1;
    const want = over
      ? { x: 0, alt: 300, throttle: 62 }
      : { x: 0, alt: lakeDz < 500 ? 320 : 650, throttle: 70 };
    update(world, autopilot(world, want), DT);
    if (world.screen !== 'play') return;
    if (p.tank >= 95) return;
  }
}

// Fly to the nearest fire and drop when the run lines up. The lineup
// is checked against the predicted impact point, not the plane, and
// the pass repeats until a drop scores (or the tank runs low).
function goDrop(world, maxSeconds) {
  const steps = Math.floor(maxSeconds * 60);
  const dropsAtStart = world.drops;
  for (let i = 0; i < steps; i++) {
    const p = world.plane;
    const { fire, dz } = nearestFire(world);
    if (fire === null) return;
    const want = { x: fire.x, alt: 700, throttle: 68 };
    const actions = autopilot(world, want);
    const impactX = p.x + Math.sin((p.hdg * Math.PI) / 180) * 40;
    const impactDz = 120 + p.speed * 0.45;
    const linedUp =
      Math.abs(dz - impactDz) < 55 &&
      Math.abs(fire.x - impactX) < 30 &&
      p.alt < 950 &&
      p.tank >= 25;
    actions.drop = linedUp;
    update(world, actions, DT);
    if (world.screen !== 'play') return;
    if (world.score > 0) return;
    if (world.drops - dropsAtStart >= 3) return;
  }
}

export function stageShot(shot, seed) {
  const world = createWorld(seed);
  if (shot === 'start') {
    world.time = 1.2;
    return world;
  }
  world.screen = 'play';
  if (shot === 'play') {
    goScoop(world, 45);
    if (world.screen === 'play' && world.drops === 0) {
      goDrop(world, 40);
    }
    // Settle on a lively mid-flight frame.
    stepAutopilot(world, { x: 0, alt: 620, throttle: 66 }, 90);
    return world;
  }
  if (shot === 'drop') {
    goScoop(world, 45);
    goDrop(world, 40);
    // Freeze just after the drop, while the water is still falling.
    step(world, autopilot(world, { x: world.plane.x, alt: 700, throttle: 66 }), 22);
    return world;
  }
  // end: fly a real sortie, then run the clock out.
  goScoop(world, 45);
  goDrop(world, 40);
  if (world.screen === 'play' && world.drops === 0) {
    goDrop(world, 40);
  }
  world.timeLeft = 0.4;
  stepAutopilot(world, { x: 0, alt: 620, throttle: 66 }, 40);
  return world;
}
