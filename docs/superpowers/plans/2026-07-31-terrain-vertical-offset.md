# Ajuste vertical do terreno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Offset vertical por terreno, ajustável ao vivo por um slider no /admin (move o terreno no overlay em tempo real via WebSocket).

**Architecture:** `terrain.local.json` guarda `{ active, offsets: {file: px} }`. O slider do terreno ativo faz `PUT /admin/api/terrain/offset`, que persiste e faz `broadcast({type:'terrain', active, offset})`; o overlay reposiciona o `bgSprite`. Trocar de terreno também passa a fazer broadcast (troca ao vivo). O `/admin` é servido do build versionado `admin/dist` — rebuild+commit obrigatório.

**Tech Stack:** Node ESM, PixiJS v8 (global), Vitest, React+TS (admin).

**Spec:** `docs/superpowers/specs/2026-07-31-terrain-vertical-offset-design.md`

---

### Task 1: `terrains.js` — offset por terreno

**Files:** Modify `src/server/terrains.js`; Modify `tests/terrains.test.js`.

- [ ] **Step 1: Escrever/ajustar testes (falham)**

Em `tests/terrains.test.js`: **substitua** a asserção da linha ~21 (dentro de `'saveTerrain grava arquivo e vira ativo'`):
```js
  expect(list.items).toContainEqual({ file: 'grama.png', offset: 0 });
```
E adicione a importação de `setTerrainOffset` na linha 5:
```js
import { listTerrains, saveTerrain, setActiveTerrain, deleteTerrain, setTerrainOffset } from '../src/server/terrains.js';
```
E adicione ao final:
```js
test('setTerrainOffset grava, atualiza e clampa/arredonda', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setTerrainOffset('grama.png', -30.7, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: -31 });
  setTerrainOffset('grama.png', 99999, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 400 });
});

test('setTerrainOffset preserva o ativo', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setTerrainOffset('grama.png', 10, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).active).toBe('grama.png');
});

test('deleteTerrain remove o offset do arquivo', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setTerrainOffset('grama.png', 20, { overlayDir: dir });
  deleteTerrain('grama.png', { overlayDir: dir });
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir }); // recria com o mesmo nome
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 0 });
});
```

- [ ] **Step 2: Rodar e confirmar FAIL**

Run: `npm test -- terrains`
Expected: FAIL — `setTerrainOffset` não existe e `items` não tem `offset`.

- [ ] **Step 3: Implementar em `src/server/terrains.js`**

Substitua a função `writeState` e adicione `readState` + `clampOffset` logo após `terrainDir`:
```js
function terrainDir(base) { return join(base, 'assets/terrain-local'); }
function readState(base) {
  const s = readJson(statePath(base));
  return { active: s?.active ?? null, offsets: s?.offsets ?? {} };
}
function writeState(base, state) {
  const out = { active: state.active ?? null, offsets: state.offsets ?? {} };
  writeFileSync(statePath(base), JSON.stringify(out, null, 2) + '\n', 'utf8');
}
function clampOffset(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(400, Math.max(-400, n));
}
```
Atualize `listTerrains` para incluir o offset:
```js
export function listTerrains({ overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const st = readState(base);
  let items = [];
  try { items = readdirSync(terrainDir(base)).map((file) => ({ file, offset: st.offsets[file] ?? 0 })); } catch {}
  return { active: st.active, items };
}
```
Atualize `saveTerrain` para preservar offsets (troque a linha `writeState(base, file);`):
```js
  const st = readState(base);
  st.active = file;
  writeState(base, st);
  return { file };
```
Atualize `setActiveTerrain`:
```js
export function setActiveTerrain(file, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  if (file && !existsSync(join(terrainDir(base), file))) throw new Error('terreno não encontrado');
  const st = readState(base);
  st.active = file ?? null;
  writeState(base, st);
}
```
Adicione `setTerrainOffset` (export):
```js
export function setTerrainOffset(file, offset, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const st = readState(base);
  st.offsets[file] = clampOffset(offset);
  writeState(base, st);
}
```
Atualize `deleteTerrain` para remover o offset:
```js
export function deleteTerrain(file, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  rmSync(join(terrainDir(base), file), { force: true });
  const st = readState(base);
  if (st.active === file) st.active = null;
  delete st.offsets[file];
  writeState(base, st);
}
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npm test -- terrains`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/server/terrains.js tests/terrains.test.js
git commit -m "feat(terrains): offset vertical por terreno (persistido em terrain.local.json)"
```

---

### Task 2: `admin-api.js` — rota de offset + broadcast do frame terrain

**Files:** Modify `src/server/admin-api.js`; Modify `tests/admin-api.test.js`.

- [ ] **Step 1: Escrever testes (falham)**

Em `tests/admin-api.test.js`, no `depsBase()` adicione a linha:
```js
  setTerrainOffset: vi.fn(),
