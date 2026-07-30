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
