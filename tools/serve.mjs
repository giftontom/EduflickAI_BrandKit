// Tiny zero-dependency static server for the brand kit.
// In-browser image export (the ⬇ buttons) only works over http(s) — on file://
// the browser blocks the font/image fetches html-to-image needs. Run this, then
// open the printed URL.
//
//   cd tools && npm run serve
//
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8080);
const TYPES = {
  '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml',
  '.gif':'image/gif', '.webp':'image/webp', '.json':'application/json', '.woff2':'font/woff2',
  '.pdf':'application/pdf',
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  const grid = `http://localhost:${PORT}/design-system/collateral/${encodeURIComponent('Eduflick Launch Grid.html')}`;
  console.log(`Serving ${ROOT}\n`);
  console.log(`Open the launch grid (in-browser ⬇ downloads work here):`);
  console.log(`  ${grid}`);
  console.log(`  ${grid}?export=1   ← full-size export view (big hover ⬇ on every post)\n`);
  console.log('Ctrl+C to stop.');
});
