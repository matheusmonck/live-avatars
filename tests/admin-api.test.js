import { test, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { createAdminApi } from '../src/server/admin-api.js';

async function comServidor(deps, fn) {
  const api = createAdminApi(deps);
  const http = createServer((req, res) => { if (!api.handle(req, res)) { res.writeHead(404).end(); } });
  await new Promise(r => http.listen(0, r));
  const base = `http://localhost:${http.address().port}`;
  try { await fn(base); } finally { await new Promise(r => http.close(r)); }
}

const depsBase = () => ({
  manager: { start: vi.fn(), stop: vi.fn(), getStatus: () => ({ state: 'idle' }) },
  bridge: { broadcast: vi.fn() },
  loadConfig: () => ({ username: 'ana', avatarLimit: 18, inactivitySeconds: 150, effectsVolume: 0.6, port: 8737, signApiKey: 'k' }),
  saveConfig: vi.fn((en) => en),
  saveKey: vi.fn(),
  listSprites: () => [{ id: 'hero', frames: 2, scale: 2, facing: 'front', source: 'default' }],
  saveSprite: vi.fn(),
  deleteSprite: vi.fn(),
  listTerrains: () => ({ active: null, items: [] }),
  saveTerrain: vi.fn(() => ({ file: 'grama.png' })),
  setActiveTerrain: vi.fn(),
  deleteTerrain: vi.fn(),
  setTerrainOffset: vi.fn(),
});

test('GET /admin/api/config devolve config sem a chave, com hasKey', async () => {
  await comServidor(depsBase(), async (base) => {
    const r = await fetch(`${base}/admin/api/config`);
    const j = await r.json();
    expect(j).toMatchObject({ username: 'ana', avatarLimit: 18, hasKey: true });
    expect(j.signApiKey).toBeUndefined();
  });
});

test('PUT /admin/api/config faz broadcast do frame config com stageMode', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const body = { username: 'ana', avatarLimit: 18, inactivitySeconds: 150, effectsVolume: 0.6, stageMode: false, port: 8737 };
    const r = await fetch(`${base}/admin/api/config`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect(r.status).toBe(200);
    expect(deps.bridge.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: 'config', stageMode: false }));
  });
});

test('POST /admin/api/start chama manager.start', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/start`, { method: 'POST' });
    expect(r.status).toBe(200);
    expect(deps.manager.start).toHaveBeenCalled();
  });
});

test('start sem @ devolve 400', async () => {
  const deps = depsBase();
  deps.manager.start = vi.fn(() => { throw new Error('username obrigatório para iniciar'); });
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/start`, { method: 'POST' });
    expect(r.status).toBe(400);
  });
});

test('PUT /admin/api/key grava a chave', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/key`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signApiKey: 'nova' }) });
    expect(r.status).toBe(200);
    expect(deps.saveKey).toHaveBeenCalledWith('nova');
  });
});

test('não intercepta rotas fora de /admin/api', async () => {
  await comServidor(depsBase(), async (base) => {
    const r = await fetch(`${base}/overlay.js`);
    expect(r.status).toBe(404);
  });
});

test('GET /admin/api/sprites lista', async () => {
  await comServidor(depsBase(), async (base) => {
    const r = await fetch(`${base}/admin/api/sprites`);
    const j = await r.json();
    expect(j[0]).toMatchObject({ id: 'hero', source: 'default' });
  });
});

test('POST /admin/api/sprites chama saveSprite', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/sprites`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'novo', frames: ['x'] }) });
    expect(r.status).toBe(200);
    expect(deps.saveSprite).toHaveBeenCalled();
  });
});

test('POST /admin/api/sprites com erro devolve 400', async () => {
  const deps = depsBase();
  deps.saveSprite = vi.fn(() => { throw new Error('id inválido'); });
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/sprites`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    expect(r.status).toBe(400);
  });
});

test('DELETE /admin/api/sprites/:id chama deleteSprite', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/sprites/robo`, { method: 'DELETE' });
    expect(r.status).toBe(200);
    expect(deps.deleteSprite).toHaveBeenCalledWith('robo');
  });
});

test('GET /admin/api/terrain', async () => {
  await comServidor(depsBase(), async (base) => {
    const r = await fetch(`${base}/admin/api/terrain`);
    expect((await r.json())).toEqual({ active: null, items: [] });
  });
});
test('POST /admin/api/terrain chama saveTerrain', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/terrain`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'grama', image: 'x' }) });
    expect(r.status).toBe(200);
    expect(deps.saveTerrain).toHaveBeenCalled();
  });
});
test('PUT /admin/api/terrain/active', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/terrain/active`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: null }) });
    expect(r.status).toBe(200);
    expect(deps.setActiveTerrain).toHaveBeenCalledWith(null);
  });
});
test('DELETE /admin/api/terrain/:file', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/terrain/grama.png`, { method: 'DELETE' });
    expect(r.status).toBe(200);
    expect(deps.deleteTerrain).toHaveBeenCalledWith('grama.png');
  });
});
test('PUT /admin/api/terrain/offset chama setTerrainOffset e faz broadcast terrain', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/terrain/offset`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: 'grama.png', offset: -30 }) });
    expect(r.status).toBe(200);
    expect(deps.setTerrainOffset).toHaveBeenCalledWith('grama.png', -30);
    expect(deps.bridge.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: 'terrain' }));
  });
});
test('PUT /admin/api/terrain/active faz broadcast do frame terrain', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/terrain/active`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active: 'grama.png' }) });
    expect(r.status).toBe(200);
    expect(deps.bridge.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: 'terrain' }));
  });
});
