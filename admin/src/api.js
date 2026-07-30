const j = (r) => r.json();
export const getConfig = () => fetch('/admin/api/config').then(j);
export const putConfig = (cfg) =>
  fetch('/admin/api/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cfg) }).then(j);
export const putKey = (signApiKey) =>
  fetch('/admin/api/key', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signApiKey }) }).then(j);
export const startConnection = () => fetch('/admin/api/start', { method: 'POST' }).then(j);
export const stopConnection = () => fetch('/admin/api/stop', { method: 'POST' }).then(j);
export function onStatus(cb) {
  const ws = new WebSocket(`ws://${location.host}`);
  ws.onmessage = (e) => { try { const f = JSON.parse(e.data); if (f.type === 'status') cb(f); } catch {} };
  return () => ws.close();
}
export const getSprites = () => fetch('/admin/api/sprites').then(j);
export const saveSprite = (sprite) =>
  fetch('/admin/api/sprites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sprite) }).then(j);
export const deleteSprite = (id) =>
  fetch(`/admin/api/sprites/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(j);
export const getTerrain = () => fetch('/admin/api/terrain').then(j);
export const saveTerrain = (t) =>
  fetch('/admin/api/terrain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(t) }).then(j);
export const setActiveTerrain = (active) =>
  fetch('/admin/api/terrain/active', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ active }) }).then(j);
export const deleteTerrain = (file) =>
  fetch(`/admin/api/terrain/${encodeURIComponent(file)}`, { method: 'DELETE' }).then(j);
