import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME_RE = /^[a-z0-9-]{1,40}$/;
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg' };

function overlayBase(overlayDir) {
  if (overlayDir) return overlayDir;
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../overlay');
}
function readJson(path) { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } }
function statePath(base) { return join(base, 'terrain.local.json'); }
function terrainDir(base) { return join(base, 'assets/terrain-local'); }
function writeState(base, active) {
  writeFileSync(statePath(base), JSON.stringify({ active: active ?? null }, null, 2) + '\n', 'utf8');
}

export function listTerrains({ overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const active = readJson(statePath(base))?.active ?? null;
  let items = [];
  try { items = readdirSync(terrainDir(base)).map((file) => ({ file })); } catch {}
  return { active, items };
}

export function saveTerrain({ name, image } = {}, { overlayDir } = {}) {
  if (!NAME_RE.test(String(name ?? ''))) throw new Error('nome inválido (use a-z, 0-9, hífen)');
  const m = /^data:(image\/png|image\/jpeg);base64,/.exec(String(image ?? ''));
  if (!m) throw new Error('imagem deve ser PNG ou JPEG (base64)');
  const ext = EXT[m[1]];
  const base = overlayBase(overlayDir);
  mkdirSync(terrainDir(base), { recursive: true });
  const file = `${name}.${ext}`;
  writeFileSync(join(terrainDir(base), file), Buffer.from(image.slice(m[0].length), 'base64'));
  writeState(base, file);
  return { file };
}

export function setActiveTerrain(file, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  if (file && !existsSync(join(terrainDir(base), file))) throw new Error('terreno não encontrado');
  writeState(base, file ?? null);
}

export function deleteTerrain(file, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  rmSync(join(terrainDir(base), file), { force: true });
  if ((readJson(statePath(base))?.active ?? null) === file) writeState(base, null);
}
