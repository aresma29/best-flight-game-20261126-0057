// EMBER WING — world state and rules.
// One job: the airtanker, the fires, the lake, the airstrip, fuel,
// the shift timer and scoring. No drawing here; render.js reads this.

import { WORLD, PLANE, GAME, SCORE, FIRE_BASES } from './config.js';
import { mulberry32, range } from './random.js';

export function wrapZ(z) {
  const L = WORLD.LENGTH;
  return ((z % L) + L) % L;
}

// Forward distance from the camera to a world z (0..LENGTH).
export function forwardDz(z, camZ) {
  return wrapZ(z - camZ);
}

export function createWorld(seed) {
  const rng = mulberry32(seed);
  const fires = FIRE_BASES.map((b) => ({
    x: b.x + range(rng, -24, 24),
    z: b.z + range(rng, -50, 50),
    r: b.r,
    ha: b.ha,
    intensity: 1,
    alive: true,
  }));
  const trees = [];
  for (let i = 0; i < 110; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    trees.push({
      x: side * range(rng, 130, 375),
      z: range(rng, 0, WORLD.LENGTH),
      h: range(rng, 14, 30),
    });
  }
  let best = 0;
  try {
    best = Number(window.localStorage.getItem('emberwing.best') || 0) || 0;
  } catch (err) {
    best = 0;
  }
  return {
    seed,
    rng,
    time: 0,
    screen: 'title',
    reason: '',
    plane: {
      x: 0,
      z: PLANE.START_Z,
      alt: PLANE.START_ALT,
      speed: PLANE.START_SPEED,
      hdg: 0,
      roll: 0,
      throttle: PLANE.START_THROTTLE,
      tank: 0,
      fuel: PLANE.FUEL_START,
    },
    fires,
    trees,
    timeLeft: GAME.SHIFT_SECONDS,
    score: 0,
    savedHa: 0,
    drops: 0,
    firesOut: 0,
    totalBurning: fires.reduce((n, f) => n + f.ha, 0),
    scooping: false,
    refuelling: false,
    dropping: 0,
    dropCooldown: 0,
    spreadTimer: 0,
    gustTimer: range(rng, 7, 11),
    gust: null,
    particles: [],
    messages: [],
    best,
  };
}

function say(world, text, kind) {
  world.messages.push({ text, kind: kind || 'info', ttl: 3.2 });
  if (world.messages.length > 4) world.messages.shift();
}

function overLake(world) {
  const p = world.plane;
  const L = WORLD.LAKE;
  return (
    p.z >= L.z0 &&
    p.z <= L.z1 &&
    p.x >= L.x0 &&
    p.x <= L.x1 &&
    p.alt <= PLANE.SCOOP_ALT &&
    p.speed >= PLANE.SCOOP_SPEED
  );
}

function overStrip(world) {
  const p = world.plane;
  const S = WORLD.STRIP;
  return (
    p.z >= S.z0 &&
    p.z <= S.z1 &&
    p.x >= S.x0 &&
    p.x <= S.x1 &&
    p.alt <= PLANE.REFUEL_ALT
  );
}

// The fire the HUD target ring points at: the biggest fire still burning.
export function targetFire(world) {
  let best = null;
  for (const f of world.fires) {
    if (!f.alive) continue;
    if (best === null || f.ha > best.ha) best = f;
  }
  return best;
}

function endGame(world, reason) {
  world.screen = 'over';
  world.reason = reason;
  if (world.score > world.best) {
    world.best = world.score;
    try {
      window.localStorage.setItem('emberwing.best', String(world.best));
    } catch (err) {
      // Storage unavailable; the score still stands for this session.
    }
  }
}

