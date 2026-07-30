import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, normalize, extname, sep } from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

async function serveStatic(root, urlPath, res) {
  try {
    let p = decodeURIComponent(urlPath.split('?')[0]);
    if (p === '' || p === '/') p = '/index.html';
    const abs = normalize(resolve(root, '.' + p));
    if (abs !== root && !abs.startsWith(root + sep)) { res.writeHead(403).end('proibido'); return; }
    const conteudo = await readFile(abs);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(abs)] ?? 'application/octet-stream' });
    res.end(conteudo);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
}

// Servidor HTTP que roteia: /admin/api -> adminApi ; /admin -> painel (dist) ; resto -> overlay.
export function createStaticServer({ adminApi } = {}) {
  const here = dirname(fileURLToPath(import.meta.url));
  const overlayRoot = resolve(here, '../overlay');
  const adminRoot = resolve(here, '../../admin/dist');

  return createServer((req, res) => {
    const path = req.url.split('?')[0];
    if (adminApi && path.startsWith('/admin/api/')) { if (adminApi(req, res)) return; }
    if (path === '/admin' || path.startsWith('/admin/')) {
      return serveStatic(adminRoot, path.replace(/^\/admin/, '') || '/', res);
    }
    return serveStatic(overlayRoot, path, res);
  });
}
