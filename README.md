# EMBER WING — Wildfire Airtanker

[![Competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/aresma29/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/aresma29/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A complete, original flight game for the make.fun best-flight-game competition. You fly a wildfire airtanker in chase view over a mountain valley: scoop water low over the lake, climb out, and drop it on the burning ridge before your shift ends. Fire spreads on a timer, wind gusts push you off line, and fuel runs down — land low over the airstrip to refuel.

## How to play

- **Up / Down arrows** — pitch: climb / descend
- **Left / Right or A / D** — bank and turn
- **W / S** — throttle up / down
- **SPACE or click** — drop water (needs tank, works best below 1,000 ft)
- **P** — pause · **M** — mute

Scoop by flying below 380 ft over the lake faster than 90 kt. Score = hectares saved + fires put out. The shift lasts 240 seconds; if the valley burns past 400 ha, it is lost.

## How to run it

Open `game/index.html` in a desktop browser, or serve the `game/` folder with any static server — the game plays fully offline, no network requests, vanilla JavaScript and canvas only, sounds synthesized with WebAudio.

Deterministic screenshots: `game/index.html?shot=start|play|drop|end&seed=1` stages a real moment of play from the game's own rules.

- `start` — title screen over the valley
- `play` — mid-flight, tank full, hunting the next fire
- `drop` — water falling on a fire front, just after release
- `end` — shift complete, final score

Switching browser tabs mid-flight pauses the game automatically.

## Files

- `game/index.html` — the page; loads `./src/main.js`
- `game/src/config.js` — tuning, valley layout, palette
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard + mouse
- `game/src/world.js` — state and rules (flight, scoop, drop, fire spread, fuel, scoring)
- `game/src/render.js` — all canvas drawing (chase view, HUD, screens)
- `game/src/audio.js` — WebAudio synth sounds
- `game/src/shots.js` — deterministic staging autopilot
- `game/src/main.js` — boot and fixed-step loop
- `main.ts` — builds the entry (Node 22, standard library only)
- `vendor/makefun-game.ts` — make.fun game library, copied unchanged from the kit
