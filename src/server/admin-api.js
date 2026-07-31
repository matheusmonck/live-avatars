import { loadConfig as loadConfigReal, saveConfig as saveConfigReal, saveKey as saveKeyReal } from './config.js';
import { listSprites as listSpritesReal, saveSprite as saveSpriteReal, deleteSprite as deleteSpriteReal } from './sprites.js';
import { listTerrains as listTerrainsReal, saveTerrain as saveTerrainReal, setActiveTerrain as setActiveTerrainReal, deleteTerrain as deleteTerrainReal } from './terrains.js';

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
  listTerrains = listTerrainsReal,
  saveTerrain = saveTerrainReal,
  setActiveTerrain = setActiveTerrainReal,
  deleteTerrain = deleteTerrainReal,
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
        bridge.broadcast({ type: 'config', avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds, stageMode: cfg.stageMode });
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
      try { saveSprite(body); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path.startsWith('/admin/api/sprites/') && req.method === 'DELETE') {
      const id = decodeURIComponent(path.slice('/admin/api/sprites/'.length));
      try { deleteSprite(id); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/terrain' && req.method === 'GET') {
      return json(res, 200, listTerrains());
    }
    if (path === '/admin/api/terrain' && req.method === 'POST') {
      const body = await readBody(req);
      try { const t = saveTerrain(body); return json(res, 200, { ok: true, ...t }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/terrain/active' && req.method === 'PUT') {
      const body = await readBody(req);
      try { setActiveTerrain(body.active ?? null); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
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
