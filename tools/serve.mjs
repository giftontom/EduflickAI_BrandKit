// Tiny zero-dependency static server for the brand kit.
// In-browser image export (the ⬇ buttons) only works over http(s) — on file://
// the browser blocks the font/image fetches html-to-image needs. Run this, then
// open the printed URL.
//
//   cd tools && npm run serve
//
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createStaticHandler } from './lib/static.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8080);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const handle = createStaticHandler(ROOT);
  http.createServer(handle).listen(PORT, () => {
    const grid = `http://localhost:${PORT}/design-system/collateral/${encodeURIComponent('launch-grid.html')}`;
    console.log(`Serving ${ROOT}\n`);
    console.log(`Open the launch grid (in-browser ⬇ downloads work here):`);
    console.log(`  ${grid}`);
    console.log(`  ${grid}?export=1   ← full-size export view (big hover ⬇ on every post)\n`);
    console.log('Ctrl+C to stop.');
  });
}
