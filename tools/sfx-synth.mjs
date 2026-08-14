// Eduflick AI — procedural SFX synthesizer for the logo-motion videos.
// Renders a stereo 48kHz/16-bit WAV from a cue list declared by each
// logo-motion-*.html surface as `window.__SFX` — no samples, every sound is
// computed (noise + oscillators + biquad filters), fully deterministic
// (seeded LCG, no Math.random) so the same page always produces the same
// soundtrack. Consumed by export-logo-motion.mjs, which muxes the WAV into
// the MP4 during the main encode.
//
// Cue schema (times in ms on the SAME timeline as the animation):
//   window.__SFX = {
//     bed:  { type:'drone'|'hum', gain },                 // full-length ambient
//     cues: [{ t, type, dur?, gain?, freq?, f0?, f1?,     // one-shot events
//              panFrom?, panTo?, pan?, notes?, step? }]
//   }
// Types: whoosh riser impact slice bloom tick typetick chime glitch arp scratch
//
// Tonal system: everything is rooted on A (sub 55Hz, A-major bloom pad,
// A5 chime partials) so all five variants sound like one family.

import fs from 'node:fs';

const SR = 48000;
const TAU = Math.PI * 2;

// RBJ biquad — enough filter for whooshes, scratches and glitch bursts.
class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(type, f, Q = 0.9) {
    const w = TAU * Math.min(Math.max(f, 20), SR * 0.45) / SR;
    const c = Math.cos(w), s = Math.sin(w), al = s / (2 * Q);
    let b0, b1, b2;
    if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } // lp
    const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export function renderSfx(spec, durationMs, outPath) {
  const N = Math.round(SR * durationMs / 1000);
  const L = new Float64Array(N), R = new Float64Array(N);

  let seed = 0x5b5bf0; // brand indigo, naturally
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

  // equal-power pan: p ∈ [-1..1] → [gL, gR]
  const pan = (p) => { const a = (p + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };
  // write one sample at absolute index i
  const put = (i, v, gL, gR) => { if (i >= 0 && i < N) { L[i] += v * gL; R[i] += v * gR; } };
  const ms = (t) => Math.round(SR * t / 1000);

  const GEN = {
    // filtered-noise sweep, pans across the field — the flick gesture
    whoosh(c) {
      const n = ms(c.dur ?? 600), o = ms(c.t), g = c.gain ?? 0.4;
      const f0 = c.f0 ?? 300, f1 = c.f1 ?? 2400, bq = new Biquad();
      for (let i = 0; i < n; i++) {
        const u = i / n;
        if (i % 64 === 0) bq.set('bp', f0 + (f1 - f0) * u, 1.1);
        const env = Math.sin(Math.PI * Math.pow(u, 0.8)) ** 1.5;
        const p = (c.panFrom ?? -0.8) + ((c.panTo ?? 0.8) - (c.panFrom ?? -0.8)) * u;
        const [gl, gr] = pan(p);
        put(o + i, bq.run(rand()) * env * g * 2.2, gl, gr);
      }
    },
    // rising tension: noise sweeping up + sine climbing an octave+
    riser(c) {
      const n = ms(c.dur ?? 1500), o = ms(c.t), g = c.gain ?? 0.3;
      const bq = new Biquad(); let ph = 0;
      const f0 = c.f0 ?? 70, f1 = c.f1 ?? 260;
      for (let i = 0; i < n; i++) {
        const u = i / n, env = Math.pow(u, 2.2);
        if (i % 64 === 0) bq.set('bp', 400 + 2800 * u * u, 1.4);
        ph += TAU * (f0 + (f1 - f0) * u) / SR;
        const v = bq.run(rand()) * 0.8 + Math.sin(ph) * 0.5;
        put(o + i, v * env * g, 0.7, 0.7);
      }
    },
    // sub thud + click transient — the landing
    impact(c) {
      const o = ms(c.t), g = c.gain ?? 0.6, f = c.freq ?? 55;
      const n = ms(900); let ph = 0;
      for (let i = 0; i < n; i++) {
        const u = i / n;
        const fr = f * (1 + 1.6 * Math.exp(-u * 26));       // fast pitch drop into the sub
        ph += TAU * fr / SR;
        const env = Math.exp(-u * 6.5);
        put(o + i, Math.sin(ph) * env * g, 0.72, 0.72);
      }
      const nc = ms(10);                                     // click
      for (let i = 0; i < nc; i++) put(o + i, rand() * (1 - i / nc) * g * 0.5, 0.7, 0.7);
      const nt = ms(130); const lp = new Biquad().set('lp', 240, 0.8); // body thump
      for (let i = 0; i < nt; i++) put(o + i, lp.run(rand()) * Math.exp(-i / nt * 5) * g * 0.9, 0.7, 0.7);
    },
    // metallic zing: falling sine + bright noise burst — the carve/cut
    slice(c) {
      const o = ms(c.t), g = c.gain ?? 0.45;
      const n = ms(420); let ph = 0;
      const hp = new Biquad().set('hp', 3200, 1.2);
      for (let i = 0; i < n; i++) {
        const u = i / n;
        ph += TAU * (3200 - 2400 * Math.min(u * 2.4, 1)) / SR;
        const zing = Math.sin(ph) * Math.exp(-u * 9);
        const air = i < ms(70) ? hp.run(rand()) * Math.exp(-u * 22) * 0.9 : 0;
        put(o + i, (zing * 0.7 + air) * g, 0.62, 0.82);      // biased right — the notch side
      }
    },
    // soft A-major pad swell — the halo bloom
    bloom(c) {
      const n = ms(c.dur ?? 1400), o = ms(c.t), g = (c.gain ?? 0.3) * 0.24;
      const freqs = [220, 277.18, 329.63, 440];
      freqs.forEach((f, k) => {
        let ph = rand() * TAU;
        const det = 1 + (k - 1.5) * 0.0022, [gl, gr] = pan((k - 1.5) * 0.4);
        for (let i = 0; i < n; i++) {
          const u = i / n;
          const env = Math.pow(Math.min(u / 0.38, 1), 1.6) * Math.pow(Math.max(1 - (u - 0.38) / 0.62, 0), 1.3);
          ph += TAU * f * det / SR;
          put(o + i, Math.sin(ph) * env * g, gl, gr);
        }
      });
    },
    // tiny blip — letter staggers, UI ticks
    tick(c) {
      const o = ms(c.t), g = c.gain ?? 0.12, f = c.freq ?? 2100, n = ms(26);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        ph += TAU * f / SR;
        put(o + i, Math.sin(ph) * Math.exp(-i / n * 7) * g, 0.6, 0.6);
      }
    },
    // mechanical key: blip + low thock — the typewriter
    typetick(c) {
      GEN.tick({ t: c.t, gain: (c.gain ?? 0.12) * 0.8, freq: c.freq ?? 1350 });
      const o = ms(c.t), n = ms(34), lp = new Biquad().set('lp', 500, 0.8), g = c.gain ?? 0.12;
      for (let i = 0; i < n; i++) put(o + i, lp.run(rand()) * Math.exp(-i / n * 6) * g * 0.8, 0.62, 0.62);
    },
    // harmonic bell on A5 — the AI light-up
    chime(c) {
      const o = ms(c.t), g = (c.gain ?? 0.35) * 0.3;
      const parts = [[880, 1], [1318.5, 0.55], [1760, 0.4], [2637, 0.18]];
      const det = c.detune ?? 0;
      parts.forEach(([f, a], k) => {
        let ph = 0; const n = ms(1300), [gl, gr] = pan((k % 2 ? 1 : -1) * 0.25);
        for (let i = 0; i < n; i++) {
          ph += TAU * f * (1 + det * (k + 1) * 0.001) / SR;
          put(o + i, Math.sin(ph) * Math.exp(-i / n * 5) * a * g, gl, gr);
        }
      });
    },
    // stuttered digital noise — glitch bursts
    glitch(c) {
      const n = ms(c.dur ?? 160), o = ms(c.t), g = c.gain ?? 0.3;
      const bq = new Biquad(); let gate = 1, hold = 0, fc = 1200;
      for (let i = 0; i < n; i++) {
        if (--hold <= 0) {                                   // re-gate every 3–9ms
          hold = ms(3 + Math.abs(rand()) * 6);
          gate = Math.abs(rand()) > 0.35 ? 1 : 0;
          fc = 500 + Math.abs(rand()) * 3600;
          bq.set('bp', fc, 2.2);
        }
        const p = rand() * 0.7, [gl, gr] = pan(p);
        put(o + i, bq.run(rand()) * gate * (1 - i / n * 0.4) * g * 2.4, gl, gr);
      }
    },
    // sequence of pitched blips — data assembly
    arp(c) {
      (c.notes ?? []).forEach((f, k) => GEN.tick({
        t: c.t + k * (c.step ?? 80),
        freq: f,
        gain: (c.gain ?? 0.1) * (1 - k / (c.notes.length * 2.2)),
      }));
    },
    // pencil-on-paper: wobbling band-passed noise — the blueprint trace
    scratch(c) {
      const n = ms(c.dur ?? 450), o = ms(c.t), g = c.gain ?? 0.16;
      const bq = new Biquad().set('bp', 1900, 1.6);
      const [gl, gr] = pan(c.pan ?? 0);
      for (let i = 0; i < n; i++) {
        const u = i / n;
        const wob = 0.55 + 0.45 * Math.sin(TAU * 14 * u + Math.sin(TAU * 3.1 * u) * 2);
        const env = Math.sin(Math.PI * u) ** 0.7;
        put(o + i, bq.run(rand()) * wob * env * g * 2.0, gl, gr);
      }
    },
  };

  const BED = {
    // sub root + fifth with slow beat, plus low airy noise
    drone(b) {
      const g = (b.gain ?? 0.1) * 0.6, n = N;
      let p1 = 0, p2 = 0;
      const lp = new Biquad().set('lp', 380, 0.7);
      for (let i = 0; i < n; i++) {
        const u = i / n;
        const env = Math.min(u / 0.12, 1) * Math.min(Math.max((0.95 - u) / 0.14, 0), 1);
        p1 += TAU * 55 / SR; p2 += TAU * 82.41 * 1.0015 / SR;
        const v = Math.sin(p1) * 0.6 + Math.sin(p2) * 0.25 + lp.run(rand()) * 0.35;
        put(i, v * env * g, 0.7, 0.7);
      }
    },
    // electric mains-flavored hum for the glitch concept
    hum(b) {
      const g = (b.gain ?? 0.1) * 0.5, n = N;
      let p1 = 0, p2 = 0, p3 = 0;
      const lp = new Biquad().set('lp', 300, 0.7);
      for (let i = 0; i < n; i++) {
        const u = i / n;
        const env = Math.min(u / 0.1, 1) * Math.min(Math.max((0.95 - u) / 0.14, 0), 1);
        const flick = 0.85 + 0.15 * Math.sin(TAU * 8.3 * u * durationMs / 1000);
        p1 += TAU * 55 / SR; p2 += TAU * 110 / SR; p3 += TAU * 165 / SR;
        const v = (Math.sin(p1) * 0.5 + Math.sin(p2) * 0.3 + Math.sin(p3) * 0.12) * flick + lp.run(rand()) * 0.2;
        put(i, v * env * g, 0.7, 0.7);
      }
    },
  };

  if (spec.bed && BED[spec.bed.type]) BED[spec.bed.type](spec.bed);
  for (const cue of spec.cues ?? []) {
    if (GEN[cue.type]) GEN[cue.type](cue);
    else console.warn(`  sfx: unknown cue type "${cue.type}" ignored`);
  }

  // master: normalize → gentle tanh limit → edge fades (10ms in / 250ms out)
  let peak = 1e-9;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = Math.min(0.95 / peak, 3);
  const fi = ms(10), fo = ms(250);
  for (let i = 0; i < N; i++) {
    let e = 1;
    if (i < fi) e = i / fi;
    if (i > N - fo) e = Math.min(e, (N - i) / fo);
    L[i] = Math.tanh(L[i] * norm * 1.1) * 0.92 * e;
    R[i] = Math.tanh(R[i] * norm * 1.1) * 0.92 * e;
  }

  // 16-bit stereo PCM WAV
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(outPath, buf);
  return outPath;
}
