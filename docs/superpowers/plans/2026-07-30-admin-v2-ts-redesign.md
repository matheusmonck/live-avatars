# Admin v2 — TypeScript + redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Checkbox (`- [ ]`) steps.

**Goal:** Reescrever o painel `/admin` em TypeScript, tema escuro com abas, mais usável — sem mudar o backend.

**Architecture:** Frontend React+TS em `admin/src/` — `api.ts` tipado, `hooks/useStatus`, `ui/` de primitivos, `tabs/` (4 abas), `theme.css` (tokens dark). Build Vite → `admin/dist` versionado, servido em `/admin`. Testes leves com Vitest + Testing Library.

**Tech Stack:** React 18, Vite, TypeScript, Vitest + @testing-library/react + jsdom.

**Regras:** Branch `feat/mvp`; commits **sem** co-author; `git add` específico (nunca `-A`); frontend com type-check + testes + build; `admin/node_modules` gitignored; `admin/dist` versionado.

**Nota:** os componentes `.jsx` antigos (`ControlPanel/ConfigForm/KeyField/SpriteManager/TerrainManager/App/main`) são substituídos; ficam órfãos até a Task 6 (o build só inclui o que `main.tsx` importa). Não os edite — serão apagados no fim.

---

### Task 1: Tooling TS + tema + shell mínimo

**Files:** Modify `admin/package.json`; Create `admin/tsconfig.json`, `admin/tsconfig.node.json`; Rename `admin/vite.config.js`→`admin/vite.config.ts`; Create `admin/src/test-setup.ts`, `admin/src/theme.css`, `admin/src/main.tsx`, `admin/src/App.tsx`; Modify `admin/index.html`.

- [ ] **Step 1: `admin/package.json`** — substituir por:
```json
{
  "name": "live-avatars-admin",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsc --noEmit && vite build"
  },
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: `admin/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: `admin/vite.config.ts`** (renomear o `.js` e trocar conteúdo):
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts' },
});
```
(Apague o antigo `admin/vite.config.js`.)

- [ ] **Step 4: `admin/src/test-setup.ts`**:
```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 5: `admin/src/theme.css`**:
```css
:root {
  --bg:#0a0a0c; --panel:#121317; --panel-2:#181a1f; --border:#23262d;
  --text:#e8eaef; --muted:#8a909b; --accent:#22d3ee; --accent-contrast:#04252b;
  --ok:#22c55e; --warn:#f59e0b; --err:#ef4444; --idle:#6b7280; --radius:10px;
}
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font-family:system-ui,-apple-system,sans-serif; }
.app { max-width:680px; margin:0 auto; padding:1.5rem 1rem 4rem; }
.header { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
.header h1 { font-size:1.25rem; margin:0; }
.badge { display:inline-flex; align-items:center; gap:.5rem; background:var(--panel); border:1px solid var(--border); border-radius:999px; padding:.35rem .75rem; font-size:.85rem; color:var(--muted); }
.badge .dot { width:9px; height:9px; border-radius:50%; box-shadow:0 0 8px currentColor; }
.tabs { display:flex; gap:.25rem; border-bottom:1px solid var(--border); margin-bottom:1.25rem; }
.tab { background:none; border:none; color:var(--muted); padding:.6rem .9rem; cursor:pointer; font-size:.95rem; border-bottom:2px solid transparent; }
.tab:hover { color:var(--text); }
.tab.active { color:var(--text); border-bottom-color:var(--accent); }
.card { background:var(--panel); border:1px solid var(--border); border-radius:var(--radius); padding:1.1rem 1.15rem; margin-bottom:1.25rem; }
.card h2 { margin:0 0 .85rem; font-size:1.05rem; }
.card h3 { margin:1rem 0 .5rem; font-size:.95rem; color:var(--muted); }
.grid { display:grid; gap:.7rem; }
.row { display:flex; align-items:center; gap:.6rem; flex-wrap:wrap; }
.field { display:grid; gap:.3rem; font-size:.9rem; }
.field > span { color:var(--muted); }
.field input, .field select, .input { background:var(--panel-2); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:.5rem .6rem; font:inherit; }
.field input:focus, .input:focus, .field select:focus { outline:1px solid var(--accent); }
.btn { border:1px solid var(--border); background:var(--panel-2); color:var(--text); border-radius:8px; padding:.5rem .9rem; cursor:pointer; font:inherit; }
.btn:disabled { opacity:.45; cursor:not-allowed; }
.btn-primary { background:var(--accent); color:var(--accent-contrast); border-color:var(--accent); font-weight:600; }
.btn-danger { border-color:#5b2330; color:#ff9db0; }
.list { list-style:none; padding:0; display:grid; gap:.5rem; margin:0 0 1rem; }
.muted { color:var(--muted); font-size:.85rem; }
.err { color:#ff9db0; font-size:.85rem; }
.pixel { image-rendering:pixelated; background:var(--panel-2); border-radius:6px; }
.thumb { border-radius:6px; border:1px solid var(--border); }
```

