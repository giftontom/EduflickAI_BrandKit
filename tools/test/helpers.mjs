// helpers.mjs — shared test harness for the studio API suite.
//
// Spawns tools/studio-server.mjs as a child on STUDIO_PORT=8099, polls
// GET /api/manifest until it answers, and exposes a fetch wrapper that defaults
// a same-origin Origin + Host (http://127.0.0.1:8099) so ordinary requests pass
// the DNS-rebinding + CSRF guards.
//
// CONTENT SANDBOXING (the reason this file exists in its current form): the
// studio reads + writes all content-studio data from CONTENT_DIR, which defaults
// to <repo>/content-studio but is overridden by STUDIO_CONTENT_DIR. The user runs
// a LIVE studio on :8090 editing those real files, so the suite must NEVER touch
// them. makeContentSandbox() copies content-studio/ into a unique throwaway dir
// under os.tmpdir(); startServer({ contentDir }) points the child's
// STUDIO_CONTENT_DIR at it; every WRITE test reads/writes/asserts against the
// SANDBOX paths and rmSync's the sandbox in after(). The old byte-exact
// snapshot/restore of the REAL content-studio files is therefore gone for those
// files — there is nothing to restore because nothing real was ever written.
// (snapshot()/restoreSnapshot() remain ONLY for the design-system EDITMODE
// surface, which is a real-repo file and not content-studio.)
//
// Pure node:* — no npm packages (G1). Playwright is used only by smoke.mjs.
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Each test FILE gets its own port so node:test (which runs files concurrently)
// never collides on a single 8099 bind. Pass a port to the harness factory;
// defaults to 8099 for the main file.
let PORT = Number(process.env.STUDIO_TEST_PORT || 8099);
export function setPort(p) {
  PORT = Number(p);
}
export const getPort = () => PORT;
export const originFor = () => `http://127.0.0.1:${PORT}`;

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TOOLS = path.resolve(HERE, '..');
export const ROOT = path.resolve(TOOLS, '..');
const NODE = process.execPath; // the exact node running the suite (avoids nvm shims)

// The REAL-repo write surface that is NOT content-studio (so it is NOT
// sandboxable via STUDIO_CONTENT_DIR): the launch-grid carousel HTML the
// /api/launch-grid/slides path writes (it lives under design-system/), plus the
// gitignored action-state file the action-runner test mutates. These are
// snapshotted in before() and restored in after() because they are written to the
// real repo. Every content-studio path (status.json, FACTS.md, design-comments.json,
// DESIGN_FEEDBACK.md, launch-grid.json, drafts/, prompts/) is sandboxed instead —
// see makeContentSandbox() — and is no longer listed here.
export const WRITE_SURFACE = [
  'design-system/collateral/launch-grid.html',
  'tools/.studio-state.json',
];

// ---- content sandbox (the studio's STUDIO_CONTENT_DIR target) --------------

// The real content-studio/ dir, copied FROM (never written TO) by makeContentSandbox().
const REAL_CONTENT_DIR = path.join(ROOT, 'content-studio');

// Copy content-studio/ into a unique throwaway dir under os.tmpdir() and return
// its absolute path. The studio is then spawned with STUDIO_CONTENT_DIR=<this>,
// so EVERY read/write/regenerate of content-studio data hits the copy, never the
// user's live files. Each call makes a fresh, uniquely named dir, so concurrent
// test files (each calling this in their own before()) get fully disjoint
// sandboxes and never share status.json / design-comments.json — which is what
// retires the old cross-file advisory lockfiles.
export function makeContentSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-content-'));
  // recursive copy of the whole tree (prompts/, drafts/, all the *.md + *.json).
  fs.cpSync(REAL_CONTENT_DIR, dir, { recursive: true });
  return dir;
}

// Tear a sandbox down. Idempotent + force so a half-built or already-gone dir
// never throws in an after().
export function removeContentSandbox(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* already gone */
  }
}

// ---- same-origin fetch ----------------------------------------------------

