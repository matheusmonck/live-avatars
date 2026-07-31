# Controle de sprites (ocultar padrão + fixar por usuário) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development ou executing-plans. Steps usam checkbox (`- [ ]`).

**Goal:** Poder ocultar sprites padrão (soft/reversível) e fixar um sprite por usuário (semeado: `matheusmonck → luffy`).

**Architecture:** `characters.local.json` ganha `hidden: [ids]`; overrides usuário→sprite em `characters.json` (semeado) + `characters.local.json`. Overlay: `pickId(username, ids, overrides)` + `visibleRoster(entries, hidden)` (puras/testadas); `loadCharacters` aplica. Admin: botão ocultar/restaurar + rebuild do `admin/dist` versionado.

**Tech Stack:** Node ESM, PixiJS v8 (global), Vitest, React+TS (admin).

**Spec:** `docs/superpowers/specs/2026-07-31-sprite-control-design.md`

---

### Task 1: `characters.js` — overrides + visibleRoster + seed

**Files:** Modify `src/overlay/characters.js`; Modify `src/overlay/characters.json`; Modify `tests/characters.test.js`.

- [ ] **Step 1: Testes (falham)**

Em `tests/characters.test.js`, troque o import da linha 2 e adicione testes:
```js
import { pickId, resolveEntry, visibleRoster } from '../src/overlay/characters.js';
```
```js
test('pickId respeita override quando o alvo está no roster', () => {
  expect(pickId('matheusmonck', ['hero', 'luffy', 'cap'], { matheusmonck: 'luffy' })).toBe('luffy');
});
test('pickId ignora override quando o alvo não está no roster (cai no hash)', () => {
  const ids = ['hero', 'cap', 'dog'];
  expect(pickId('matheusmonck', ids, { matheusmonck: 'luffy' })).toBe(pickId('matheusmonck', ids));
  expect(ids).toContain(pickId('matheusmonck', ids, { matheusmonck: 'luffy' }));
});
test('visibleRoster remove ocultos', () => {
  const entries = [{ id: 'hero' }, { id: 'dog' }, { id: 'cap' }];
  expect(visibleRoster(entries, ['dog']).map((e) => e.id)).toEqual(['hero', 'cap']);
});
test('visibleRoster nunca esvazia (fallback)', () => {
  const entries = [{ id: 'hero' }, { id: 'dog' }];
  expect(visibleRoster(entries, ['hero', 'dog'])).toEqual(entries);
});
```

- [ ] **Step 2: Rodar e confirmar FAIL**

Run: `npm test -- characters`
Expected: FAIL — `visibleRoster` não existe; `pickId` ignora o 3º arg.

- [ ] **Step 3: Implementar em `src/overlay/characters.js`**

Substitua `pickId` para aceitar `overrides`:
```js
export function pickId(username, ids, overrides = {}) {
  const forced = overrides[username];
  if (forced && ids.includes(forced)) return forced;
  let h = 5381;
  for (let i = 0; i < username.length; i++)
    h = ((h << 5) + h + username.charCodeAt(i)) >>> 0;
  return ids[h % ids.length];
}
```
Adicione `visibleRoster` logo após `pickId`:
```js
// Remove ids ocultos do roster; nunca deixa vazio (trava de segurança).
export function visibleRoster(entries, hiddenIds) {
  const hidden = new Set(hiddenIds ?? []);
  const visible = entries.filter((e) => !hidden.has(e.id));
  return visible.length ? visible : entries;
}
```
Troque a linha `let roster = [];` por (adiciona `overrides`):
```js
let roster = [];                  // entradas resolvidas, populado no load
let overrides = {};               // mapa usuario -> spriteId (characters.json + local)
```
Substitua a função `fetchRoster` por `fetchJson`:
```js
async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
```
Substitua `loadCharacters` por:
```js
export async function loadCharacters() {
  const defData = (await fetchJson('characters.json')) ?? {};
  const locData = (await fetchJson('characters.local.json')) ?? {};
  const defaults = (defData.characters ?? []).map((e) => resolveEntry(e, 'assets/characters'));
  if (!defaults.length) throw new Error('characters.json ausente ou vazio');
  const locals = (locData.characters ?? []).map((e) => resolveEntry(e, 'assets/characters-local'));
  overrides = { ...(defData.overrides ?? {}), ...(locData.overrides ?? {}) };

  const byId = new Map();
  for (const e of defaults) byId.set(e.id, e);
  for (const e of locals) byId.set(e.id, e); // id local vence colisão
  roster = visibleRoster([...byId.values()], locData.hidden);

  const all = roster.flatMap(urlsFor);
  const map = await PIXI.Assets.load(all);
  for (const u of all) {
    const t = map[u];
    if (t?.source) t.source.scaleMode = 'nearest'; // pixel nítido
  }
  for (const e of roster) cache.set(e.id, urlsFor(e).map((u) => map[u]));
}
```
Substitua `characterForUser` para passar `overrides`:
```js
export function characterForUser(username) {
  return pickId(username, roster.map((e) => e.id), overrides);
}
```

