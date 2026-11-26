// EMBER WING — Wildfire Airtanker: build entry.
// Node 22 standard library only. Copies game/ and screenshots/ into the
// output directory and writes dossier.json via buildDossier (named
// import) from vendor/makefun-game.ts, byte-identical to the scorer's.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const root = new URL('.', import.meta.url).pathname;

mkdirSync(outDir, { recursive: true });

const gameSrc = join(root, 'game');
const shotsSrc = join(root, 'screenshots');
if (!existsSync(gameSrc)) throw new Error('game/ is missing');
if (!existsSync(join(gameSrc, 'index.html'))) throw new Error('game/index.html is missing');
if (!existsSync(shotsSrc)) throw new Error('screenshots/ is missing');

cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('EMBER WING built into ' + outDir);
