const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 4173);
const mime = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf',
};
const localPrivateMedia = path.join(root, 'public', 'media', 'private-reference');

function createAppServer() { return http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/\\/g, '/');
    if (pathname.includes('\0')) throw new Error('Invalid path');
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const isPrivateMedia = relative.startsWith('media/private-reference/');
  const isSource = relative.startsWith('source/');
  const base = isSource ? path.join(root, 'source') : isPrivateMedia ? localPrivateMedia : dist;
  const scopedRelative = isSource ? relative.slice('source/'.length) : isPrivateMedia ? relative.slice('media/private-reference/'.length) : relative;
  let file = path.resolve(base, scopedRelative);
  const within = path.relative(base, file);
  if (within === '..' || within.startsWith(`..${path.sep}`) || path.isAbsolute(within)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // Only browser routes receive the app shell. A missing image/data path must
    // be an honest 404, otherwise the browser is handed HTML and reports a
    // confusing image-decoding failure.
    if (path.extname(relative)) {
      response.writeHead(404).end('Not found');
      return;
    }
    file = path.join(dist, 'index.html');
  }
  fs.createReadStream(file)
    .on('error', () => response.writeHead(404).end('Not found'))
    .once('open', () => response.writeHead(200, {
      'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': relative === 'sw.js' || relative === 'offline-manifest.json' ? 'no-cache, no-store, must-revalidate' : 'no-cache',
      ...(relative === 'sw.js' ? { 'Service-Worker-Allowed': '/' } : {}),
    }))
    .pipe(response);
}); }

if (require.main === module) createAppServer().listen(port, '127.0.0.1', () => console.log(`Australian Salticidae Key: http://127.0.0.1:${port}`));
module.exports = { createAppServer };