- [ ] **Step 6: `admin/src/main.tsx`**:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './theme.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 7: `admin/src/App.tsx`** (shell mínimo por ora):
```tsx
export function App() {
  return (
    <div className="app">
      <header className="header"><h1>Live Avatars</h1></header>
      <p className="muted">Painel em reconstrução…</p>
    </div>
  );
}
```

- [ ] **Step 8: `admin/index.html`** — trocar o `<script>` para:
```html
    <script type="module" src="/src/main.tsx"></script>
```

- [ ] **Step 9: Instalar deps + typecheck + build**
```bash
cd admin && npm install && npm run typecheck && npm run build && cd ..
```
Expected: sem erros de tipo; `admin/dist/index.html` gerado.

- [ ] **Step 10: Commit**
```bash
git add admin/package.json admin/package-lock.json admin/tsconfig.json admin/vite.config.ts admin/src/test-setup.ts admin/src/theme.css admin/src/main.tsx admin/src/App.tsx admin/index.html admin/dist
git rm admin/vite.config.js
git commit -m "feat(admin): tooling TypeScript + tema escuro + shell"
```

---

### Task 2: `api.ts` tipado + `useStatus` + teste

**Files:** Create `admin/src/api.ts`, `admin/src/hooks/useStatus.ts`, `admin/src/api.test.ts`.

- [ ] **Step 1: `admin/src/api.test.ts`** (RED)
```ts
import { test, expect, vi, beforeEach } from 'vitest';
import { getConfig, putKey, saveSprite } from './api';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ ok: true }) } as Response)));
});

test('getConfig faz GET em /admin/api/config', async () => {
  await getConfig();
  expect(fetch).toHaveBeenCalledWith('/admin/api/config');
});

test('putKey manda PUT com o corpo da chave', async () => {
  await putKey('minha-chave');
  expect(fetch).toHaveBeenCalledWith('/admin/api/key', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ signApiKey: 'minha-chave' }),
  }));
});

test('saveSprite manda POST em /admin/api/sprites', async () => {
  await saveSprite({ id: 'x', scale: 2, facing: 'front', frames: ['a'] });
  expect(fetch).toHaveBeenCalledWith('/admin/api/sprites', expect.objectContaining({ method: 'POST' }));
});
```

- [ ] **Step 2: Rodar e ver falhar** — Run (from `admin/`): `cd admin && npm test -- src/api.test.ts; cd ..` → FAIL.