```
E adicione os testes:
```js
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
```

- [ ] **Step 2: Rodar e confirmar FAIL**

Run: `npm test -- admin-api`
Expected: FAIL — rota de offset inexistente; setActive não faz broadcast.

- [ ] **Step 3: Adicionar `setTerrainOffset` às deps de `createAdminApi`**

No import do topo de `src/server/admin-api.js`, acrescente `setTerrainOffset as setTerrainOffsetReal`:
```js
import { listTerrains as listTerrainsReal, saveTerrain as saveTerrainReal, setActiveTerrain as setActiveTerrainReal, deleteTerrain as deleteTerrainReal, setTerrainOffset as setTerrainOffsetReal } from './terrains.js';
```
E no destructuring de deps (junto de `deleteTerrain = deleteTerrainReal,`):
```js
  deleteTerrain = deleteTerrainReal,
  setTerrainOffset = setTerrainOffsetReal,
```

- [ ] **Step 4: Broadcast no setActive + rota de offset**

Substitua o handler de `PUT /admin/api/terrain/active` por (adiciona o broadcast):
```js
    if (path === '/admin/api/terrain/active' && req.method === 'PUT') {
      const body = await readBody(req);
      try {
        setActiveTerrain(body.active ?? null);
        const { active, items } = listTerrains();
        const offset = items.find((i) => i.file === active)?.offset ?? 0;
        bridge.broadcast({ type: 'terrain', active, offset });
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/terrain/offset' && req.method === 'PUT') {
      const body = await readBody(req);
      try {
        setTerrainOffset(body.file, body.offset);
        const { active, items } = listTerrains();
        const offset = items.find((i) => i.file === active)?.offset ?? 0;
        bridge.broadcast({ type: 'terrain', active, offset });
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
```
(Coloque a rota `/terrain/offset` logo após a `/terrain/active`, ANTES da rota DELETE `startsWith('/admin/api/terrain/')`.)

- [ ] **Step 5: Rodar e confirmar PASS**

Run: `npm test -- admin-api`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/server/admin-api.js tests/admin-api.test.js
git commit -m "feat(admin-api): rota PUT /terrain/offset + broadcast do frame terrain (ativo/offset)"
```

---

### Task 3: Overlay aplica o terreno ao vivo (`scene.js` + `overlay.js`)

**Files:** Modify `src/overlay/scene.js`; Modify `src/overlay/overlay.js`.

- [ ] **Step 1: `scene.js` — offset + applyTerrain**

Substitua o bloco `let bgSprite = null;` ... `app.renderer.on('resize', layoutBackground);` por:
```js
  let bgSprite = null;
  let bgOffset = 0;
  let currentActive = null;
  function layoutBackground() {
    if (!bgSprite) return;
    const scale = app.screen.width / bgSprite.texture.width;
    bgSprite.scale.set(scale);
    bgSprite.x = 0;
    bgSprite.y = app.screen.height - bgSprite.height + bgOffset; // rodapé + ajuste vertical
  }
  async function setBackground(url) {
    if (bgSprite) { bgSprite.destroy(); bgSprite = null; }
    if (!url) return;
    const tex = await PIXI.Assets.load(url);
    bgSprite = new PIXI.Sprite(tex);
    backgroundLayer.addChild(bgSprite);
    layoutBackground();
  }
  function setTerrainOffset(px) { bgOffset = Number(px) || 0; layoutBackground(); }
  async function applyTerrain({ active = null, offset = 0 } = {}) {
    if (active !== currentActive) {
      currentActive = active;
      await setBackground(active ? 'assets/terrain-local/' + active : null);
    }
    setTerrainOffset(offset);
  }
  app.renderer.on('resize', layoutBackground);
```
E no `return`, adicione `setTerrainOffset, applyTerrain`:
```js
  return { app, backgroundLayer, groundLayer, effectsLayer, highlightLayer, groundLine, highlightPoint, setBackground, setTerrainOffset, applyTerrain };
```

- [ ] **Step 2: `overlay.js` — load com offset + handler WS**

Substitua o bloco `try { const res = await fetch('terrain.local.json'); ... } catch {}` por:
```js
try {
  const res = await fetch('terrain.local.json');
  if (res.ok) {
    const t = await res.json();
    await scene.applyTerrain({ active: t?.active ?? null, offset: t?.offsets?.[t?.active] ?? 0 });
  }
} catch {}
```
E no `connectWS({ onEvent: (event) => { ... } })`, adicione o roteamento do frame `terrain`:
```js
  onEvent: (event) => {
    if (event.type === 'config') { manager.configure(event); return; }
    if (event.type === 'terrain') { scene.applyTerrain(event); return; }
    manager.handle(event);
  },
```

- [ ] **Step 3: Sanidade — suíte do root**

Run: `npm test`
Expected: PASS (esses arquivos não têm teste unitário direto; verificação visual na Task 5).

- [ ] **Step 4: Commit**
```bash
git add src/overlay/scene.js src/overlay/overlay.js
git commit -m "feat(overlay): aplica offset do terreno ao vivo (frame terrain + applyTerrain)"
```

---

### Task 4: Admin — API tipada + slider + rebuild do dist

**Files:** Modify `admin/src/api.ts`; Modify `admin/src/api.test.ts`; Modify `admin/src/tabs/TerrainTab.tsx`; rebuild `admin/dist`.

- [ ] **Step 1: Teste de `setTerrainOffset` em `admin/src/api.test.ts` (falha de tipo)**

Ajuste o import e adicione o teste:
```ts
import { getConfig, putKey, saveSprite, putConfig, setTerrainOffset } from './api';
```
```ts
test('setTerrainOffset manda PUT com file e offset', async () => {
  await setTerrainOffset('grama.png', -30);
  expect(fetch).toHaveBeenCalledWith('/admin/api/terrain/offset', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ file: 'grama.png', offset: -30 }),
  }));
});
```

- [ ] **Step 2: Rodar typecheck e confirmar FAIL**

Run: `npm --prefix admin run typecheck`
Expected: FAIL — `setTerrainOffset` não existe em `./api`.

- [ ] **Step 3: `admin/src/api.ts` — tipo + função**

Altere o tipo `TerrainState`:
```ts
export interface TerrainState { active: string | null; items: { file: string; offset: number }[] }
```
Adicione a função (junto das outras de terreno):
```ts
export const setTerrainOffset = (file: string, offset: number): Promise<ApiResult> => fetch('/admin/api/terrain/offset', jsonReq('PUT', { file, offset })).then(asJson);
```

- [ ] **Step 4: `admin/src/tabs/TerrainTab.tsx` — slider do terreno ativo**

Adicione `setTerrainOffset` ao import:
```tsx
import { getTerrain, saveTerrain, setActiveTerrain, deleteTerrain, setTerrainOffset, type TerrainState } from '../api';
```
Adicione um estado de offset e ajuste o `load`:
```tsx
  const [offset, setOffset] = useState(0);
  const load = () => getTerrain().then((s) => { setState(s); setOffset(s.items.find((i) => i.file === s.active)?.offset ?? 0); });
```
(remova o `const load = () => getTerrain().then(setState);` antigo — é substituído pelo acima.)

Adicione o slider logo após o parágrafo `Ativo: ...` (dentro do `<Card>`, antes do `<ul className="list">`):
```tsx
      {state.active ? (
        <label className="field">
          <span>Ajuste vertical: {offset}px</span>
          <input type="range" min={-400} max={400} value={offset}
            onChange={(e) => { const v = Number(e.target.value); setOffset(v); setTerrainOffset(state.active!, v); }} />
        </label>
      ) : null}
```

- [ ] **Step 5: Typecheck + testes do admin**

Run: `npm --prefix admin run typecheck` → PASS
Run: `npm --prefix admin test` → PASS

- [ ] **Step 6: Rebuild do dist (o /admin é servido do build) + commit**

Run: `npm --prefix admin run build`
```bash
git add admin/src/api.ts admin/src/api.test.ts admin/src/tabs/TerrainTab.tsx admin/dist
git commit -m "feat(admin): slider de ajuste vertical do terreno (ao vivo) + rebuild dist"
```

---

### Task 5: Verificação final (suítes + QA manual)

**Files:** nenhum.

- [ ] **Step 1: Suítes**

Run: `npm test` → PASS (inclui terrains, admin-api).
Run: `npm --prefix admin run typecheck` → PASS.
Run: `npm --prefix admin test` → PASS.

- [ ] **Step 2: QA manual (`npm run sim`)**

Abra `http://localhost:8737/admin`, aba **Terreno**: envie/ative um terreno. Deve aparecer o slider "Ajuste vertical". Abra o overlay `http://localhost:8737` numa aba ao lado. Arraste o slider e confirme que o terreno **sobe/desce ao vivo** no overlay até a superfície bater no pé dos avatares. Troque o terreno ativo e confirme que o overlay atualiza (imagem + offset lembrado) sem recarregar.

- [ ] **Step 3: Concluir**

Use `superpowers:finishing-a-development-branch` se desejar formalizar merge/PR.

## Notas
- O `/admin` é servido do build versionado `admin/dist` — mudança no fonte do painel EXIGE `npm --prefix admin run build` + commit do dist (Task 4, Step 6).
- `terrain.local.json` é gitignored (runtime local) — não é commitado.
- O overlay já repassa qualquer frame WS pro `onEvent` (ws-client.js), então o frame `terrain` chega sem mudança no cliente WS.