function doDrop(world) {
  const p = world.plane;
  if (p.tank < PLANE.DROP_USE || world.dropCooldown > 0) return;
  p.tank -= PLANE.DROP_USE;
  world.drops += 1;
  world.dropCooldown = GAME.DROP_COOLDOWN;
  world.dropping = 0.9;
  const impactX = p.x + Math.sin((p.hdg * Math.PI) / 180) * 40;
  const impactZ = wrapZ(p.z + 120 + p.speed * 0.45);
  for (let i = 0; i < 26; i++) {
    world.particles.push({
      kind: 'water',
      x: impactX + range(world.rng, -30, 30),
      z: wrapZ(impactZ + range(world.rng, -30, 30)),
      vy: range(world.rng, 0, 1),
      ttl: range(world.rng, 0.5, 1.1),
    });
  }
  if (p.alt > PLANE.DROP_ALT_MAX) {
    say(world, 'TOO HIGH — drop below 1,000 ft to hit the fire', 'warn');
    return;
  }
  let hit = null;
  let hitDz = 1e9;
  for (const f of world.fires) {
    if (!f.alive) continue;
    const dz = forwardDz(f.z, impactZ);
    const dzBack = forwardDz(impactZ, f.z);
    const along = Math.min(dz, dzBack);
    const across = Math.abs(f.x - impactX);
    if (along < 90 && across < f.r + 45 && along < hitDz) {
      hit = f;
      hitDz = along;
    }
  }
  if (hit === null) {
    say(world, 'DROP MISSED — water on empty ground', 'warn');
    return;
  }
  const saved = Math.min(hit.ha, 6 + hit.intensity * 4);
  hit.ha -= saved;
  hit.intensity -= 0.55;
  world.savedHa += saved;
  const gained = SCORE.HIT_BASE + Math.round(saved * SCORE.PER_HA);
  world.score += gained;
  if (hit.intensity <= 0 || hit.ha <= 0) {
    hit.alive = false;
    hit.ha = 0;
    world.firesOut += 1;
    world.score += SCORE.FIRE_OUT_BONUS;
    say(world, 'FIRE OUT! +' + (gained + SCORE.FIRE_OUT_BONUS) + '  — ' + saved.toFixed(1) + ' ha saved', 'good');
  } else {
    say(world, 'DIRECT HIT! +' + gained + '  — ' + saved.toFixed(1) + ' ha saved', 'good');
  }
}