- [ ] **Step 3: `admin/src/api.ts`**
```ts
export type ConnState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';
export interface Status { type?: 'status'; state: ConnState; username?: string; room?: string; reason?: string }
export interface Config { username: string; avatarLimit: number; inactivitySeconds: number; effectsVolume: number; port: number; hasKey: boolean }
export interface SpriteItem { id: string; frames: number; scale: number; facing: string; source: 'default' | 'local' }
export interface TerrainState { active: string | null; items: { file: string }[] }
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
export const getTerrain = (): Promise<TerrainState> => fetch('/admin/api/terrain').then(asJson);
export const saveTerrain = (t: { name: string; image: string }): Promise<ApiResult> => fetch('/admin/api/terrain', jsonReq('POST', t)).then(asJson);
export const setActiveTerrain = (active: string | null): Promise<ApiResult> => fetch('/admin/api/terrain/active', jsonReq('PUT', { active })).then(asJson);
export const deleteTerrain = (file: string): Promise<ApiResult> => fetch(`/admin/api/terrain/${encodeURIComponent(file)}`, { method: 'DELETE' }).then(asJson);

export function subscribeStatus(cb: (s: Status) => void): () => void {
  const ws = new WebSocket(`ws://${location.host}`);
  ws.onmessage = (e: MessageEvent) => { try { const f = JSON.parse(e.data); if (f?.type === 'status') cb(f as Status); } catch { /* ignore */ } };
  return () => ws.close();
}
```

- [ ] **Step 4: `admin/src/hooks/useStatus.ts`**
```ts
import { useEffect, useState } from 'react';
import { getStatus, subscribeStatus, type Status } from '../api';

