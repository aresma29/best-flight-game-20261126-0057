// EMBER WING — Wildfire Airtanker: tuning, layout and palette.
// One job: every number the game balances on lives here, so world.js
// and render.js never disagree about the valley, the lake or the fires.

export const VIEW = {
  W: 1280,
  H: 720,
  HORIZON: 252,
  VIEW_DIST: 2600,
};

export const WORLD = {
  LENGTH: 4000,
  X_MIN: -380,
  X_MAX: 380,
  LAKE: { x0: -260, x1: 260, z0: 1800, z1: 2300 },
  STRIP: { x0: -55, x1: 55, z0: 300, z1: 700 },
};

export const PLANE = {
  ALT_MIN: 150,
  ALT_MAX: 2500,
  SCOOP_ALT: 380,
  SCOOP_SPEED: 90,
  DROP_ALT_MAX: 1000,
  TANK_MAX: 100,
  DROP_USE: 25,
  FUEL_START: 100,
  START_ALT: 650,
  START_SPEED: 120,
  START_THROTTLE: 65,
  START_Z: 150,
  REFUEL_ALT: 300,
};

export const GAME = {
  SHIFT_SECONDS: 240,
  BURN_LIMIT_HA: 400,
  DROP_COOLDOWN: 0.8,
  FIRE_GROW_EVERY: 2,
  GUST_EVERY_MIN: 8,
  GUST_EVERY_MAX: 14,
};

// Scoring: a hit pays a base plus per-hectare saved; putting a fire
// out entirely pays the bonus on top.
export const SCORE = {
  HIT_BASE: 120,
  PER_HA: 8,
  FIRE_OUT_BONUS: 200,
};

// Six fire fronts on the burning ridge, seeded jitter applied in world.js.
export const FIRE_BASES = [
  { x: -270, z: 2560, r: 30, ha: 12 },
  { x: -150, z: 2790, r: 34, ha: 15 },
  { x: -40, z: 2620, r: 28, ha: 11 },
  { x: 70, z: 2950, r: 36, ha: 17 },
  { x: 180, z: 2700, r: 30, ha: 13 },
  { x: 285, z: 3120, r: 32, ha: 14 },
];

export const COLORS = {
  skyTop: '#2f6fb2',
  skyMid: '#7fb2dd',
  skyLow: '#cfe6f2',
  ridgeFar: '#7d94a8',
  ridgeNear: '#5c7a52',
  meadowA: '#5d8a43',
  meadowB: '#598843',
  meadowDry: '#8a8a4a',
  lake: '#2e7fc2',
  lakeDeep: '#1d5f9e',
  strip: '#5a5f66',
  stripLine: '#f2f2e8',
  fireCore: '#ffd23e',
  fireMid: '#ff7a1a',
  fireEdge: '#e83c0c',
  smoke: '#6f6f6f',
  hudBg: 'rgba(8, 18, 28, 0.8)',
  hudText: '#eaf6ff',
  hudWarn: '#ffb020',
  hudBad: '#ff5340',
  hudGood: '#7ee787',
  planeRed: '#d8382c',
  planeWhite: '#f4f6f2',
  planeBelly: '#274b73',
};

export const TEXT = {
  title: 'EMBER WING',
  subtitle: 'WILDFIRE AIRTANKER',
  mission:
    'The ridge is burning. Scoop water from the lake, drop it on the fire fronts, and save the valley before your shift ends.',
  controls: [
    'UP / DOWN arrows — pitch: climb / descend',
    'LEFT / RIGHT or A / D — bank and turn',
    'W / S — throttle up / down',
    'SPACE or CLICK — drop water',
    'P — pause    M — mute',
  ],
};