- [ ] **Step 4: Semear override em `src/overlay/characters.json`**

Adicione a chave `overrides` após o array `characters` (o arquivo passa a ser):
```json
{
  "characters": [
    { "id": "hero" },
    { "id": "cap" },
    { "id": "dog" },
    { "id": "frog" },
    { "id": "girl" },
    { "id": "hood" },
    { "id": "kid" },
    { "id": "miner" },
    { "id": "oldwoman" },
    { "id": "sage" },
    { "id": "woman" }
  ],
  "overrides": { "matheusmonck": "luffy" }
}
```

- [ ] **Step 5: Rodar e confirmar PASS**

Run: `npm test -- characters`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/overlay/characters.js src/overlay/characters.json tests/characters.test.js
git commit -m "feat(characters): override usuario->sprite (matheusmonck->luffy) + visibleRoster (oculta padrão)"
```

---

### Task 2: `sprites.js` — ocultar/restaurar + flag hidden

**Files:** Modify `src/server/sprites.js`; Modify `tests/sprites.test.js`.

- [ ] **Step 1: Testes (falham)**

Em `tests/sprites.test.js`: troque o import (linha 5) e as duas assertivas do teste `'listSprites mescla...'` (linhas 18–19) para incluir `hidden: false`, e adicione novos testes:
```js
import { listSprites, saveSprite, deleteSprite, setSpriteHidden } from '../src/server/sprites.js';
```
```js
  expect(list).toContainEqual({ id: 'hero', frames: 2, scale: 2, facing: 'front', source: 'default', hidden: false });
  expect(list).toContainEqual({ id: 'robo', frames: 4, scale: 2, facing: 'front', source: 'local', hidden: false });