export function useStatus(): Status {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  useEffect(() => {
    getStatus().then(setStatus).catch(() => { /* idle */ });
    return subscribeStatus(setStatus);
  }, []);
  return status;
}
```

- [ ] **Step 5: Rodar e commitar**
```bash
cd admin && npm test && npm run typecheck && cd ..
git add admin/src/api.ts admin/src/hooks/useStatus.ts admin/src/api.test.ts
git commit -m "feat(admin): camada de API tipada + useStatus"
```

---

### Task 3: primitivos de UI + testes

**Files:** Create `admin/src/ui/Button.tsx`, `Field.tsx`, `Card.tsx`, `Badge.tsx`, `Tabs.tsx`; Create `admin/src/ui/Tabs.test.tsx`, `admin/src/ui/Badge.test.tsx`.

- [ ] **Step 1: `admin/src/ui/Button.tsx`**
```tsx
import type { ButtonHTMLAttributes } from 'react';
type Variant = 'primary' | 'ghost' | 'danger';
export function Button({ variant = 'ghost', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`btn btn-${variant}`} {...rest} />;
}
```

- [ ] **Step 2: `admin/src/ui/Field.tsx`**
```tsx
import type { InputHTMLAttributes } from 'react';
export function Field({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field"><span>{label}</span><input {...rest} /></label>;
}
```

- [ ] **Step 3: `admin/src/ui/Card.tsx`**
```tsx
import type { ReactNode } from 'react';
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return <section className="card">{title ? <h2>{title}</h2> : null}{children}</section>;
}
```

- [ ] **Step 4: `admin/src/ui/Badge.tsx`**
```tsx
import type { Status } from '../api';
const COLOR: Record<string, string> = { idle: 'var(--idle)', connecting: 'var(--warn)', connected: 'var(--ok)', reconnecting: 'var(--warn)', offline: 'var(--err)', error: 'var(--err)' };
const LABEL: Record<string, string> = { idle: 'parado', connecting: 'conectando…', connected: 'conectado', reconnecting: 'reconectando…', offline: 'offline', error: 'erro' };
export function Badge({ status }: { status: Status }) {
  return (
    <span className="badge">
      <span className="dot" style={{ color: COLOR[status.state], background: COLOR[status.state] }} />
      {LABEL[status.state] ?? status.state}
      {status.username ? ` · @${status.username}` : ''}{status.room ? ` · sala ${status.room}` : ''}
    </span>
  );
}
```

- [ ] **Step 5: `admin/src/ui/Tabs.tsx`**
```tsx
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <nav className="tabs">
      {tabs.map((t) => (
        <button key={t} className={t === active ? 'tab active' : 'tab'} onClick={() => onChange(t)}>{t}</button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 6: `admin/src/ui/Tabs.test.tsx`**
```tsx
import { test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

test('renderiza abas e chama onChange no clique', () => {
  const onChange = vi.fn();
  render(<Tabs tabs={['A', 'B']} active="A" onChange={onChange} />);
  fireEvent.click(screen.getByText('B'));
  expect(onChange).toHaveBeenCalledWith('B');
});
```

- [ ] **Step 7: `admin/src/ui/Badge.test.tsx`**
```tsx
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('mostra o rótulo do estado conectado com @', () => {
  render(<Badge status={{ state: 'connected', username: 'ana', room: '1' }} />);
  expect(screen.getByText(/conectado/)).toBeInTheDocument();
  expect(screen.getByText(/@ana/)).toBeInTheDocument();
});
```

- [ ] **Step 8: Rodar e commitar**
```bash
cd admin && npm test && npm run typecheck && cd ..
git add admin/src/ui
git commit -m "feat(admin): primitivos de UI (Button/Field/Card/Badge/Tabs) + testes"
```

---

### Task 4: App shell + aba Conexão + aba Configuração

**Files:** Modify `admin/src/App.tsx`; Create `admin/src/tabs/ConnectionTab.tsx`, `admin/src/tabs/ConfigTab.tsx`.

- [ ] **Step 1: `admin/src/tabs/ConnectionTab.tsx`**
```tsx
import { useState } from 'react';
import { startConnection, stopConnection, restartConnection, type Status, type ApiResult } from '../api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export function ConnectionTab({ status }: { status: Status }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const on = status.state !== 'idle';
  const run = (fn: () => Promise<ApiResult>) => async () => {
    setBusy(true); setMsg('');
    const r = await fn();
    if (r?.error) setMsg(r.error);
    setBusy(false);
  };
  return (
    <Card title="Conexão">
      <div className="row">
        <Button variant="primary" disabled={on || busy} onClick={run(startConnection)}>Iniciar</Button>
        <Button variant="danger" disabled={!on || busy} onClick={run(stopConnection)}>Parar</Button>
        <Button disabled={!on || busy} onClick={run(restartConnection)}>Reiniciar</Button>
      </div>
      {status.reason ? <p className="err">{status.reason}</p> : null}
      {msg ? <p className="err">{msg}</p> : null}
      <p className="muted">Inicie a conexão quando estiver ao vivo no TikTok. Reiniciar aplica mudanças de @ / porta.</p>
    </Card>
  );
}
```

- [ ] **Step 2: `admin/src/tabs/ConfigTab.tsx`**
```tsx
import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getConfig, putConfig, putKey, type Config } from '../api';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

export function ConfigTab() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [msg, setMsg] = useState('');
  const [key, setKey] = useState('');
  const [keyMsg, setKeyMsg] = useState('');
  useEffect(() => { getConfig().then(setCfg); }, []);
  if (!cfg) return <Card title="Configuração"><p className="muted">Carregando…</p></Card>;
  const num = (k: keyof Config) => (e: ChangeEvent<HTMLInputElement>) => setCfg({ ...cfg, [k]: Number(e.target.value) });
  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await putConfig({ username: cfg.username, avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds, effectsVolume: cfg.effectsVolume, port: cfg.port });
    setMsg(r?.error ? r.error : 'Salvo ✓');
  };
  const salvarChave = async () => {
    const r = await putKey(key);
    if (!r?.error) { setKeyMsg('Chave salva ✓'); setKey(''); setCfg({ ...cfg, hasKey: true }); } else setKeyMsg(r.error);
  };
  return (
    <>
      <Card title="Configuração">
        <form onSubmit={salvar} className="grid">
          <Field label="@ do TikTok" value={cfg.username} onChange={(e) => setCfg({ ...cfg, username: e.target.value })} placeholder="seu_usuario" />
          <Field label="Limite de avatares" type="number" min={1} max={60} value={cfg.avatarLimit} onChange={num('avatarLimit')} />
          <Field label="Inatividade (s)" type="number" min={10} max={3600} value={cfg.inactivitySeconds} onChange={num('inactivitySeconds')} />
          <Field label="Volume dos efeitos" type="number" min={0} max={1} step={0.1} value={cfg.effectsVolume} onChange={num('effectsVolume')} />
          <Field label="Porta" type="number" min={1024} max={65535} value={cfg.port} onChange={num('port')} />
          <div className="row"><Button variant="primary" type="submit">Salvar</Button> <span className="muted">{msg}</span></div>
        </form>
      </Card>
      <Card title="Chave de API (Euler Stream)">
        <p className="muted">Status: {cfg.hasKey ? '✅ definida' : '⚠️ não definida'}</p>
        <div className="row">
          <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="cole sua chave" />
          <Button variant="primary" disabled={!key} onClick={salvarChave}>Salvar chave</Button> <span className="muted">{keyMsg}</span>
        </div>
      </Card>
    </>
  );
}
```

- [ ] **Step 3: `admin/src/App.tsx`** (substituir; Sprites/Terreno ainda placeholder)
```tsx
import { useState } from 'react';
import { useStatus } from './hooks/useStatus';
import { Badge } from './ui/Badge';
import { Tabs } from './ui/Tabs';
import { ConnectionTab } from './tabs/ConnectionTab';
import { ConfigTab } from './tabs/ConfigTab';

const TABS = ['Conexão', 'Configuração', 'Sprites', 'Terreno'];

export function App() {
  const status = useStatus();
  const [tab, setTab] = useState(TABS[0]);
  return (
    <div className="app">
      <header className="header"><h1>Live Avatars</h1><Badge status={status} /></header>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <main>
        {tab === 'Conexão' && <ConnectionTab status={status} />}
        {tab === 'Configuração' && <ConfigTab />}
        {tab === 'Sprites' && <p className="muted">Em breve…</p>}
        {tab === 'Terreno' && <p className="muted">Em breve…</p>}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: typecheck + build + commit**
```bash
cd admin && npm run typecheck && npm run build && cd ..
git add admin/src/App.tsx admin/src/tabs/ConnectionTab.tsx admin/src/tabs/ConfigTab.tsx admin/dist
git commit -m "feat(admin): shell com abas + Conexão + Configuração"
```

---

### Task 5: aba Sprites + aba Terreno

**Files:** Create `admin/src/tabs/SpritesTab.tsx`, `admin/src/tabs/TerrainTab.tsx`; Modify `admin/src/App.tsx`.

- [ ] **Step 1: `admin/src/tabs/SpritesTab.tsx`**
```tsx
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getSprites, saveSprite, deleteSprite, type SpriteItem } from '../api';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

function Preview({ base, id, frames }: { base: string; id: string; frames: number }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((n) => (n + 1) % frames), 250); return () => clearInterval(t); }, [frames]);
  return <img className="pixel" src={`${base}/${id}/${i + 1}.png`} width={48} height={48} alt={id} />;
}
const readDataURL = (file: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });

