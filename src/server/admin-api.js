import { loadConfig as loadConfigReal, saveConfig as saveConfigReal, saveKey as saveKeyReal, configFrame } from './config.js';
import { listSprites as listSpritesReal, saveSprite as saveSpriteReal, deleteSprite as deleteSpriteReal, setSpriteHidden as setSpriteHiddenReal, setSpriteScale as setSpriteScaleReal } from './sprites.js';
import { listTerrains as listTerrainsReal, saveTerrain as saveTerrainReal, setActiveTerrain as setActiveTerrainReal, deleteTerrain as deleteTerrainReal, setTerrainOffset as setTerrainOffsetReal, setTerrainScale as setTerrainScaleReal } from './terrains.js';
import { listUsers as listUsersReal, setUser as setUserReal, removeUser as removeUserReal } from './users.js';

// Handler das rotas /admin/api/*. Deps injetáveis para teste.
export function createAdminApi({
  manager,
  bridge,
  loadConfig = loadConfigReal,
  saveConfig = saveConfigReal,
  saveKey = saveKeyReal,
  listSprites = listSpritesReal,
  saveSprite = saveSpriteReal,
  deleteSprite = deleteSpriteReal,
  setSpriteHidden = setSpriteHiddenReal,
  setSpriteScale = setSpriteScaleReal,
  listTerrains = listTerrainsReal,
  saveTerrain = saveTerrainReal,
  setActiveTerrain = setActiveTerrainReal,
  deleteTerrain = deleteTerrainReal,
  setTerrainOffset = setTerrainOffsetReal,
  setTerrainScale = setTerrainScaleReal,
  listUsers = listUsersReal,
  setUser = setUserReal,
  removeUser = removeUserReal,
} = {}) {
  function readBody(req) {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => { data += c; });
      req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    });
  }
  function json(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  }
  function terrainFrame() {
    const { active, items } = listTerrains();
    const item = items.find((i) => i.file === active);
    return { type: 'terrain', active, offset: item?.offset ?? 0, scale: item?.scale ?? 1 };
  }

  async function route(req, res, path) {
    if (path === '/admin/api/config' && req.method === 'GET') {
      const cfg = loadConfig();
      const { signApiKey, ...rest } = cfg;
      return json(res, 200, { ...rest, hasKey: Boolean(signApiKey) });
    }
    if (path === '/admin/api/config' && req.method === 'PUT') {
      const body = await readBody(req);
      try {
        const cfg = saveConfig(body);
        bridge.broadcast(configFrame(cfg));
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/key' && req.method === 'PUT') {
      const body = await readBody(req);
      saveKey(body.signApiKey);
      return json(res, 200, { ok: true });
    }
    if (path === '/admin/api/start' && req.method === 'POST') {
      try { manager.start(loadConfig()); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/stop' && req.method === 'POST') {
      manager.stop(); return json(res, 200, { ok: true });
    }
    if (path === '/admin/api/status' && req.method === 'GET') {
      return json(res, 200, manager.getStatus());
    }
    if (path === '/admin/api/sprites' && req.method === 'GET') {
      return json(res, 200, listSprites());
    }
    if (path === '/admin/api/sprites' && req.method === 'POST') {
      const body = await readBody(req);
      try { saveSprite(body); bridge.broadcast({ type: 'sprites' }); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/sprites/hidden' && req.method === 'PUT') {
      const body = await readBody(req);
      try { setSpriteHidden(body.id, body.hidden); bridge.broadcast({ type: 'sprites' }); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/sprites/scale' && req.method === 'PUT') {
      const body = await readBody(req);
      try { setSpriteScale(body.id, body.scale); bridge.broadcast({ type: 'sprites' }); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path.startsWith('/admin/api/sprites/') && req.method === 'DELETE') {
      const id = decodeURIComponent(path.slice('/admin/api/sprites/'.length));
      try { deleteSprite(id); bridge.broadcast({ type: 'sprites' }); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/users' && req.method === 'GET') {
      return json(res, 200, listUsers());
    }
    if (path === '/admin/api/users' && req.method === 'PUT') {
      const body = await readBody(req);
      try { setUser(body); bridge.broadcast({ type: 'users' }); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path.startsWith('/admin/api/users/') && req.method === 'DELETE') {
      const username = decodeURIComponent(path.slice('/admin/api/users/'.length));
      try { removeUser(username); bridge.broadcast({ type: 'users' }); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/terrain' && req.method === 'GET') {
      return json(res, 200, listTerrains());
    }
    if (path === '/admin/api/terrain' && req.method === 'POST') {
      const body = await readBody(req);
      try { const t = saveTerrain(body); bridge.broadcast(terrainFrame()); return json(res, 200, { ok: true, ...t }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/terrain/active' && req.method === 'PUT') {
      const body = await readBody(req);
      try {
        setActiveTerrain(body.active ?? null);
        bridge.broadcast(terrainFrame());
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/terrain/offset' && req.method === 'PUT') {
      const body = await readBody(req);
      try {
        setTerrainOffset(body.file, body.offset);
        bridge.broadcast(terrainFrame());
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/terrain/scale' && req.method === 'PUT') {
      const body = await readBody(req);
      try {
        setTerrainScale(body.file, body.scale);
        bridge.broadcast(terrainFrame());
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path.startsWith('/admin/api/terrain/') && req.method === 'DELETE') {
      const file = decodeURIComponent(path.slice('/admin/api/terrain/'.length));
      try { deleteTerrain(file); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    return json(res, 404, { error: 'rota não encontrada' });
  }

  return {
    handle(req, res) {
      const path = req.url.split('?')[0];
      if (!path.startsWith('/admin/api/')) return false;
      route(req, res, path);
      return true;
    },
  };
}
