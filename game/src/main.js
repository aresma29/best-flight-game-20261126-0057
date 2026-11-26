// EMBER WING — boot and game loop.
// One job: wire input, world, audio and render together. Fixed 1/60s
// simulation steps; ?seed=N replays the same valley; ?shot=start|play|
// drop|end stages a deterministic scene from the real rules, paints
// it, and reports window.__shotReady + window.__gameState.

import { VIEW } from './config.js';
import { createWorld, update } from './world.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const DT = 1 / 60;

function query() {
  return new URLSearchParams(window.location.search);
}

function stateOf(world, shot) {
  const p = world.plane;
  return {
    screen: world.screen,
    reason: world.reason,
    score: world.score,
    best: world.best,
    tank: Math.round(p.tank),
    fuel: Math.round(p.fuel),
    alt: Math.round(p.alt),
    speed: Math.round(p.speed),
    hdg: Math.round(((p.hdg % 360) + 360) % 360),
    x: Math.round(p.x),
    z: Math.round(p.z),
    timeLeft: Math.round(world.timeLeft),
    firesOut: world.firesOut,
    firesTotal: world.fires.length,
    savedHa: Math.round(world.savedHa * 10) / 10,
    drops: world.drops,
    totalBurning: Math.round(world.totalBurning),
    scooping: world.scooping,
    shot: shot || null,
  };
}

function main() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const q = query();
  const seed = Number(q.get('seed') || 1) || 1;
  const shot = q.get('shot');
  const audio = createAudio();

  if (shot !== null && shot !== '') {
    // Deterministic staging: no listeners, no audio, no animation loop.
    const world = stageShot(shot, seed);
    render(ctx, world);
    render(ctx, world);
    window.__gameState = stateOf(world, shot);
    window.__shotReady = true;
    return;
  }

  const world = createWorld(seed);
  const input = createInput(canvas);
  // Switching tabs mid-flight pauses the game instead of letting the
  // shift timer run out while the player is away.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.screen === 'play') world.screen = 'paused';
  });
  let acc = 0;
  let last = performance.now();
  let lastDropCount = 0;
  let lastFireCount = 0;
  let lastFuelAlarm = 0;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    let n = 0;
    while (acc >= DT && n < 5) {
      const actions = input.poll();
      if (actions.mute) audio.toggleMute();
      if (world.screen === 'title' && actions.start) audio.unlock();
      const before = world.screen;
      update(world, actions, DT);
      if (world.screen === 'play' && before !== 'play') audio.unlock();
      if (world.drops > lastDropCount) {
        audio.drop();
        lastDropCount = world.drops;
      }
      if (world.firesOut > lastFireCount) {
        audio.chime();
        lastFireCount = world.firesOut;
      }
      if (world.scooping) audio.scoop();
      if (world.plane.fuel < 22 && world.time - lastFuelAlarm > 5) {
        audio.alarm();
        lastFuelAlarm = world.time;
      }
      acc -= DT;
      n++;
    }
    audio.engine(world.plane.throttle, world.screen === 'play');
    render(ctx, world);
    window.__gameState = stateOf(world, null);
    window.__shotReady = true;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