export function SpritesTab() {
  const [sprites, setSprites] = useState<SpriteItem[]>([]);
  const [id, setId] = useState(''); const [facing, setFacing] = useState('front'); const [scale, setScale] = useState(2);
  const [files, setFiles] = useState<File[]>([]); const [msg, setMsg] = useState('');
  const load = () => getSprites().then(setSprites);
  useEffect(() => { load(); }, []);
  const baseFor = (s: SpriteItem) => s.source === 'local' ? '/assets/characters-local' : '/assets/characters';
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const frames = await Promise.all(files.map(readDataURL));
    const r = await saveSprite({ id, scale: Number(scale), facing, frames });
    if (!r?.error) { setMsg('Adicionado ✓ (atualize a fonte no OBS)'); setId(''); setFiles([]); load(); } else setMsg(r.error);
  };
  const remove = async (sid: string) => { if (confirm(`Remover o sprite "${sid}"?`)) { await deleteSprite(sid); load(); } };
  const hasLocal = sprites.some((s) => s.source === 'local');
  return (
    <Card title="Sprites de personagem">
      <ul className="list">
        {sprites.map((s) => (
          <li key={s.id} className="row">
            <Preview base={baseFor(s)} id={s.id} frames={s.frames} />
            <span>{s.id} <small className="muted">({s.source === 'local' ? 'seu' : 'padrão'})</small></span>
            {s.source === 'local' ? <Button variant="danger" onClick={() => remove(s.id)}>Remover</Button> : null}
          </li>
        ))}
      </ul>
      {!hasLocal ? <p className="muted">Nenhum sprite seu ainda — envie PNGs abaixo.</p> : null}
      <form onSubmit={add} className="grid">
        <h3>Adicionar sprite</h3>
        <Field label="Nome (a-z, 0-9, hífen)" value={id} onChange={(e) => setId(e.target.value)} placeholder="meu-personagem" />
        <label className="field"><span>Direção da arte</span>
          <select value={facing} onChange={(e) => setFacing(e.target.value)}>
            <option value="front">frente</option><option value="left">esquerda</option><option value="right">direita</option>
          </select>
        </label>
        <Field label="Escala" type="number" min={1} max={6} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
        <label className="field"><span>Quadros (PNGs)</span>
          <input type="file" accept="image/png" multiple onChange={(e) => setFiles([...(e.target.files ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })))} />
        </label>
        <div className="row"><Button variant="primary" type="submit" disabled={!id || files.length === 0}>Adicionar ({files.length})</Button> <span className="muted">{msg}</span></div>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: `admin/src/tabs/TerrainTab.tsx`**