// Default a same-origin Origin so non-GET /api calls pass the CSRF guard.
// (Node's fetch always sends the real loopback authority as Host, so a Host
// default is unnecessary here — and a forged Host needs rawRequest() below,
// since undici silently drops a user-supplied Host header.)
export async function api(pathname, opts = {}) {
  const headers = { Origin: originFor(), ...(opts.headers || {}) };
  // Allow a test to DROP a default header by passing it as undefined.
  for (const k of Object.keys(headers)) if (headers[k] === undefined) delete headers[k];
  const init = { ...opts, headers };
  if (init.json !== undefined) {
    init.method = init.method || 'POST';
    init.body = JSON.stringify(init.json);
    headers['Content-Type'] = 'application/json';
    delete init.json;
  }
  return fetch(`${originFor()}${pathname}`, init);
}

// Forge an arbitrary Host header. Node's fetch/undici overrides Host with the
// real authority, so the DNS-rebinding guard can only be exercised over a raw
// socket. Returns {statusLine, status, body}.
export function rawRequest({ method = 'GET', pathname = '/', host, headers = {}, body = '' } = {}) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(PORT, '127.0.0.1', () => {
      const lines = [`${method} ${pathname} HTTP/1.1`, `Host: ${host}`];
      for (const [k, v] of Object.entries(headers)) lines.push(`${k}: ${v}`);
      if (body) lines.push(`Content-Length: ${Buffer.byteLength(body)}`);
      lines.push('Connection: close', '', body);
      sock.write(lines.join('\r\n'));
    });
    let buf = '';
    sock.setTimeout(5000, () => {
      sock.destroy();
      reject(new Error('rawRequest timeout'));
    });
    sock.on('data', (d) => (buf += d.toString('utf8')));
    sock.on('error', reject);
    sock.on('end', () => {
      const statusLine = buf.split('\r\n')[0] || '';
      const status = Number((statusLine.match(/HTTP\/1\.1 (\d+)/) || [])[1]) || 0;
      const sep = buf.indexOf('\r\n\r\n');
      resolve({ statusLine, status, body: sep === -1 ? '' : buf.slice(sep + 4) });
    });
  });
}

// Convenience: api() + parse JSON, returning {status, body}.
export async function apiJSON(pathname, opts = {}) {
  const res = await api(pathname, opts);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body, res };
}

// ---- server lifecycle -----------------------------------------------------

let child = null;

