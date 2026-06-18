// Gemini / Imagen image provider — the original gen-backdrops cascade, extracted verbatim.
// Runs a CASCADE of image models (first that works wins), backs off once on a transient
// 429, and reports a hard free-tier block so the orchestrator can stop and fall back.
//
// Contract:  generate({ preamble, palette, brief, negative, name }, { aspect }) ->
//   { ok:true, buf, via } | { hardBlock:true, msg } | { err }
//   (the internal 429 backoff `retryMs` is consumed inside callModel — never surfaced).
//
// Reads GEMINI_API_KEY (and optional MODEL to pin one model) from the environment.

const KEY = process.env.GEMINI_API_KEY;

// generateContent image models first, then imagen predict models as a last resort
const DEFAULT_CASCADE = ['gemini-3-pro-image', 'gemini-2.5-flash-image', 'gemini-3.1-flash-image',
  'imagen-4.0-fast-generate-001', 'imagen-4.0-generate-001'];
const CASCADE = process.env.MODEL ? [process.env.MODEL] : DEFAULT_CASCADE;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const isImagen = (m) => m.startsWith('imagen');

// Returns {ok:true, buf} | {hardBlock:true, msg} | {retryMs} | {err}
async function callModel(model, prompt, aspect) {
  try {
    let url, body;
    if (isImagen(model)) {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${KEY}`;
      body = { instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '3:4' } };
    } else {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
      body = { contents: [{ role: 'user', parts: [{ text: prompt }] }],
               generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } } };
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

export default {
  name: 'gemini',
  available: () => Boolean(KEY) && !process.env.NO_GEMINI,
  async generate({ preamble, palette, brief, negative }, { aspect } = {}) {
    const prompt = [preamble, palette, brief || '', negative].join('\n\n');   // same combined prompt as the original
    const asp = aspect || process.env.ASPECT || '4:5';
    for (const model of CASCADE) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const r = await callModel(model, prompt, asp);
        if (r.ok) return { ok: true, buf: r.buf, via: model };
        if (r.hardBlock) return r;                          // stop the whole cascade
        if (r.retryMs && attempt === 0) { await sleep(r.retryMs); continue; }
        break;                                              // non-retryable → try the next model
      }
    }
    return { err: 'all Gemini models failed' };
  },
};