```
```js
test('setSpriteHidden oculta e restaura', () => {
  const dir = overlayTmp();
  setSpriteHidden('hero', true, { overlayDir: dir });
  expect(listSprites({ overlayDir: dir }).find((s) => s.id === 'hero').hidden).toBe(true);
  setSpriteHidden('hero', false, { overlayDir: dir });
  expect(listSprites({ overlayDir: dir }).find((s) => s.id === 'hero').hidden).toBe(false);
});
test('setSpriteHidden preserva os characters locais', () => {
  const dir = overlayTmp();
  saveSprite({ id: 'novo', frames: [PNG] }, { overlayDir: dir });
  setSpriteHidden('hero', true, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.characters.some((c) => c.id === 'novo')).toBe(true);
  expect(local.hidden).toContain('hero');
});
```

- [ ] **Step 2: Rodar e confirmar FAIL**

Run: `npm test -- sprites`
Expected: FAIL — `setSpriteHidden` não existe; items sem `hidden`.

- [ ] **Step 3: Implementar em `src/server/sprites.js`**

Substitua `listSprites` por:
```js
export function listSprites({ overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const def = readJson(join(base, 'characters.json'))?.characters ?? [];
  const localData = readJson(join(base, 'characters.local.json')) ?? {};
  const loc = localData.characters ?? [];
  const hidden = new Set(localData.hidden ?? []);
  const entry = (e, source) => ({ id: e.id, frames: e.frames ?? DEFAULTS.frames, scale: e.scale ?? DEFAULTS.scale, facing: e.facing ?? DEFAULTS.facing, source, hidden: hidden.has(e.id) });
  const byId = new Map();
  for (const e of def) byId.set(e.id, entry(e, 'default'));
  for (const e of loc) byId.set(e.id, entry(e, 'local'));
  return [...byId.values()];
}
```
Adicione `setSpriteHidden` (export) após `saveSprite`:
```js
export function setSpriteHidden(id, hidden, { overlayDir } = {}) {
  const base = overlayBase(overlayDir);
  const localPath = join(base, 'characters.local.json');
  const data = readJson(localPath) ?? { characters: [] };
  const set = new Set(data.hidden ?? []);
  if (hidden) set.add(id); else set.delete(id);
  data.hidden = [...set];
  writeFileSync(localPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
```
Em `deleteSprite`, adicione a limpeza do `hidden` (após a linha que filtra `data.characters`):
```js
  data.characters = data.characters.filter((c) => c.id !== id);
  data.hidden = (data.hidden ?? []).filter((h) => h !== id);
  writeFileSync(localPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npm test -- sprites`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/server/sprites.js tests/sprites.test.js
git commit -m "feat(sprites): ocultar/restaurar sprites (flag hidden em characters.local.json)"
```

---

### Task 3: `admin-api.js` — rota PUT /admin/api/sprites/hidden

**Files:** Modify `src/server/admin-api.js`; Modify `tests/admin-api.test.js`.

- [ ] **Step 1: Teste (falha)**

Em `tests/admin-api.test.js`, no `depsBase()` adicione:
```js
  setSpriteHidden: vi.fn(),
```
E adicione o teste:
```js
test('PUT /admin/api/sprites/hidden chama setSpriteHidden', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/sprites/hidden`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: 'hero', hidden: true }) });
    expect(r.status).toBe(200);
    expect(deps.setSpriteHidden).toHaveBeenCalledWith('hero', true);
  });
});
```

- [ ] **Step 2: Rodar e confirmar FAIL**

Run: `npm test -- admin-api`
Expected: FAIL — rota inexistente (404).

- [ ] **Step 3: Implementar em `src/server/admin-api.js`**

No import de sprites, acrescente `setSpriteHidden as setSpriteHiddenReal`:
```js
import { listSprites as listSpritesReal, saveSprite as saveSpriteReal, deleteSprite as deleteSpriteReal, setSpriteHidden as setSpriteHiddenReal } from './sprites.js';
```
No destructuring de deps (junto de `deleteSprite = deleteSpriteReal,`):
```js
  deleteSprite = deleteSpriteReal,
  setSpriteHidden = setSpriteHiddenReal,
