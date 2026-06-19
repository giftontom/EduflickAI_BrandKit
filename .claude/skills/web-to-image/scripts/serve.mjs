// serve.mjs — tiny zero-dependency static server.
// In-browser export and some file:// font/image fetches are blocked on file://; serve over
// http and point HTML_PATH at the printed URL instead.
//
//   ROOT=. PORT=8080 node serve.mjs
//
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.ROOT || process.cwd());
const PORT = Number(process.env.PORT || 8080);
const TYPES = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2",
};

http
  .createServer((req, res) => {
    const decoded = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(ROOT, decoded);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end("Not found: " + decoded); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`Serving ${ROOT}\n→ http://localhost:${PORT}/`));