export function update(world, actions, dt) {
  if (world.screen === 'title') {
    if (actions.start) {
      world.screen = 'play';
      say(world, 'Scoop from the lake, then drop on the fires!', 'info');
    }
    return;
  }
  if (world.screen === 'over') {
    if (actions.restart) {
      const fresh = createWorld(world.seed + 1);
      fresh.screen = 'play';
      Object.keys(world).forEach((k) => delete world[k]);
      Object.assign(world, fresh);
      say(world, 'Scoop from the lake, then drop on the fires!', 'info');
    }
    return;
  }
  // Paused first: the same key that pauses must also resume, so the
  // resume check has to run before the pause check below it.
  if (world.screen === 'paused') {
    if (actions.pause || actions.start) world.screen = 'play';
    return;
  }
  if (actions.pause) {
    world.screen = 'paused';
    return;
  }

  const p = world.plane;
  world.time += dt;
  world.timeLeft -= dt;
  world.dropCooldown = Math.max(0, world.dropCooldown - dt);
  world.dropping = Math.max(0, world.dropping - dt);

  // Throttle and speed.
  if (actions.throttleUp) p.throttle = Math.min(100, p.throttle + 25 * dt);
  if (actions.throttleDown) p.throttle = Math.max(30, p.throttle - 25 * dt);
  const targetSpeed = 50 + p.throttle * 1.4;
  p.speed += Math.max(-30 * dt, Math.min(30 * dt, targetSpeed - p.speed));

  // Bank, heading and lateral position.
  const rollTarget = actions.left ? -0.55 : actions.right ? 0.55 : 0;
  p.roll += Math.max(-2.5 * dt, Math.min(2.5 * dt, rollTarget - p.roll));
  p.hdg += p.roll * 34 * dt;
  if (p.hdg > 180) p.hdg -= 360;
  if (p.hdg < -180) p.hdg += 360;
  p.x += (Math.sin((p.hdg * Math.PI) / 180) * p.speed * 0.55 + p.roll * p.speed * 0.4) * dt;
  if (p.x < WORLD.X_MIN) {
    p.x = WORLD.X_MIN;
    // Ease the heading back toward +25 so the plane turns for the valley.
    p.hdg += (25 - p.hdg) * Math.min(1, 2 * dt);
  }
  if (p.x > WORLD.X_MAX) {
    p.x = WORLD.X_MAX;
    p.hdg += (-25 - p.hdg) * Math.min(1, 2 * dt);
  }

  // Pitch and altitude.
  if (actions.up) p.alt += 72 * dt;
  if (actions.down) p.alt -= 95 * dt;
  p.alt += (p.throttle - 62) * 0.06 * dt;
  p.alt = Math.max(PLANE.ALT_MIN, Math.min(PLANE.ALT_MAX, p.alt));

  // Forward motion and fuel.
  p.z = wrapZ(p.z + p.speed * 0.85 * dt);
  p.fuel -= dt * (0.2 + p.throttle * 0.0016);
  if (p.fuel <= 0) {
    p.fuel = 0;
    endGame(world, 'OUT OF FUEL');
    return;
  }

  // Wind gusts push the plane sideways for a couple of seconds.
  world.gustTimer -= dt;
  if (world.gustTimer <= 0) {
    world.gust = {
      dir: world.rng() < 0.5 ? -1 : 1,
      strength: range(world.rng, 18, 30),
      t: 2.2,
    };
    world.gustTimer = range(world.rng, GAME.GUST_EVERY_MIN, GAME.GUST_EVERY_MAX);
    say(world, 'WIND GUST ' + (world.gust.dir < 0 ? '◀' : '▶') + ' — hold your line', 'warn');
  }
  if (world.gust !== null) {
    world.gust.t -= dt;
    p.x += world.gust.dir * world.gust.strength * dt;
    p.x = Math.max(WORLD.X_MIN, Math.min(WORLD.X_MAX, p.x));
    if (world.gust.t <= 0) world.gust = null;
  }

  // Scoop water low over the lake.
  world.scooping = false;
  if (overLake(world) && p.tank < PLANE.TANK_MAX) {
    world.scooping = true;
    p.tank = Math.min(PLANE.TANK_MAX, p.tank + 42 * dt);
    if (world.rng() < 0.5) {
      world.particles.push({
        kind: 'spray',
        x: p.x + range(world.rng, -24, 24),
        z: wrapZ(p.z + range(world.rng, -10, 30)),
        vy: range(world.rng, 0, 1),
        ttl: 0.6,
      });
    }
    if (p.tank >= PLANE.TANK_MAX && !world._tankFullSaid) {
      world._tankFullSaid = true;
      say(world, 'TANK FULL — find the fire!', 'good');
    }
  }
  if (p.tank < 90) world._tankFullSaid = false;

  // Refuel low over the airstrip.
  world.refuelling = false;
  if (overStrip(world) && p.fuel < PLANE.FUEL_START) {
    world.refuelling = true;
    p.fuel = Math.min(PLANE.FUEL_START, p.fuel + 26 * dt);
  }

  // Drop water.
  if (actions.drop) doDrop(world);

  // Fire spread on a timer.
  world.spreadTimer += dt;
  if (world.spreadTimer >= GAME.FIRE_GROW_EVERY) {
    world.spreadTimer = 0;
    for (const f of world.fires) {
      if (!f.alive) continue;
      f.ha += 0.35 * f.intensity;
      f.intensity = Math.min(1.6, f.intensity + 0.015);
    }
  }
  world.totalBurning = world.fires.reduce((n, f) => n + (f.alive ? f.ha : 0), 0);

  // Particles age.
  for (const pt of world.particles) pt.ttl -= dt;
  world.particles = world.particles.filter((pt) => pt.ttl > 0);

  // Messages age.
  for (const m of world.messages) m.ttl -= dt;
  world.messages = world.messages.filter((m) => m.ttl > 0);

  // End conditions.
  if (world.totalBurning >= GAME.BURN_LIMIT_HA) {
    endGame(world, 'THE VALLEY IS LOST');
    return;
  }
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    endGame(world, 'SHIFT COMPLETE');
  }
}
