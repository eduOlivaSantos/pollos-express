import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/model.js', ['model.js', 'text/javascript; charset=utf-8']],
  ['/views.js', ['views.js', 'text/javascript; charset=utf-8']],
  ['/marca.svg', ['marca.svg', 'image/svg+xml']],
  ['/menu.svg', ['menu.svg', 'image/svg+xml']],
]);

const port = Number(process.env.PORT ?? 4173);
const host = '127.0.0.1';
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const asset = assets.get(path);
  if (!asset) {
    response.writeHead(404).end();
    return;
  }
  try {
    const [file, contentType] = asset;
    const body = await readFile(new URL('dist/' + file, import.meta.url));
    response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' }).end(body);
  } catch {
    response.writeHead(500).end();
  }
});
server.listen(port, host, () => console.log('Pollos Express · http://' + host + ':' + server.address().port));
