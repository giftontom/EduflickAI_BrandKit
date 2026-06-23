// Eduflick AI — backdrop generator (the AI-imagery layer)
// Builds the on-brand image prompt from AI_IMAGERY_GUIDE.md §4 (style preamble +
// palette literals + a per-poster BRIEF + the negative block) and asks an image PROVIDER
// to produce ONE abstract indigo backdrop per poster. Text/mark/data are NEVER in the
// image — they stay in HTML.
//
// Providers (choose with PROVIDER=…):
//   • gemini   (default) — Gemini/Imagen model cascade. On a free-tier key the image
//                          models hard-block, so this falls through to procedural.
//   • recraft           — paid Recraft, palette-locked via `controls` + optional brand
//                          RECRAFT_STYLE_ID. Best for smooth-glow backdrops / illustration.
//   • proc | none       — skip AI entirely; render everything procedurally.
// Whatever the provider doesn't produce falls back to the procedural generator
// (_backdrop-art.mjs) so every poster always gets a real, on-brand PNG.
//
//   cd tools
//   node --env-file=../.env.local gen-backdrops.mjs            # default (gemini → procedural)
//   PROVIDER=recraft npm run gen:recraft                       # paid Recraft → procedural
//   PROVIDER=proc    npm run gen:backdrops                     # straight to procedural
//   RECRAFT_STYLE_ID=<uuid> npm run gen:recraft                # lock the brand style (Phase 2)
//   MODEL=gemini-3-pro-image npm run gen:gemini                # pin one Gemini model
//   ONLY=poster-why,poster-proof npm run gen:backdrops         # a subset
//   ALL=1 npm run gen:backdrops                                # also program + masterclass
//
// Keys are read from the environment only (load via --env-file=.env.local) — never hardcode.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderProcedural, MODE_A, ALL } from './_backdrop-art.mjs';
import geminiProvider from './providers/gemini.mjs';
import recraftProvider from './providers/recraft.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT    = process.env.OUT
  ? path.resolve(process.env.OUT)                           // scratch dir for experiments
  : path.resolve(__dirname, '../design-system/collateral/assets/backdrops');
const ASPECT = process.env.ASPECT || '4:5';                 // imagen falls back to 3:4 (it rejects 4:5)

// ── provider selection ──────────────────────────────────────────────────────────
// 'proc'/'none' (or NO_AI, or legacy NO_GEMINI on the default provider) → skip AI.
const PROVIDER_NAME = (process.env.PROVIDER || 'gemini').toLowerCase();
const PROVIDERS = { gemini: geminiProvider, recraft: recraftProvider };
const skipAI = PROVIDER_NAME === 'proc' || PROVIDER_NAME === 'none' || Boolean(process.env.NO_AI);
const provider = skipAI ? null : PROVIDERS[PROVIDER_NAME];
if (!skipAI && !provider) {
  console.error(`Unknown PROVIDER "${PROVIDER_NAME}" — use one of: gemini | recraft | proc`);
  process.exit(1);
}

const names = process.env.ONLY
  ? process.env.ONLY.split(',').map(s => s.trim()).filter(Boolean)
  : (process.env.ALL ? ALL : MODE_A);

fs.mkdirSync(OUT, { recursive: true });

// ── the reusable prompt kit (AI_IMAGERY_GUIDE.md §4) ────────────────────────────
const PREAMBLE = `Abstract generative brand texture for "Eduflick AI". Deep INDIGO MONOCHROME only.
Mood: precise, editorial, an engineer's calm — premium, minimal, lots of negative space.
Form vocabulary: volumetric indigo light in dark space; a fine particle / dot field; topographic
contour lines; soft intersecting geometric planes; an abstracted square "feed card" with a
triangular notch bitten from one edge (the brand mark as pure SHAPE, never a readable logo).
Faint dot-grid / line-grid structure, low contrast. Lighting dark and soft, no harsh flare.
Composition: clean, asymmetric, deliberate empty space for text to be placed on top later.
This is a BACKGROUND TEXTURE — not a scene, not a photo, no subject.`;

const PALETTE = `Palette, strictly: ink #0A0B10 (background), indigo-ink #0B0822 (deep),
indigo #5B5BF0 (primary), light indigo #8B97FF (accent/highlight), warm paper #F5F2EA (only as a
rare faint light). Indigo and its ramp + neutral ONLY. No other hue anywhere.`;

const NEGATIVE = `Do NOT include: text, letters, words, numbers, captions, watermark, logo, signature;
people, faces, hands, bodies, real objects, devices, screens, UI; photograph, photorealism,
stock-photo look; any green, red, orange, teal, purple, yellow, pink — no third hue, no rainbow
gradient; bevels, glossy 3D, heavy lens flare, busy collage, clutter.`;

