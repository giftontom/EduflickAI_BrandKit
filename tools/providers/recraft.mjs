// Recraft image provider — paid, palette-lockable, brand-style-aware, native vector.
// Docs: https://www.recraft.ai/docs   Base: https://external.api.recraft.ai/v1
//
// Phase 0 (validated live 2026-06-18): stock styles always inject a SUBJECT, so flat
// abstract backdrops need a custom brand RECRAFT_STYLE_ID trained on our own flat
// backdrops (see recraft-create-style.mjs). Palette is pinned via `controls` regardless.
//
// Contract:  generate({ preamble, palette, brief, negative, name }, { aspect, size }) ->
//   { ok:true, buf, via } | { hardBlock:true, msg } | { err }
//   (Recraft reads brief + negative; palette comes from `controls`, not the prompt.)
//
// Reads RECRAFT_API_KEY (required), and optional RECRAFT_STYLE_ID / RECRAFT_STYLE /
// RECRAFT_MODEL / RECRAFT_SIZE from the environment.

const KEY      = process.env.RECRAFT_API_KEY;
const BASE     = 'https://external.api.recraft.ai/v1';
const MODEL    = process.env.RECRAFT_MODEL || 'recraftv3';
const STYLE_ID = process.env.RECRAFT_STYLE_ID || '';
const STYLE    = process.env.RECRAFT_STYLE || 'digital_illustration';

// Eduflick indigo brand palette (token literals) → Recraft `controls`. Confirmed valid live.
const COLORS = [{ rgb: [91, 91, 240] }, { rgb: [139, 151, 255] }];   // indigo #5B5BF0, light-indigo #8B97FF
const BG     = { rgb: [11, 8, 34] };                                  // indigo-ink #0B0822

// recraftv3 raster sizes (closest to each aspect we use). 4:5 ≈ 1024x1280.
const SIZE_BY_ASPECT = {
  '4:5': '1024x1280', '3:4': '1024x1365', '1:1': '1024x1024',
  '9:16': '1024x1820', '16:9': '1820x1024',
};

// Recraft caps the prompt at 1000 chars, so it gets a COMPACT lead (palette handled by
// `controls`, negatives by `negative_prompt`) + the per-poster brief — not the full kit.
// NOTE: this lead mirrors gen-backdrops.mjs PREAMBLE (the canonical brand voice) — edit both
// together so Recraft and Gemini backdrops speak the same brand language.
const RECRAFT_LEAD = `Abstract generative brand background texture, deep indigo monochrome — premium, minimal, editorial, an engineer's calm, lots of empty negative space. Volumetric indigo light in dark space, fine grain, faint dot-grid and topographic contour lines, soft intersecting geometric planes. A background texture, NOT a scene, no subject.`;
const MAX_PROMPT = 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default {
  name: 'recraft',
  available: () => Boolean(KEY),
  async generate({ brief, negative }, { aspect, size } = {}) {
    const sz = size || process.env.RECRAFT_SIZE
      || SIZE_BY_ASPECT[aspect || process.env.ASPECT || '4:5'] || '1024x1280';
    const prompt = [RECRAFT_LEAD, brief].filter(Boolean).join('\n\n').slice(0, MAX_PROMPT);
    const body = {
      model: MODEL,
      prompt,                           // compact lead + brief (palette comes from `controls`)
      negative_prompt: negative || '',          // the brand NEGATIVE block is short and fixed
      size: sz,
      response_format: 'b64_json',
      controls: { colors: COLORS, background_color: BG, artistic_level: 1, no_text: true },
    };
    if (STYLE_ID) body.style_id = STYLE_ID; else body.style = STYLE;   // style_id replaces style
    let lastErr = 'recraft: no response';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${BASE}/images/generations`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const txt = await res.text();
        if (res.ok) {
          const b64 = JSON.parse(txt)?.data?.[0]?.b64_json;
          if (!b64) return { err: 'no image in response' };
          return { ok: true, buf: Buffer.from(b64, 'base64'), via: STYLE_ID ? `${MODEL}/style_id` : `${MODEL}/${STYLE}` };
        }
        const msg = txt.replace(/\s+/g, ' ').slice(0, 240);
        // out of credits / billing → stop hammering (treat like a hard block)
        if (res.status === 402 || /insufficient.*credit|not enough credit|payment required/i.test(txt))
          return { hardBlock: true, msg };
        lastErr = `HTTP ${res.status}: ${msg}`;
        if (res.status === 429 && attempt === 0) { await sleep(2000); continue; }   // one backoff, then give up
        break;
      } catch (e) {
        lastErr = e.message;
        break;
      }
    }
    return { err: lastErr };
  },
};
