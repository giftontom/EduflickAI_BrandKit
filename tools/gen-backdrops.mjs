// Eduflick AI — backdrop generator (the AI-imagery layer)
// Builds the on-brand image prompt from AI_IMAGERY_GUIDE.md §4 (style preamble +
// palette literals + a per-poster BRIEF + the negative block) and asks a Gemini image
// model to produce ONE abstract indigo backdrop per poster. Text/mark/data are NEVER
// in the image — they stay in HTML.
//
// Robust by design:
//   • tries a CASCADE of image models (gemini-3-pro-image → 2.5-flash-image →
//     3.1-flash-image → imagen-4 predict) and uses the first that works;
//   • on a transient 429 it backs off once and retries;
//   • on a hard free-tier block (`limit: 0` / "only available on paid plans") it stops
//     hammering the API and FALLS BACK to the procedural generator (tools/_backdrop-art.mjs)
//     so every poster still gets a real, on-brand PNG now — swappable for true AI later.
//
//   cd tools
//   GEMINI_API_KEY=… npm run gen:backdrops                    # Mode-A set, AI→procedural
//   MODEL=gemini-3-pro-image npm run gen:backdrops            # pin one model
//   ONLY=poster-why,poster-proof npm run gen:backdrops        # a subset
//   ALL=1 npm run gen:backdrops                               # also program + masterclass
//   NO_GEMINI=1 npm run gen:backdrops                         # skip AI, go straight to procedural
//
// The key is read from the environment only — never hardcode it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderProcedural, MODE_A, ALL } from './_backdrop-art.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT    = path.resolve(__dirname, '../design-system/collateral/assets/backdrops');
const KEY    = process.env.GEMINI_API_KEY;
const ASPECT = process.env.ASPECT || '4:5';                 // imagen falls back to 3:4 (it rejects 4:5)

// generateContent image models first, then imagen predict models as a last resort
const CASCADE = process.env.MODEL
  ? [process.env.MODEL]
  : ['gemini-3-pro-image', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image',
     'imagen-4.0-fast-generate-001', 'imagen-4.0-generate-001'];

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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const isImagen = (m) => m.startsWith('imagen');

// Returns {ok:true, buf} | {hardBlock:true, msg} | {retryMs} | {err}
async function callModel(model, prompt) {
  try {
    let url, body;
    if (isImagen(model)) {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${KEY}`;
      body = { instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '3:4' } };
    } else {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
      body = { contents: [{ role: 'user', parts: [{ text: prompt }] }],
               generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ASPECT } } };
    }
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const txt = await res.text();
    if (!res.ok) {
      const msg = txt.replace(/\s+/g, ' ').slice(0, 240);
      // hard, non-retryable: free-tier zero quota or paid-only model
      if (/limit:\s*0|only available on paid plans|check your plan and billing/i.test(txt))
        return { hardBlock: true, msg };
      // transient rate limit with a server-suggested delay
      const m = txt.match(/retry in ([0-9.]+)s/i);
      if (res.status === 429 && m) return { retryMs: Math.min(Math.ceil(parseFloat(m[1]) * 1000), 6000) };
      return { err: `HTTP ${res.status}: ${msg}` };
    }
    const j = JSON.parse(txt);
    const b64 = isImagen(model)
      ? j?.predictions?.[0]?.bytesBase64Encoded
      : (j?.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data)?.inlineData?.data;
    if (!b64) return { err: 'no image part in response' };
    return { ok: true, buf: Buffer.from(b64, 'base64') };
  } catch (e) {
    return { err: e.message };
  }
}

// state shared across posters so we don't hammer a key that's hard-blocked
let hardBlocked = false, blockMsg = '';

async function tryGemini(name) {
  const prompt = [PREAMBLE, PALETTE, BRIEFS[name] || '', NEGATIVE].join('\n\n');
  for (const model of CASCADE) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await callModel(model, prompt);
      if (r.ok) {
        fs.writeFileSync(path.join(OUT, name + '.png'), r.buf);
        console.log(`  ✓ ${name}.png  (${model}, ${(r.buf.length / 1024).toFixed(0)} KB)`);
        return true;
      }
      if (r.hardBlock) { hardBlocked = true; blockMsg = r.msg; return false; }
      if (r.retryMs && attempt === 0) { await sleep(r.retryMs); continue; }
      break; // non-retryable for this model → try the next model in the cascade
    }
  }
  return false;
}

console.log(`Backdrops → ${OUT}`);
if (!KEY && !process.env.NO_GEMINI) console.log('! GEMINI_API_KEY not set — using the procedural generator.');
console.log(`Targets: ${names.join(', ')}\n`);

const fellBack = [];
for (const name of names) {
  if (!BRIEFS[name]) { console.log(`  ! no brief for ${name} — procedural`); fellBack.push(name); continue; }
  let ok = false;
  if (KEY && !process.env.NO_GEMINI && !hardBlocked) ok = await tryGemini(name);
  if (!ok) fellBack.push(name);
}

if (fellBack.length) {
  if (hardBlocked) {
    console.log(`\n⚠  Gemini image models are blocked on this key (free tier / no billing):`);
    console.log(`   ${blockMsg}`);
    console.log(`   → Enable billing on the key's Google Cloud project to get real AI images.`);
  }
  console.log(`\nRendering ${fellBack.length} backdrop(s) procedurally (on-brand fallback)…`);
  await renderProcedural(fellBack, OUT);
}

const viaAI = names.length - fellBack.length;
console.log(`\nDone — ${names.length} backdrop(s): ${viaAI} via Gemini, ${fellBack.length} procedural.`);
process.exit(0);
