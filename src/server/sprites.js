import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ID_RE = /^[a-z0-9-]{1,40}$/;
const DEFAULTS = { frames: 2, scale: 2, facing: 'front' };

function overlayBase(overlayDir) {
  if (overlayDir) return overlayDir;
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../overlay');
}
function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}
function decodePng(dataUrl) {
  const b64 = String(dataUrl).replace(/^data:image\/png;base64,/, '');
  return Buffer.from(b64, 'base64');
}

export function listSprites({ overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const def = readJson(join(base, 'characters.json'))?.characters ?? [];
  const localData = readJson(join(base, 'characters.local.json')) ?? {};
  const loc = localData.characters ?? [];
  const hidden = new Set(localData.hidden ?? []);
  const entry = (e, source) => ({ id: e.id, frames: e.frames ?? DEFAULTS.frames, scale: e.scale ?? DEFAULTS.scale, facing: e.facing ?? DEFAULTS.facing, source, hidden: hidden.has(e.id) });
  const byId = new Map();
  for (const e of def) byId.set(e.id, entry(e, 'default'));
  for (const e of loc) byId.set(e.id, entry(e, 'local'));
  return [...byId.values()];
}

export function saveSprite({ id, scale, facing, frames } = {}, { overlayDir } = {}) {
  if (!ID_RE.test(String(id ?? ''))) throw new Error('id inválido (use a-z, 0-9, hífen)');
  if (!Array.isArray(frames) || frames.length === 0) throw new Error('envie ao menos 1 PNG');
  const base = overlayBase(overlayDir);
  const dir = join(base, 'assets/characters-local', id);
  mkdirSync(dir, { recursive: true });
  frames.forEach((f, i) => writeFileSync(join(dir, `${i + 1}.png`), decodePng(f)));
  const localPath = join(base, 'characters.local.json');
  const data = readJson(localPath) ?? { characters: [] };
  const e = { id, frames: frames.length };
  const s = Number(scale);
  if (Number.isFinite(s) && s !== DEFAULTS.scale) e.scale = s;
  if (facing && facing !== DEFAULTS.facing) e.facing = facing;
  data.characters = (data.characters ?? []).filter((c) => c.id !== id).concat(e);
  writeFileSync(localPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return e;
}

export function setSpriteHidden(id, hidden, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const localPath = join(base, 'characters.local.json');
  const data = readJson(localPath) ?? { characters: [] };
  const set = new Set(data.hidden ?? []);
  if (hidden) set.add(id); else set.delete(id);
  data.hidden = [...set];
  writeFileSync(localPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function deleteSprite(id, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const localPath = join(base, 'characters.local.json');
  const data = readJson(localPath) ?? { characters: [] };
  if (!(data.characters ?? []).some((c) => c.id === id)) throw new Error('sprite padrão não pode ser removido');
  data.characters = data.characters.filter((c) => c.id !== id);
  data.hidden = (data.hidden ?? []).filter((h) => h !== id);
  writeFileSync(localPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  rmSync(join(base, 'assets/characters-local', id), { recursive: true, force: true });
}
