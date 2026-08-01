import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSprites } from './sprites.js';

function overlayBase(overlayDir) {
  if (overlayDir) return overlayDir;
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../overlay');
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function normalizeUsername(raw) {
  const u = String(raw ?? '').trim().replace(/^@/, '').trim();
  if (!u) throw new Error('usuário inválido');
  return u;
}

function localPath(base) {
  return join(base, 'characters.local.json');
}

function readLocal(base) {
  return readJson(localPath(base)) ?? { characters: [], hidden: [] };
}

function writeLocal(base, data) {
  writeFileSync(localPath(base), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function readDefault(base) {
  return readJson(join(base, 'characters.json')) ?? {};
}

export function listUsers({ overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const def = readDefault(base);
  const local = readLocal(base);

  const defaultOverrides = def.overrides ?? {};
  const localOverrides = local.overrides ?? {};
  const vipSet = new Set(local.vip ?? []);

  // Union of all usernames
  const all = new Set([
    ...Object.keys(defaultOverrides),
    ...Object.keys(localOverrides),
    ...vipSet,
  ]);

  return [...all].map((username) => {
    const hasLocal = Object.prototype.hasOwnProperty.call(localOverrides, username);
    const hasDefault = Object.prototype.hasOwnProperty.call(defaultOverrides, username);

    let sprite;
    let source;
    if (hasLocal) {
      sprite = localOverrides[username];
      source = 'local';
    } else if (hasDefault) {
      sprite = defaultOverrides[username];
      source = 'default';
    } else {
      // vip-only entry
      sprite = null;
      source = 'local';
    }

    return {
      username,
      sprite: sprite ?? null,
      source,
      vip: vipSet.has(username),
    };
  });
}

export function setUser({ username, sprite, vip } = {}, { overlayDir } = {}) {
  const user = normalizeUsername(username);
  const base = overlayBase(overlayDir);
  const data = readLocal(base);

  // Handle sprite
  if (sprite !== undefined) {
    if (sprite === '' || sprite === null) {
      // Clear local override
      if (data.overrides) {
        delete data.overrides[user];
      }
    } else {
      // Validate sprite id
      const validIds = listSprites({ overlayDir }).map((s) => s.id);
      if (!validIds.includes(sprite)) throw new Error('sprite inexistente');
      data.overrides = data.overrides ?? {};
      data.overrides[user] = sprite;
    }
  }

  // Handle vip
  if (vip !== undefined) {
    const vipArr = data.vip ?? [];
    if (vip === true) {
      if (!vipArr.includes(user)) vipArr.push(user);
      data.vip = vipArr;
    } else if (vip === false) {
      data.vip = vipArr.filter((u) => u !== user);
    }
  }

  writeLocal(base, data);

  // Build effective result (local view only)
  const localOverride = (data.overrides ?? {})[user];
  return {
    username: user,
    sprite: localOverride ?? null,
    vip: (data.vip ?? []).includes(user),
  };
}

export function removeUser(username, { overlayDir } = {}) {
  const user = normalizeUsername(username);
  const base = overlayBase(overlayDir);
  const data = readLocal(base);

  if (data.overrides) {
    delete data.overrides[user];
  }
  data.vip = (data.vip ?? []).filter((u) => u !== user);

  writeLocal(base, data);
}