```tsx
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { getTerrain, saveTerrain, setActiveTerrain, deleteTerrain, type TerrainState } from '../api';
import { Card } from '../ui/Card';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';

const readDataURL = (file: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });

export function TerrainTab() {
  const [state, setState] = useState<TerrainState>({ active: null, items: [] });
  const [name, setName] = useState(''); const [file, setFile] = useState<File | null>(null); const [msg, setMsg] = useState('');
  const load = () => getTerrain().then(setState);
  useEffect(() => { load(); }, []);
  const send = async (e: FormEvent) => {
    e.preventDefault(); if (!file) return;
    const image = await readDataURL(file);
    const r = await saveTerrain({ name, image });
    if (!r?.error) { setMsg('Enviado ✓ (atualize a fonte no OBS)'); setName(''); setFile(null); load(); } else setMsg(r.error);
  };
  const use = async (f: string | null) => { await setActiveTerrain(f); load(); };
  const remove = async (f: string) => { if (confirm(`Remover "${f}"?`)) { await deleteTerrain(f); load(); } };
  return (
    <Card title="Terreno (cenário de fundo)">
      <p>Ativo: <strong>{state.active ?? 'nenhum'}</strong> {state.active ? <Button onClick={() => use(null)}>usar nenhum</Button> : null}</p>
      <ul className="list">
        {state.items.map((t) => (
          <li key={t.file} className="row">
            <img className="thumb" src={`/assets/terrain-local/${t.file}`} height={40} alt={t.file} />
            <span>{t.file}</span>
            <Button variant="primary" onClick={() => use(t.file)} disabled={state.active === t.file}>usar</Button>
            <Button variant="danger" onClick={() => remove(t.file)}>remover</Button>
          </li>
        ))}
      </ul>
      {state.items.length === 0 ? <p className="muted">Nenhum terreno ainda — envie uma imagem.</p> : null}
      <form onSubmit={send} className="grid">
        <h3>Enviar terreno</h3>
        <Field label="Nome (a-z, 0-9, hífen)" value={name} onChange={(e) => setName(e.target.value)} placeholder="grama" />
        <label className="field"><span>Imagem (PNG/JPG)</span><input type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <div className="row"><Button variant="primary" type="submit" disabled={!name || !file}>Enviar</Button> <span className="muted">{msg}</span></div>
      </form>
    </Card>
  );
}
```

