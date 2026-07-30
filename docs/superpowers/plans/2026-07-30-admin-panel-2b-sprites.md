# Peça 2b — Gerenciador de sprites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Adicionar/ver/remover sprites de personagem pelo Painel, sem editar código.

**Architecture:** Módulo `sprites.js` (list/save/delete lendo/gravando `characters.json` + `characters.local.json` + `assets/characters-local/`), rotas na `admin-api`, e um `SpriteManager.jsx` no painel (preview animado client-side, upload por base64).

**Tech Stack:** Node ESM, Vitest, React+Vite.

**Regras:** Branch `feat/mvp`; commits **sem** co-author; `git add` específico (nunca `-A`); backend TDD; frontend build+manual.

---

### Task 1: `sprites.js` (list/save/delete)

**Files:** Create `src/server/sprites.js`; Test `tests/sprites.test.js`.

- [ ] **Step 1: Escrever `tests/sprites.test.js`** (RED)
```js
import { test, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSprites, saveSprite, deleteSprite } from '../src/server/sprites.js';

function overlayTmp() {
  const dir = mkdtempSync(join(tmpdir(), 'ov-'));
  writeFileSync(join(dir, 'characters.json'), JSON.stringify({ characters: [{ id: 'hero' }] }));
  return dir;
}
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

test('listSprites mescla default + local com source', () => {
  const dir = overlayTmp();
  writeFileSync(join(dir, 'characters.local.json'), JSON.stringify({ characters: [{ id: 'robo', frames: 4 }] }));
  const list = listSprites({ overlayDir: dir });
  expect(list).toContainEqual({ id: 'hero', frames: 2, scale: 2, facing: 'front', source: 'default' });
  expect(list).toContainEqual({ id: 'robo', frames: 4, scale: 2, facing: 'front', source: 'local' });
});

test('saveSprite grava PNGs, conta frames e upserta o json', () => {
  const dir = overlayTmp();
  saveSprite({ id: 'novo', facing: 'left', frames: [PNG, PNG, PNG] }, { overlayDir: dir });
  expect(existsSync(join(dir, 'assets/characters-local/novo/1.png'))).toBe(true);
  expect(existsSync(join(dir, 'assets/characters-local/novo/3.png'))).toBe(true);
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.characters).toContainEqual({ id: 'novo', frames: 3, facing: 'left' });
});

test('saveSprite rejeita id inválido e frames vazio', () => {
  const dir = overlayTmp();
  expect(() => saveSprite({ id: '../x', frames: [PNG] }, { overlayDir: dir })).toThrow();
  expect(() => saveSprite({ id: 'ok', frames: [] }, { overlayDir: dir })).toThrow();
});

test('deleteSprite remove só local; recusa padrão', () => {
  const dir = overlayTmp();
  saveSprite({ id: 'novo', frames: [PNG] }, { overlayDir: dir });
  deleteSprite('novo', { overlayDir: dir });
  expect(existsSync(join(dir, 'assets/characters-local/novo'))).toBe(false);
  expect(() => deleteSprite('hero', { overlayDir: dir })).toThrow();
});
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/sprites.test.js` → FAIL.

- [ ] **Step 3: Escrever `src/server/sprites.js`**
```js
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
  const loc = readJson(join(base, 'characters.local.json'))?.characters ?? [];
  const entry = (e, source) => ({ id: e.id, frames: e.frames ?? DEFAULTS.frames, scale: e.scale ?? DEFAULTS.scale, facing: e.facing ?? DEFAULTS.facing, source });
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

export function deleteSprite(id, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const localPath = join(base, 'characters.local.json');
  const data = readJson(localPath) ?? { characters: [] };
  if (!(data.characters ?? []).some((c) => c.id === id)) throw new Error('sprite padrão não pode ser removido');
  data.characters = data.characters.filter((c) => c.id !== id);
  writeFileSync(localPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  rmSync(join(base, 'assets/characters-local', id), { recursive: true, force: true });
}
```

- [ ] **Step 4: Rodar e commitar** — Run: `npm test` → PASS.
```bash
git add src/server/sprites.js tests/sprites.test.js
git commit -m "feat: sprites.js (listar/salvar/remover sprites locais)"
```

---

### Task 2: Rotas de sprites na `admin-api`

**Files:** Modify `src/server/admin-api.js`; Modify `tests/admin-api.test.js`.

- [ ] **Step 1: Acrescentar testes em `tests/admin-api.test.js`** (dentro do arquivo existente; adicionar ao `depsBase()` os fakes de sprites e novos testes):
```js
// no objeto depsBase(), acrescentar:
//   listSprites: () => [{ id: 'hero', frames: 2, scale: 2, facing: 'front', source: 'default' }],
//   saveSprite: vi.fn(),
//   deleteSprite: vi.fn(),

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
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/admin-api.test.js` → FAIL.

- [ ] **Step 3: Editar `src/server/admin-api.js`** — (a) importar e injetar os deps de sprites; (b) adicionar as rotas.
No import, adicionar `import { listSprites as listSpritesReal, saveSprite as saveSpriteReal, deleteSprite as deleteSpriteReal } from './sprites.js';` e nos parâmetros de `createAdminApi`: `listSprites = listSpritesReal, saveSprite = saveSpriteReal, deleteSprite = deleteSpriteReal`.
Dentro de `route(...)`, antes do `return json(res, 404, ...)` final, adicionar:
```js
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
```