// startServer({ contentDir }) — spawn the singleton server child. When contentDir
// is given it is passed as STUDIO_CONTENT_DIR so the child reads + writes ALL
// content-studio data from that (sandbox) dir instead of the real content-studio/.
// With no contentDir the child behaves byte-identically to the live :8090 server.
export async function startServer({ contentDir } = {}) {
  const env = { ...process.env, STUDIO_PORT: String(PORT), PORT: String(PORT) };
  if (contentDir) env.STUDIO_CONTENT_DIR = contentDir;
  child = spawn(NODE, ['studio-server.mjs'], {
    cwd: TOOLS,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.unref?.(); // don't keep the test process alive on its own
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  // Poll the manifest until the server is accepting requests (or time out).
  const deadline = Date.now() + 15000;
  for (;;) {
    if (child.exitCode != null) throw new Error(`server exited early (code ${child.exitCode})`);
    try {
      const res = await api('/api/manifest');
      if (res.status === 200) return child;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error('server did not become ready within 15s');
    await delay(150);
  }
}

export async function stopServer() {
  if (!child) return;
  const c = child;
  child = null;
  await new Promise((resolve) => {
    // Keep the SIGKILL fallback timer REFERENCED (no .unref()): the suite runs
    // files concurrently and each must fully reap its server before after()
    // resolves. An unref'd timer could be skipped if the runner goes idle first,
    // orphaning a child that then squats the test port and fails the next run.
    const hardKill = setTimeout(() => {
      if (c.exitCode == null) c.kill('SIGKILL');
    }, 3000);
    c.once('close', () => {
      clearTimeout(hardKill);
      resolve();
    });
    c.kill('SIGTERM');
  });
}

// Spawn an ISOLATED, one-off server child on its OWN port — independent of the
// startServer()/stopServer() singleton. Used by Contract B's self-heal test, which
// must boot a FRESH process AFTER writing garbage into DESIGN_FEEDBACK.md (the
// self-heal runs once, at boot). Polls that port's own manifest until ready, then
// returns a handle with stop() that SIGTERM/SIGKILLs only this child. The port
// must differ from the caller's singleton port so the binds never collide.
export async function spawnServerOnce(port, { contentDir } = {}) {
  const env = { ...process.env, STUDIO_PORT: String(port), PORT: String(port) };
  if (contentDir) env.STUDIO_CONTENT_DIR = contentDir;
  const c = spawn(NODE, ['studio-server.mjs'], {
    cwd: TOOLS,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  c.unref?.();
  c.stdout.on('data', () => {});
  c.stderr.on('data', () => {});
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  for (;;) {
    if (c.exitCode != null) throw new Error(`isolated server exited early (code ${c.exitCode})`);
    try {
      const res = await fetch(`${origin}/api/manifest`, { headers: { Origin: origin } });
      if (res.status === 200) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error('isolated server did not become ready within 15s');
    await delay(150);
  }
  return {
    child: c,
    async stop() {
      await new Promise((resolve) => {
        const hardKill = setTimeout(() => {
          if (c.exitCode == null) c.kill('SIGKILL');
        }, 3000);
        c.once('close', () => {
          clearTimeout(hardKill);
          resolve();
        });
        c.kill('SIGTERM');
      });
    },
  };
}

export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- snapshot / restore (byte-exact) --------------------------------------
//
// Now scoped to the NON-content-studio real-repo write surface only (WRITE_SURFACE
// above: the launch-grid carousel HTML + the gitignored action-state file).
// content-studio is sandboxed via makeContentSandbox()/STUDIO_CONTENT_DIR, so it
// has no entry here and is never snapshotted or restored.

// Snapshot the bytes of every write-surface file (null = file absent). Returned
// object is opaque; pass it back to restoreSnapshot().
export function snapshot() {
  const snap = {};
  for (const rel of WRITE_SURFACE) {
    const abs = path.join(ROOT, rel);
    try {
      snap[rel] = fs.readFileSync(abs);
    } catch {
      snap[rel] = null; // absent before the suite ran
    }
  }
  return snap;
}

// Restore each write-surface file to its snapshot bytes; delete files that did
// not exist at snapshot time but exist now (suite-created).
export function restoreSnapshot(snap) {
  for (const rel of WRITE_SURFACE) {
    const abs = path.join(ROOT, rel);
    const want = snap[rel];
    if (want == null) {
      try {
        fs.rmSync(abs, { force: true });
      } catch {
        /* nothing to remove */
      }
    } else {
      try {
        fs.writeFileSync(abs, want);
      } catch {
        /* leave as-is; the porcelain test will catch a real failure */
      }
    }
  }
}

// ---- editmode fixtures ----------------------------------------------------

export const DS_DIR = path.join(ROOT, 'design-system');

// A single design-system HTML file holding exactly ONE valid EDITMODE block.
export const FIXTURE_ONE = path.join(DS_DIR, '__studio_test_one__.html');
// A second file holding TWO blocks that both contain the same edit key.
export const FIXTURE_TWO = path.join(DS_DIR, '__studio_test_two__.html');
// A non-.html sibling (extension guard).
export const FIXTURE_TXT = path.join(DS_DIR, '__studio_test__.txt');

const BEGIN = '/*EDITMODE' + '-BEGIN*/';
const END = '/*EDITMODE' + '-END*/';

function block(obj) {
  return BEGIN + JSON.stringify(obj, null, 2) + END;
}

export function writeFixtures() {
  fs.writeFileSync(
    FIXTURE_ONE,
    `<!doctype html><html><body><h1>fixture</h1>\n<script>${block({ headline: 'before', sub: 'x' })}</script>\n</body></html>\n`,
  );
  fs.writeFileSync(
    FIXTURE_TWO,
    `<!doctype html><html><body>\n<script>${block({ shared: 'a' })}</script>\n<script>${block({ shared: 'b' })}</script>\n</body></html>\n`,
  );
  fs.writeFileSync(FIXTURE_TXT, BEGIN + '{"headline":"x"}' + END + '\n');
}

export function removeFixtures() {
  for (const f of [FIXTURE_ONE, FIXTURE_TWO, FIXTURE_TXT]) {
    try {
      fs.rmSync(f, { force: true });
    } catch {
      /* already gone */
    }
  }
}

// Relative paths (POSIX) the editmode handler expects in {file}.
export const relFromRoot = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
