export type ConnState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';
export interface Status { type?: 'status'; state: ConnState; username?: string; room?: string; reason?: string }
export interface Config { username: string; avatarLimit: number; inactivitySeconds: number; effectsVolume: number; stageMode: boolean; port: number; hasKey: boolean }
export interface SpriteItem { id: string; frames: number; scale: number; facing: string; source: 'default' | 'local'; hidden: boolean }
export interface TerrainState { active: string | null; items: { file: string; offset: number }[] }
export interface ApiResult { ok?: boolean; error?: string; [k: string]: unknown }

const asJson = (r: Response) => r.json();
const jsonReq = (method: string, body: unknown) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const getConfig = (): Promise<Config> => fetch('/admin/api/config').then(asJson);
export const putConfig = (c: Omit<Config, 'hasKey'>): Promise<ApiResult> => fetch('/admin/api/config', jsonReq('PUT', c)).then(asJson);
export const putKey = (signApiKey: string): Promise<ApiResult> => fetch('/admin/api/key', jsonReq('PUT', { signApiKey })).then(asJson);
export const getStatus = (): Promise<Status> => fetch('/admin/api/status').then(asJson);
export const startConnection = (): Promise<ApiResult> => fetch('/admin/api/start', { method: 'POST' }).then(asJson);
export const stopConnection = (): Promise<ApiResult> => fetch('/admin/api/stop', { method: 'POST' }).then(asJson);
export const restartConnection = async (): Promise<ApiResult> => { await stopConnection(); return startConnection(); };
export const getSprites = (): Promise<SpriteItem[]> => fetch('/admin/api/sprites').then(asJson);
export const saveSprite = (s: { id: string; scale: number; facing: string; frames: string[] }): Promise<ApiResult> => fetch('/admin/api/sprites', jsonReq('POST', s)).then(asJson);
export const deleteSprite = (id: string): Promise<ApiResult> => fetch(`/admin/api/sprites/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(asJson);
export const setSpriteHidden = (id: string, hidden: boolean): Promise<ApiResult> => fetch('/admin/api/sprites/hidden', jsonReq('PUT', { id, hidden })).then(asJson);
export const getTerrain = (): Promise<TerrainState> => fetch('/admin/api/terrain').then(asJson);
export const saveTerrain = (t: { name: string; image: string }): Promise<ApiResult> => fetch('/admin/api/terrain', jsonReq('POST', t)).then(asJson);
export const setActiveTerrain = (active: string | null): Promise<ApiResult> => fetch('/admin/api/terrain/active', jsonReq('PUT', { active })).then(asJson);
export const deleteTerrain = (file: string): Promise<ApiResult> => fetch(`/admin/api/terrain/${encodeURIComponent(file)}`, { method: 'DELETE' }).then(asJson);
export const setTerrainOffset = (file: string, offset: number): Promise<ApiResult> => fetch('/admin/api/terrain/offset', jsonReq('PUT', { file, offset })).then(asJson);

export function subscribeStatus(cb: (s: Status) => void): () => void {
  const ws = new WebSocket(`ws://${location.host}`);
  ws.onmessage = (e: MessageEvent) => { try { const f = JSON.parse(e.data); if (f?.type === 'status') cb(f as Status); } catch { /* ignore */ } };
  return () => ws.close();
}