- [ ] **Step 4: Rodar e commitar** — Run: `npm test` → PASS.
```bash
git add src/server/admin-api.js tests/admin-api.test.js
git commit -m "feat: rotas de sprites na admin-api (list/save/delete)"
```

---

### Task 3: `SpriteManager.jsx` no painel

**Files:** Modify `admin/src/api.js`; Create `admin/src/SpriteManager.jsx`; Modify `admin/src/App.jsx`; Rebuild `admin/dist`.

- [ ] **Step 1: Adicionar ao `admin/src/api.js`** (no fim):
```js
export const getSprites = () => fetch('/admin/api/sprites').then(j);
export const saveSprite = (sprite) =>
  fetch('/admin/api/sprites', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sprite) }).then(j);
export const deleteSprite = (id) =>
  fetch(`/admin/api/sprites/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(j);
```

- [ ] **Step 2: Criar `admin/src/SpriteManager.jsx`**
```jsx
import { useState, useEffect } from 'react';
import { getSprites, saveSprite, deleteSprite } from './api.js';

function Preview({ base, id, frames }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % frames), 250);
    return () => clearInterval(t);
  }, [frames]);
  return <img src={`${base}/${id}/${i + 1}.png`} width="48" height="48" style={{ imageRendering: 'pixelated' }} alt={id} />;
}

function readAsDataURL(file) {
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
}

export function SpriteManager() {
  const [sprites, setSprites] = useState([]);
  const [id, setId] = useState('');
  const [facing, setFacing] = useState('front');
  const [scale, setScale] = useState(2);
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');

  const load = () => getSprites().then(setSprites);
  useEffect(() => { load(); }, []);

  const onFiles = (e) => setFiles([...e.target.files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
  const baseFor = (s) => s.source === 'local' ? '/assets/characters-local' : '/assets/characters';

  const adicionar = async (e) => {
    e.preventDefault();
    const frames = await Promise.all(files.map(readAsDataURL));
    const r = await saveSprite({ id, scale: Number(scale), facing, frames });
    if (r.ok) { setMsg('Adicionado! Atualize a fonte de navegador no OBS pra ver.'); setId(''); setFiles([]); load(); }
    else setMsg(r.error || 'Erro');
  };
  const remover = async (sid) => { await deleteSprite(sid); load(); };

  return (
    <section>
      <h2>Sprites de personagem</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '.5rem' }}>
        {sprites.map((s) => (
          <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <Preview base={baseFor(s)} id={s.id} frames={s.frames} />
            <span>{s.id} <small>({s.source === 'local' ? 'seu' : 'padrão'})</small></span>
            {s.source === 'local' ? <button onClick={() => remover(s.id)}>Remover</button> : null}
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar}>
        <h3>Adicionar sprite</h3>
        <label>Nome (a-z, 0-9, hífen)<input value={id} onChange={(e) => setId(e.target.value)} placeholder="meu-personagem" /></label>
        <label>Direção da arte
          <select value={facing} onChange={(e) => setFacing(e.target.value)}>
            <option value="front">frente</option><option value="left">esquerda</option><option value="right">direita</option>
          </select>
        </label>
        <label>Escala<input type="number" min="1" max="6" step="1" value={scale} onChange={(e) => setScale(e.target.value)} /></label>
        <label>Quadros (PNGs)<input type="file" accept="image/png" multiple onChange={onFiles} /></label>
        <button type="submit" disabled={!id || files.length === 0}>Adicionar ({files.length} quadros)</button> <span>{msg}</span>
      </form>
    </section>
  );
}
```

- [ ] **Step 3: Atualizar `admin/src/App.jsx`** — adicionar `<SpriteManager />` no fim:
```jsx
import { ConfigForm } from './ConfigForm.jsx';
import { KeyField } from './KeyField.jsx';
import { ControlPanel } from './ControlPanel.jsx';
import { SpriteManager } from './SpriteManager.jsx';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 560, margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1.5rem' }}>
      <h1>Live Avatars — Painel</h1>
      <ControlPanel />
      <KeyField />
      <ConfigForm />
      <SpriteManager />
    </main>
  );
}
```

- [ ] **Step 4: Rebuild + commit**
```bash
cd admin && npm run build && cd ..
git add admin/src admin/dist
git commit -m "feat: gerenciador de sprites no painel (lista, preview, adicionar, remover)"
```
Verificar: `git ls-files admin/ | grep node_modules && echo PROBLEMA || echo OK`.

---

## Self-review
- **Backend list/save/delete + validação + só-local**: Task 1. ✓
- **Rotas GET/POST/DELETE**: Task 2. ✓
- **Frontend lista/preview/adicionar/remover + base64**: Task 3. ✓
- **Consistência**: `listSprites/saveSprite/deleteSprite({overlayDir})`; rotas `/admin/api/sprites[/:id]`; entrada `{id,scale,facing,frames}`; `source` `default|local`. ✓
- Sem placeholders. ✓
