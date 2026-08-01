# Editar escala de sprite (sem re-upload) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development / TDD.

**Goal:** Ajustar a escala de um sprite local já adicionado sem reenviar PNGs, pelo painel.

**Tech Stack:** Node ESM, React+TS, Vitest.

---

## Task 1: servidor — `setSpriteScale` + rota + testes (TDD)

**Files:** Modify `src/server/sprites.js`, `src/server/admin-api.js`; Test `tests/sprites.test.js`, `tests/admin-api.test.js`.

- [ ] Testes primeiro:
  - `tests/sprites.test.js` (seguir o setup temp já usado lá): após ter um sprite local (via `saveSprite` com 1 PNG data-url), `setSpriteScale(id, 4)` faz o `characters.local.json` ter esse `id` com `scale: 4`; `setSpriteScale(id, 2)` (default) remove o campo `scale`; `setSpriteScale('inexistente', 3)` lança; `setSpriteScale(id, 0)` lança.
  - `tests/admin-api.test.js`: `PUT /admin/api/sprites/scale` chama `setSpriteScale` (mock injetado) e retorna 200; retorna 400 quando o mock lança.
- [ ] RED: `npx vitest run tests/sprites.test.js tests/admin-api.test.js`.
- [ ] `sprites.js`: implementar `setSpriteScale(id, scale, { overlayDir } = {})` conforme spec (usa `DEFAULTS.scale`, mesmo `readJson`/`writeFileSync` do arquivo). Exportar.
- [ ] `admin-api.js`: importar `setSpriteScale as setSpriteScaleReal` de `./sprites.js`, adicionar à lista de deps injetáveis, e a rota `if (path === '/admin/api/sprites/scale' && req.method === 'PUT') { const body = await readBody(req); try { setSpriteScale(body.id, body.scale); return json(res, 200, { ok: true }); } catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); } }` (colocar junto do bloco de sprites, antes do DELETE por `startsWith`).
- [ ] GREEN: `npx vitest run`.
- [ ] Commit: `feat(sprites): setSpriteScale + rota PUT /sprites/scale`.

## Task 2: painel — controle de escala

**Files:** Modify `admin/src/api.ts`, `admin/src/tabs/SpritesTab.tsx`.

- [ ] `api.ts`: `export const setSpriteScale = (id: string, scale: number): Promise<ApiResult> => fetch('/admin/api/sprites/scale', jsonReq('PUT', { id, scale })).then(asJson);`
- [ ] `SpritesTab.tsx`: para cada sprite com `s.source === 'local'`, adicionar (na `<li>`, junto do botão Remover) um input de escala: `<input type="number" min={1} max={6} step={0.5} defaultValue={s.scale} className="input" style={{ width: 64 }} onBlur={(e) => changeScale(s.id, Number(e.target.value))} title="escala" />`. Adicionar `changeScale = async (id, scale) => { const r = await setSpriteScale(id, scale); setMsg(r?.error ? r.error : 'Escala salva ✓ (atualize a fonte no OBS)'); load(); }`. Importar `setSpriteScale` de `../api`.
- [ ] `npm --prefix admin run typecheck` + `npm --prefix admin test` verdes.
- [ ] Commit: `feat(admin): editar escala de sprite local na aba Sprites`.

## Task 3: rebuild dist + verificação

- [ ] `npm --prefix admin run build`; `git add -A admin/dist && git commit -m "build(admin): rebuild dist com edição de escala"`.
- [ ] `npx vitest run` + `npm --prefix admin test` verdes; `git status --short` só com `config/config.json`.
