// Eduflick AI — logo-motion video exporter (all concept variants)
// Renders each design-system/collateral/logo-motion*.html frame-by-frame in
// real Chromium (seeking the page's Web-Animations timeline deterministically
// via its window.__seek contract), synthesizes the page's declared soundtrack
// (window.__SFX → sfx-synth.mjs → WAV), and encodes a 9:16 H.264+AAC MP4.
//
//   cd tools
//   npm run export:motion                    # → all variants
//   node export-logo-motion.mjs orbit glitch # → just those variants
//   FPS=60 SCALE=1 CRF=16 …                  # knobs, per run
//   SFX=0 npm run export:motion              # silent (skip audio synth+mux)
//   KEEP_FRAMES=1 npm run export:motion      # keep frames-*/ dirs + WAVs
//   FFMPEG=/path/to/ffmpeg npm run export:motion
//
// Page contract (each variant is self-contained, same idiom as
// export-stories.mjs): [data-export="logo-motion"] stage, file:// + ?export=1,
// window.__TOTAL_MS, window.__seek(t), optional window.__SFX cue list.

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { renderSfx } from './sfx-synth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COLLATERAL = path.resolve(__dirname, '../design-system/collateral');
const OUT = path.resolve(__dirname, '../exports/motion');

// variant → html file + output basenames ("classic" keeps the original names).
// archived: true → excluded from default (no-arg) runs, still renderable by
// name; its outputs land in exports/motion/archive/. Curation of 2026-07-16.
const VARIANTS = {
  classic:   { html: 'logo-motion.html',           base: 'eduflick-logo-motion' },
  orbit:     { html: 'logo-motion-orbit.html',     base: 'eduflick-logo-motion-orbit' },
  glitch:    { html: 'logo-motion-glitch.html',    base: 'eduflick-logo-motion-glitch' },
  ink:       { html: 'logo-motion-ink.html',       base: 'eduflick-logo-motion-ink' },
  stamp:     { html: 'logo-motion-stamp.html',     base: 'eduflick-logo-motion-stamp' },
  // 16:9 landscape twin of stamp — same animation & soundtrack, 1920×1080 stage
  'stamp-wide': { html: 'logo-motion-stamp-wide.html', base: 'eduflick-logo-motion-stamp', ratio: '16x9', w: 1920, h: 1080 },
  blueprint: { html: 'logo-motion-blueprint.html', base: 'eduflick-logo-motion-blueprint', archived: true },
  pixels:    { html: 'logo-motion-pixels.html',    base: 'eduflick-logo-motion-pixels',    archived: true },
  swipe:     { html: 'logo-motion-swipe.html',     base: 'eduflick-logo-motion-swipe',     archived: true },
  iris:      { html: 'logo-motion-iris.html',      base: 'eduflick-logo-motion-iris',      archived: true },
};

const FPS    = Number(process.env.FPS || 30);
const SCALE  = Number(process.env.SCALE || 2);
const CRF    = Number(process.env.CRF || 18);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const WANT_SFX = process.env.SFX !== '0';

const picked = process.argv.slice(2);
for (const p of picked) if (!VARIANTS[p]) {
  console.error(`✗ Unknown variant "${p}". Known: ${Object.keys(VARIANTS).join(', ')}`);
  process.exit(1);
}
const names = picked.length ? picked : Object.keys(VARIANTS).filter((n) => !VARIANTS[n].archived);

const sha1 = (p) => createHash('sha1').update(fs.readFileSync(p)).digest('hex');
const frameName = (i) => `frame-${String(i).padStart(4, '0')}.png`;

const ff = (args, label) => {
  const r = spawnSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'inherit'], cwd: OUT });
  if (r.error?.code === 'ENOENT') {
    console.error('✗ ffmpeg not found — brew install ffmpeg (or set FFMPEG=/path/to/ffmpeg)');
    process.exit(1);
  }
  if (r.status !== 0) throw new Error(`ffmpeg failed (${label})`);
};

fs.mkdirSync(OUT, { recursive: true });

// Software rasterization: the hardware GPU process on this host wedges
// captureScreenshot intermittently (mid-run, unrecoverable even across some
// relaunches). SwiftShader renders the same Skia paths pixel-equivalently,
// slower but immune — reliability wins for a headless frame pipeline.
const LAUNCH = { args: ['--disable-gpu'] };