- [ ] **Step 3: `admin/src/App.tsx`** — trocar os placeholders pelos imports reais:
```tsx
import { useState } from 'react';
import { useStatus } from './hooks/useStatus';
import { Badge } from './ui/Badge';
import { Tabs } from './ui/Tabs';
import { ConnectionTab } from './tabs/ConnectionTab';
import { ConfigTab } from './tabs/ConfigTab';
import { SpritesTab } from './tabs/SpritesTab';
import { TerrainTab } from './tabs/TerrainTab';

const TABS = ['Conexão', 'Configuração', 'Sprites', 'Terreno'];

export function App() {
  const status = useStatus();
  const [tab, setTab] = useState(TABS[0]);
  return (
    <div className="app">
      <header className="header"><h1>Live Avatars</h1><Badge status={status} /></header>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <main>
        {tab === 'Conexão' && <ConnectionTab status={status} />}
        {tab === 'Configuração' && <ConfigTab />}
        {tab === 'Sprites' && <SpritesTab />}
        {tab === 'Terreno' && <TerrainTab />}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: typecheck + build + commit**
```bash
cd admin && npm run typecheck && npm run build && cd ..
git add admin/src/App.tsx admin/src/tabs/SpritesTab.tsx admin/src/tabs/TerrainTab.tsx admin/dist
git commit -m "feat(admin): abas Sprites e Terreno"
```

---

### Task 6: apagar os `.jsx` antigos + verificação final

**Files:** Delete `admin/src/main.jsx`, `App.jsx`, `api.js`, `ConfigForm.jsx`, `KeyField.jsx`, `ControlPanel.jsx`, `SpriteManager.jsx`, `TerrainManager.jsx`.

- [ ] **Step 1: Apagar os arquivos antigos**
```bash
git rm admin/src/main.jsx admin/src/App.jsx admin/src/api.js admin/src/ConfigForm.jsx admin/src/KeyField.jsx admin/src/ControlPanel.jsx admin/src/SpriteManager.jsx admin/src/TerrainManager.jsx
```

- [ ] **Step 2: Verificação completa**
```bash
cd admin && npm run typecheck && npm test && npm run build && cd ..
```
Expected: typecheck sem erros, testes verdes, build ok. Confirmar que nenhum `.jsx` sobrou em `src/`:
```bash
git -C . ls-files admin/src | grep '\.jsx$' && echo "SOBROU .jsx" || echo "OK: só .tsx/.ts"
```

- [ ] **Step 3: Commit**
```bash
git add admin/dist admin/src
git commit -m "chore(admin): remove componentes .jsx antigos (migrado para TS)"
```

---

## Self-review
- **Tema escuro + tokens**: Task 1 (`theme.css`). ✓
- **API tipada + useStatus**: Task 2. ✓
- **Primitivos + testes**: Task 3. ✓
- **Header+badge+abas**: Task 4 (App). ✓
- **4 abas** (Conexão/Config/Sprites/Terreno) + Reiniciar + confirmações + estados vazios: Tasks 4–5. ✓
- **TS/tooling/build/tests**: Tasks 1–6. ✓
- **Limpeza dos .jsx**: Task 6. ✓
- **Consistência de tipos**: `Status`/`Config`/`SpriteItem`/`TerrainState`/`ApiResult` definidos em `api.ts` (Task 2) e usados igual nas abas (Tasks 4–5). ✓
- Backend/API intactos. Sem placeholders. ✓
