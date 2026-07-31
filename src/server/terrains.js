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
function readState(base) {
  const s = readJson(statePath(base));
  return { active: s?.active ?? null, offsets: s?.offsets ?? {} };
}
function writeState(base, state) {
  const out = { active: state.active ?? null, offsets: state.offsets ?? {} };
  writeFileSync(statePath(base), JSON.stringify(out, null, 2) + '\n', 'utf8');
}
function clampOffset(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(400, Math.max(-400, n));
}

export function listTerrains({ overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const st = readState(base);
  let items = [];
  try { items = readdirSync(terrainDir(base)).map((file) => ({ file, offset: st.offsets[file] ?? 0 })); } catch {}
  return { active: st.active, items };
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
  const st = readState(base);
  st.active = file;
  writeState(base, st);
  return { file };
}

export function setActiveTerrain(file, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  if (file && !existsSync(join(terrainDir(base), file))) throw new Error('terreno não encontrado');
  const st = readState(base);
  st.active = file ?? null;
  writeState(base, st);
}

export function setTerrainOffset(file, offset, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const st = readState(base);
  st.offsets[file] = clampOffset(offset);
  writeState(base, st);
}

export function deleteTerrain(file, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  rmSync(join(terrainDir(base), file), { force: true });
  const st = readState(base);
  if (st.active === file) st.active = null;
  delete st.offsets[file];
  writeState(base, st);
}
