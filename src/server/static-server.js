import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, normalize, extname } from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export function criarServidorEstatico() {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const raizOverlay = resolve(aqui, '../overlay');

  return createServer(async (req, res) => {
    try {
      let caminho = decodeURIComponent(req.url.split('?')[0]);
      if (caminho === '/') caminho = '/index.html';
      const abs = normalize(resolve(raizOverlay, '.' + caminho));
      if (!abs.startsWith(raizOverlay)) { res.writeHead(403).end('proibido'); return; }
      const conteudo = await readFile(abs);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(abs)] ?? 'application/octet-stream' });
      res.end(conteudo);
    } catch {
      res.writeHead(404).end('não encontrado');
    }
  });
}