```
Adicione a rota logo APÓS o handler `POST /admin/api/sprites` e ANTES do `startsWith('/admin/api/sprites/')` DELETE:
```js
    if (path === '/admin/api/sprites/hidden' && req.method === 'PUT') {
      const body = await readBody(req);
      try { setSpriteHidden(body.id, body.hidden); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npm test -- admin-api`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/server/admin-api.js tests/admin-api.test.js
git commit -m "feat(admin-api): rota PUT /sprites/hidden (ocultar/restaurar sprite)"
```

---

### Task 4: Admin — botão ocultar/restaurar + rebuild dist

**Files:** Modify `admin/src/api.ts`; Modify `admin/src/api.test.ts`; Modify `admin/src/tabs/SpritesTab.tsx`; rebuild `admin/dist`.

- [ ] **Step 1: Teste (falha de tipo)**

Em `admin/src/api.test.ts`, ajuste o import e adicione:
```ts
import { getConfig, putKey, saveSprite, putConfig, setTerrainOffset, setSpriteHidden } from './api';
```
```ts
test('setSpriteHidden manda PUT com id e hidden', async () => {
  await setSpriteHidden('hero', true);
  expect(fetch).toHaveBeenCalledWith('/admin/api/sprites/hidden', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ id: 'hero', hidden: true }),
  }));
});
```

- [ ] **Step 2: Rodar typecheck e confirmar FAIL**

Run: `npm --prefix admin run typecheck`
Expected: FAIL — `setSpriteHidden` não existe em `./api`.

- [ ] **Step 3: `admin/src/api.ts` — tipo + função**

Altere `SpriteItem`:
```ts
export interface SpriteItem { id: string; frames: number; scale: number; facing: string; source: 'default' | 'local'; hidden: boolean }
```
Adicione (junto das outras de sprites):
```ts
export const setSpriteHidden = (id: string, hidden: boolean): Promise<ApiResult> => fetch('/admin/api/sprites/hidden', jsonReq('PUT', { id, hidden })).then(asJson);
```

- [ ] **Step 4: `admin/src/tabs/SpritesTab.tsx` — botão ocultar/restaurar**

Ajuste o import:
```tsx
import { getSprites, saveSprite, deleteSprite, setSpriteHidden, type SpriteItem } from '../api';
```
Adicione o handler após `remove`:
```tsx
  const toggleHidden = async (s: SpriteItem) => { await setSpriteHidden(s.id, !s.hidden); load(); };
```
Substitua o `<li>` do map por (esmaece ocultos, mostra rótulo e troca o botão dos padrão):
```tsx
          <li key={s.id} className="row" style={s.hidden ? { opacity: 0.5 } : undefined}>
            <Preview base={baseFor(s)} id={s.id} frames={s.frames} />
            <span>{s.id} <small className="muted">({s.source === 'local' ? 'seu' : 'padrão'}{s.hidden ? ', oculto' : ''})</small></span>
            {s.source === 'local'
              ? <Button variant="danger" onClick={() => remove(s.id)}>Remover</Button>
              : <Button onClick={() => toggleHidden(s)}>{s.hidden ? 'Restaurar' : 'Ocultar'}</Button>}
          </li>
```

- [ ] **Step 5: Typecheck + testes do admin**

Run: `npm --prefix admin run typecheck` → PASS
Run: `npm --prefix admin test` → PASS

- [ ] **Step 6: Rebuild do dist + commit**

Run: `npm --prefix admin run build`
```bash
git add admin/src/api.ts admin/src/api.test.ts admin/src/tabs/SpritesTab.tsx admin/dist
git commit -m "feat(admin): ocultar/restaurar sprites padrão na aba Sprites + rebuild dist"
```

---

### Task 5: Verificação final (suítes + QA manual)

**Files:** nenhum.

- [ ] **Step 1: Suítes**

Run: `npm test` → PASS (characters, sprites, admin-api).
Run: `npm --prefix admin run typecheck` → PASS.
Run: `npm --prefix admin test` → PASS.

- [ ] **Step 2: QA manual (`npm run sim`)**

`/admin` → aba **Sprites**: um sprite padrão deve ter botão **"Ocultar"**; ao clicar, ele fica esmaecido/"(oculto)" e some da lista de sorteio no overlay após recarregar a fonte. "Restaurar" traz de volta.
Override: suba um sprite local com id **`luffy`** (aba Sprites) — a partir daí, `matheusmonck` recebe o luffy (validado por unit; no simulador não há esse usuário). Sem o sprite `luffy`, o override é ignorado (cai no hash).

- [ ] **Step 3: Concluir** — `superpowers:finishing-a-development-branch` se quiser formalizar.

## Notas
- `characters.local.json` é gitignored; `hidden`/`overrides` locais ficam só na máquina do usuário. O override semeado vive no `characters.json` (versionado).
- O /admin é servido do build versionado `admin/dist` — rebuild+commit obrigatório (Task 4, Step 6).
- Ocultar é reload-based (sem broadcast) — igual ao fluxo atual de sprites.
