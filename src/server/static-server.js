import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, normalize, extname, sep } from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export function createStaticServer() {
  const here = dirname(fileURLToPath(import.meta.url));
  const overlayRoot = resolve(here, '../overlay');

  return createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';
      const abs = normalize(resolve(overlayRoot, '.' + urlPath));
      if (!abs.startsWith(overlayRoot + sep)) { res.writeHead(403).end('proibido'); return; }
      const content = await readFile(abs);
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(abs)] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404).end('não encontrado');
    }
  });
}