// Per-poster BRIEF — tuned so the hero glow lands where the headline goes and the dense
// lower band (spec rows / feature points) stays dark. Mirrors the zones in _backdrop-art.mjs.
const BRIEFS = {
  'poster-program': `BRIEF: soft intersecting translucent geometric planes evoking a square feed-card with a
triangular notch bitten from its right edge; deep indigo monochrome; directional light from the right;
generous open dark space in the upper-left for a large headline.`,
  'poster-seats': `BRIEF: a single volumetric column of indigo light converging into one bright focal pool in
deep dark-indigo space — the feeling of one room — with fine grain; the glow sits slightly off-centre to the
right; calm, minimal, lots of darkness around it.`,
  'poster-masterclass': `BRIEF: a fine indigo particle field drifting and blooming toward a soft bright point of
light, set on a pale warm-paper high-key field; very light and airy; generous empty negative space in the
lower-left; calm and editorial.`,
  'poster-build': `BRIEF: a brighter, energetic indigo field with directional light from the upper-right and
soft translucent notched planes; the lower-left falls into deeper indigo; an open bright mid-zone where a
product UI will sit on top; confident but uncluttered.`,
  'poster-why': `BRIEF: a calm, DARK indigo field; one soft glow in the upper-left with faint concentric
topographic contour lines radiating from it (an explainer feel); the lower two-thirds stays deep and almost
black so a column of feature rows reads on top; very restrained.`,
  'poster-proof': `BRIEF: a DARK indigo field with a soft upward shaft of light and a gentle bloom in the upper
third (a quiet sense of achievement); the lower band stays deep and dark for proof chips and spec rows;
premium and understated.`,
  'poster-enquiry': `BRIEF: a DARK indigo field; a soft glow and two faint notched planes behind the upper-left
headline; the lower half is deep and calm so a five-row detail block reads on top; informational, premium,
lots of quiet.`,
};

// state shared across posters so we don't hammer a provider that's hard-blocked
let hardBlocked = false, blockMsg = '';

async function tryProvider(name) {
  // Pass the raw prompt parts; each provider composes what it needs. Gemini takes long
  // prompts (preamble+palette+brief+negative); Recraft caps at 1000 chars and gets palette
  // via `controls` + negatives via `negative_prompt`, so it composes a compact prompt itself.
  const parts = { preamble: PREAMBLE, palette: PALETTE, brief: BRIEFS[name] || '', negative: NEGATIVE, name };
  const r = await provider.generate(parts, { aspect: ASPECT });
  if (r.ok) {
    fs.writeFileSync(path.join(OUT, name + '.png'), r.buf);
    console.log(`  ✓ ${name}.png  (${r.via}, ${(r.buf.length / 1024).toFixed(0)} KB)`);
    return true;
  }
  if (r.hardBlock) { hardBlocked = true; blockMsg = r.msg; }
  else if (r.err) console.log(`  · ${name}: ${r.err} → procedural`);
  return false;
}

console.log(`Backdrops → ${OUT}`);
console.log(`Provider: ${skipAI ? 'procedural only' : provider.name}`);
if (provider && !provider.available())
  console.log(`! ${provider.name} unavailable (no key, or explicitly disabled) — using the procedural generator.`);
console.log(`Targets: ${names.join(', ')}\n`);

const fellBack = [];
for (const name of names) {
  if (!BRIEFS[name]) { console.log(`  ! no brief for ${name} — procedural`); fellBack.push(name); continue; }
  let ok = false;
  if (provider && provider.available() && !hardBlocked) ok = await tryProvider(name);
  if (!ok) fellBack.push(name);
}

let proceduralDone = [];
if (fellBack.length) {
  if (hardBlocked) {
    console.log(`\n⚠  ${provider.name} image models are blocked on this key:`);
    console.log(`   ${blockMsg}`);
    if (provider.name === 'gemini')
      console.log(`   → Enable billing on the key's Google Cloud project to get real AI images.`);
  }
  console.log(`\nRendering ${fellBack.length} backdrop(s) procedurally (on-brand fallback)…`);
  proceduralDone = await renderProcedural(fellBack, OUT);   // returns the names it actually rendered
}

// Reconcile: a target with neither a BRIEF nor procedural ART produces no PNG — surface it
// instead of counting it as done, and exit non-zero so automation/CI notices.
const viaAI = names.length - fellBack.length;
const missing = fellBack.filter(n => !proceduralDone.includes(n));
console.log(`\nDone — ${names.length - missing.length}/${names.length} backdrop(s): ${viaAI} via ${skipAI ? 'none' : provider.name}, ${proceduralDone.length} procedural.`);
if (missing.length) console.log(`⚠  no backdrop produced for: ${missing.join(', ')} (no brief + no procedural art)`);
process.exit(missing.length ? 1 : 0);