let browser;
try { browser = await chromium.launch(LAUNCH); }
catch (err) {
  console.error('✗ Failed to launch Chromium. Run: cd tools && npm install && npx playwright install chromium');
  console.error(`  Error: ${err.message}`); process.exit(1);
}

// Full browser relaunch — kept as the recovery ladder's last rung even with
// software raster (a renderer can still die for other reasons).
const relaunchBrowser = async () => {
  await browser.close().catch(() => {});
  browser = await chromium.launch(LAUNCH);
};

async function exportVariant(name) {
  const v = VARIANTS[name];
  const HTML = path.join(COLLATERAL, v.html);
  const FRAMES = path.join(OUT, `frames-${name}`);
  const DEST = v.archived ? 'archive/' : '';           // relative to OUT (ffmpeg cwd)
  if (v.archived) fs.mkdirSync(path.join(OUT, 'archive'), { recursive: true });
  const W = v.w || 1080, H = v.h || 1920;              // output pixels (stage CSS px)
  const RATIO = v.ratio || '9x16';
  const MP4 = `${DEST}${v.base}-${RATIO}.mp4`;
  const COVER = `${DEST}${v.base}${v.ratio ? '-' + v.ratio : ''}-cover.png`;
  const WAV = `sfx-${name}.wav`;

  if (!fs.existsSync(HTML)) throw new Error(`motion file not found: ${HTML}`);

  // Pre-export gate: never render unresolved [[placeholders]] into a deliverable.
  const phHits = fs.readFileSync(HTML, 'utf8').split('\n')
    .flatMap((line, i) => (/\[\[/.test(line) ? [`  ${v.html}:${i + 1}  ${line.trim().slice(0, 140)}`] : []));
  if (phHits.length) {
    for (const h of phHits) console.error(h);
    throw new Error('unresolved [[placeholders]]');
  }

  // Clean frame dir — stale frames from a previous longer run would be swept
  // into the %04d sequence and append a ghost tail to the video.
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  // Page factory — also used to RECYCLE a wedged page mid-capture: Chromium's
  // captureScreenshot occasionally stalls permanently (renderer wedge); a new
  // page = a fresh renderer process, and deterministic seeks make redoing the
  // same frame lossless.
  const openPage = async () => {
    const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
    await p.goto('file://' + encodeURI(HTML) + '?export=1', { waitUntil: 'load', timeout: 30000 });
    // Force the Manrope fetch and fail loudly if it didn't arrive — a flaky
    // Google Fonts request must not silently render fallback letterforms.
    await p.evaluate(async () => {
      await document.fonts.load("800 32px 'Manrope'");
      await document.fonts.ready;
    });
    if (!(await p.evaluate(() => document.fonts.check("800 32px 'Manrope'"))))
      throw new Error('Manrope did not load (Google Fonts unreachable?) — refusing to render fallback type');
    await p.waitForTimeout(500);
    const el = await p.$('[data-export="logo-motion"]');
    if (!el) throw new Error(`no [data-export="logo-motion"] stage in ${v.html}`);
    const clip = await el.boundingBox();
    if (!clip) throw new Error('stage has no bounding box');
    return { p, clip };
  };

  let page = null, totalMs, sfx, N;
  try {
    let { p, clip } = await openPage();
    page = p;

    totalMs = await page.evaluate(() => window.__TOTAL_MS);
    if (!totalMs) throw new Error(`${v.html} does not expose window.__TOTAL_MS`);
    sfx = await page.evaluate(() => window.__SFX || null);
    N = Math.round((totalMs / 1000) * FPS);

    console.log(`  capturing ${N} frames (${totalMs}ms @ ${FPS}fps)…`);
    // Clip-based page screenshots (export-images.mjs idiom), NOT el.screenshot():
    // the element path waits for "stability" via rAF sampling, which starves in
    // a fully paused page (all animations paused → compositor goes idle) and
    // times out. A clip screenshot has no actionability wait. And still no
    // `animations` option — the default 'allow' keeps the seeked state.
    let recycles = 0;
    for (let i = 0; i < N; i++) {
      await page.evaluate((t) => window.__seek(t), (i * 1000) / FPS);
      try {
        await page.screenshot({ path: path.join(FRAMES, frameName(i)), clip, timeout: 15000 });
      } catch {
        // One in-page retry, then recycle the page (fresh renderer) and redo
        // this frame. Give up after 3 recycles.
        try {
          await page.evaluate((t) => window.__seek(t), (i * 1000) / FPS);
          await page.screenshot({ path: path.join(FRAMES, frameName(i)), clip, timeout: 15000 });
        } catch (err) {
          if (recycles >= 3) throw err;
          recycles++;
          console.log(`    frame ${i}: renderer wedged — relaunching browser (${recycles}/3)`);
          page = null;                       // dies with the browser
          await relaunchBrowser();
          ({ p, clip } = await openPage());
          page = p;
          i--; continue;
        }
      }
      if (i && i % 60 === 0) console.log(`    frame ${i}/${N}`);
    }

    // Self-check 1 — liveness: a mid-animation frame must differ from frame 0.
    const mid = Math.min(Math.round(1.5 * FPS), N - 1);
    if (sha1(path.join(FRAMES, frameName(0))) === sha1(path.join(FRAMES, frameName(mid))))
      throw new Error(`frames 0 and ${mid} identical — seek is not driving the animations`);
    // Self-check 2 — static hold: every frame in the last 800ms must be
    // pixel-identical (all motion ends ≤ totalMs-800 by design).
    const holdStart = Math.max(0, N - Math.round(0.8 * FPS));
    const holdHash = sha1(path.join(FRAMES, frameName(holdStart)));
    for (let i = holdStart + 1; i < N; i++)
      if (sha1(path.join(FRAMES, frameName(i))) !== holdHash)
        throw new Error(`frame ${i} differs inside the final hold (${holdStart}–${N - 1}) — motion past the hold boundary`);
    console.log(`  self-checks ✓  (liveness f0≠f${mid} · hold f${holdStart}–f${N - 1} identical)`);
  } finally { if (page) await page.close().catch(() => {}); }

  // Soundtrack: synthesize the page's declared cue list into a WAV.
  const withAudio = WANT_SFX && sfx;
  if (withAudio) {
    renderSfx(sfx, totalMs, path.join(OUT, WAV));
    console.log(`  sfx ✓  (${(sfx.cues?.length ?? 0)} cues${sfx.bed ? ` + ${sfx.bed.type} bed` : ''})`);
  }

  // Encode. One scale filter does the lanczos downscale AND the RGB→YUV bt709
  // conversion (swscale's bt601 default would desaturate the indigo on
  // phones); setparams stamps the VUI so players see bt709, not "unknown".
  ff([
    '-y', '-framerate', String(FPS), '-start_number', '0', '-i', `frames-${name}/frame-%04d.png`,
    ...(withAudio ? ['-i', WAV] : []),
    '-vf', `scale=${W}:${H}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p,`
         + 'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    ...(withAudio ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-movflags', '+faststart', MP4,
  ], `${name} mp4`);

  // Cover = the held final frame, from the lossless source PNG (not the MP4).
  ff(['-y', '-i', `frames-${name}/${frameName(N - 1)}`, '-vf', `scale=${W}:${H}:flags=lanczos`,
    '-update', '1', '-frames:v', '1', COVER], `${name} cover`);

  if (!process.env.KEEP_FRAMES) {
    fs.rmSync(FRAMES, { recursive: true, force: true });
    if (withAudio) fs.rmSync(path.join(OUT, WAV), { force: true });
  }

  const size = (fs.statSync(path.join(OUT, MP4)).size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ ${MP4} (${size} MB, ${N}f @ ${FPS}fps${withAudio ? ', AAC sfx' : ', silent'}) + ${COVER}\n`);
}

console.log(`Exporting ${names.length} variant(s): ${names.join(', ')}  →  ${OUT}\n`);
const failed = [];
for (const name of names) {
  console.log(`▸ ${name}`);
  try { await exportVariant(name); }
  catch (err) { console.error(`  ✗ ${name} failed: ${err.message}\n`); failed.push(name); }
}
await browser.close();

if (failed.length) { console.error(`✗ Failed: ${failed.join(', ')}`); process.exit(1); }
console.log(`Done — ${names.length} video(s) in ${OUT}`);
