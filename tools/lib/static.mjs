// Shared zero-dependency static-file handler for the brand-kit servers
// (serve.mjs preview server + studio-server.mjs). Factored out of serve.mjs;
// fixes the prefix-sibling traversal hole (`startsWith(ROOT)` matched e.g. a
// sibling dir named `<ROOT>-other`) by requiring `root + path.sep` after
// decode + normalize, and rejects NUL bytes.
import fs from 'node:fs';
import path from 'node:path';

export const TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.jsx': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
};

/**
 * createStaticHandler(root) -> (req, res) => boolean
 *
 * Always finishes the response (200 stream or 404 plain text). Returns true
 * when a file was served, false when it answered 404 — callers that route
 * /api/* themselves can treat the handler as terminal either way.
 *
 * When the caller has ALREADY decoded the path (e.g. studio-server routes on a
 * decoded pathname to close the encoded-slash reroute hole) it passes the
 * already-decoded path as `req.decodedPath`; the handler then uses it verbatim
 * and does NOT decode again (no double-decode). Otherwise it self-decodes
 * `req.url` as before (serve.mjs path, unchanged).
 */
export function createStaticHandler(root) {
  const ROOT = path.resolve(root);

  return function handle(req, res) {
    const notFound = () => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return false;
    };

    let p;
    if (typeof req.decodedPath === 'string') {
      p = req.decodedPath; // pre-decoded by the caller — do not decode twice
    } else {
      try {
        p = decodeURIComponent((req.url || '/').split('?')[0]);
      } catch {
        return notFound(); // malformed percent-encoding
      }
    }
    if (p.includes('\0')) return notFound();

    let file = path.normalize(path.join(ROOT, p));
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return notFound();

    let st;
    try {
      st = fs.statSync(file);
    } catch {
      return notFound();
    }
    if (st.isDirectory()) {
      file = path.join(file, 'index.html');
      try {
        st = fs.statSync(file);
      } catch {
        return notFound();
      }
      if (st.isDirectory()) return notFound();
    }

    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    });
    fs.createReadStream(file).pipe(res);
    return true;
  };
}
