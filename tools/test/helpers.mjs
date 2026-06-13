// helpers.mjs — shared test harness for the studio API suite.
//
// Spawns tools/studio-server.mjs as a child on STUDIO_PORT=8099, polls
// GET /api/manifest until it answers, and exposes a fetch wrapper that defaults
// a same-origin Origin + Host (http://127.0.0.1:8099) so ordinary requests pass
// the DNS-rebinding + CSRF guards. Also a byte-exact snapshot/restore of every
// file in the studio write surface, so the suite runs against the REAL repo and
// leaves no residue.
//
// Pure node:* — no npm packages (G1). Playwright is used only by smoke.mjs.
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
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

// Every file the studio can write, plus the (gitignored) action-state file the
// action-runner test mutates. Snapshotted in before(), restored in after().
export const WRITE_SURFACE = [
  'content-studio/status.json',
  'content-studio/FACTS.md',
  'content-studio/design-comments.json',
  'content-studio/DESIGN_FEEDBACK.md',
  'content-studio/launch-grid.json',
  'design-system/collateral/launch-grid.html',
  'tools/.studio-state.json',
];

// ---- cross-process status.json section lock -------------------------------

// The suite runs test FILES concurrently, each spawning its OWN server child.
// content-studio/status.json is a SHARED file with no inter-process lock, so any
// two files that touch it race at the OS level in three ways:
//   • two servers' read-modify-write cycles lose-update each other (A reads {x},
//     B reads {x}, A writes {x,a}, B writes {x,b} — a is lost; the atomic rename
//     prevents torn files, not lost updates);
//   • the corrupt-store test overwrites the whole file with garbage mid-run;
//   • a sibling's after()/restoreSnapshot rewrites the file to a pre-suite
//     snapshot while another file is still mid-test.
// Only api.test.mjs and status-statemachine.test.mjs write status.json (the
// other surfaces are disjoint), so they take this whole-file advisory lock for
// their ENTIRE lifetime — before() acquires, after() releases — and thus run
// serially RELATIVE TO EACH OTHER on status.json. comments.test.mjs touches no
// status.json and never blocks. Files that touch status.json call
// acquireStatusSection() in before() (after snapshot) and releaseStatusSection()
// in after() (before restore).
const STATUS_LOCK = path.join(ROOT, 'content-studio', '.status.json.testlock');
let heldStatusSection = false;

export async function acquireStatusSection() {
  const deadline = Date.now() + 60000; // generous: a whole file's run may be held
  for (;;) {
    try {
      // O_CREAT|O_EXCL: the create succeeds for exactly one holder at a time.
      const fd = fs.openSync(STATUS_LOCK, 'wx');
      fs.writeSync(fd, `${process.pid} ${Date.now()}`);
      fs.closeSync(fd);
      heldStatusSection = true;
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // Reclaim a stale lock (a crashed holder) whose mtime is older than 45s —
      // longer than any honest file run — so the suite never deadlocks on an
      // orphaned lockfile.
      try {
        const st = fs.statSync(STATUS_LOCK);
        if (Date.now() - st.mtimeMs > 45000) fs.rmSync(STATUS_LOCK, { force: true });
      } catch {
        /* vanished between stat and now — loop and retry the create */
      }
      if (Date.now() > deadline) throw new Error('status section lock wait timed out');
      await delay(25);
    }
  }
}

export function releaseStatusSection() {
  if (!heldStatusSection) return;
  heldStatusSection = false;
  try {
    fs.rmSync(STATUS_LOCK, { force: true });
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

export async function startServer() {
  child = spawn(NODE, ['studio-server.mjs'], {
    cwd: TOOLS,
    env: { ...process.env, STUDIO_PORT: String(PORT), PORT: String(PORT) },
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

export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- snapshot / restore (byte-exact) --------------------------------------

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
