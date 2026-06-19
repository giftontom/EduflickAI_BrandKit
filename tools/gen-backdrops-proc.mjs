// Eduflick AI — procedural backdrop generator (the offline / fallback image layer)
// When the Gemini image model isn't available (free-tier / no billing), this renders
// the abstract indigo backdrops from tools/_backdrop-art.mjs (gradient mesh + fractal
// fog + the notch motif + particle fields) to the SAME filenames gen-backdrops.mjs
// uses — so a paid key later just overwrites them.
//
//   cd tools
//   npm run gen:backdrops:proc                                # → the Mode-A set
//   ONLY=poster-why,poster-proof npm run gen:backdrops:proc   # a subset
//   ALL=1 npm run gen:backdrops:proc                          # also program + masterclass abstracts
//
// Strictly indigo + neutral. No text, no logo, no people — type/mark stay in HTML.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderProcedural, MODE_A, ALL } from './_backdrop-art.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../design-system/collateral/assets/backdrops');

const names = process.env.ONLY
  ? process.env.ONLY.split(',').map(s => s.trim()).filter(Boolean)
  : (process.env.ALL ? ALL : MODE_A);

console.log(`Rendering ${names.length} procedural backdrops →`, OUT, '\n');
const done = await renderProcedural(names, OUT);
console.log(`\nDone — ${done.length}/${names.length} procedural backdrops.`);
process.exit(done.length === names.length ? 0 : 1);
