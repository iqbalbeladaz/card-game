// Ember Clash — the hand-in program for the best-card-game bounty.
//
// The game is plain static files under game/ (index.html plus ES modules and
// one stylesheet, no build step, no network request), and this program hands
// it in: it copies game/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json with the vendored make.fun library, so the
// judge can read the game from the dossier alone.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Node 22.18 or later runs this TypeScript file as it is.)
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn() {
  mkdirSync(outDir, { recursive: true });

  // The game itself: every file under game/ goes over whole.
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

  // The screenshots: real renders of the game's own code, first by name is the cover.
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  // The dossier the judge reads, built by the kit's library from what was copied.
  // The caps mirror the gate: at most 4 screenshots of 256 KiB, a game of at
  // most 993 files and 48 MiB, and the dossier text capped at 160 KiB.
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

handIn();
