# Regras de aparição (só quem interage + limite de corações) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development / TDD. Steps use `- [ ]`.

**Goal:** Só aparece quem interage (comentário/presente na hora; coração ao somar N, padrão 10); ajustável no painel; VIP é exceção.

**Architecture:** Config `onlyInteractors` + `likeThreshold` (server, propagados ao overlay via frame `config`). Gate de spawn no `avatar-manager`. Toggle + número no ConfigTab.

**Tech Stack:** Node ESM, PixiJS, React+TS, Vitest.

---

## Task 1: config.js — campos novos + propagação no servidor (TDD)

**Files:** Modify `src/server/config.js`, `src/server/index.js`, `src/server/admin-api.js`; Test `tests/config.test.js`.

- [ ] Testes primeiro em `tests/config.test.js`: `DEFAULT_CONFIG.onlyInteractors === true` e `.likeThreshold === 10`; `validateConfig({ soQuemInterage:false, coracoesParaAparecer:25, ... })` → `{ onlyInteractors:false, likeThreshold:25 }`; `coracoesParaAparecer` fora de 1..1000 é clampado; `toRawConfig` inclui `soQuemInterage`/`coracoesParaAparecer`. (Seguir os testes já existentes no arquivo.)
- [ ] RED: `npx vitest run tests/config.test.js`.
- [ ] `config.js`: adicionar em `DEFAULT_CONFIG`: `onlyInteractors: true, likeThreshold: 10`. Em `validateConfig`: `onlyInteractors: bool(raw.soQuemInterage, DEFAULT_CONFIG.onlyInteractors)`, `likeThreshold: Math.round(clamp(raw.coracoesParaAparecer, 1, 1000, DEFAULT_CONFIG.likeThreshold))`. Em `toRawConfig`: `soQuemInterage: en.onlyInteractors, coracoesParaAparecer: en.likeThreshold`.
- [ ] `index.js`: no `ws.send` do frame `config` (dentro do `createBridge(... (ws) => {...})`), incluir `onlyInteractors: c.onlyInteractors, likeThreshold: c.likeThreshold`.
- [ ] `admin-api.js`: no `bridge.broadcast({ type:'config', ... })` do `PUT /admin/api/config`, incluir `onlyInteractors: cfg.onlyInteractors, likeThreshold: cfg.likeThreshold`.
- [ ] GREEN: `npx vitest run` (suíte toda).
- [ ] Commit: `feat(config): onlyInteractors + likeThreshold (propagados ao overlay)`.

## Task 2: overlay — gate de spawn + contagem de corações

**Files:** Modify `src/overlay/avatar-manager.js`, `src/overlay/overlay.js`.

- [ ] `avatar-manager.js`:
  - `settings` (objeto já existente) ganha `onlyInteractors: cfg.onlyInteractors !== false` e `likeThreshold: Number.isFinite(cfg.likeThreshold) ? cfg.likeThreshold : 10`.
  - Adicionar `const likeCounts = new Map();` junto de `visuals`.
  - Mudar `ensure(event)` para `ensure(event, canSpawn)`: primeira linha `if (!canSpawn && !registry.has(event.username)) return null;` (resto igual). Atualizar `ensureVips` para `ensure({ type:'vip', username:u }, true)`.
  - Adicionar:
    ```js
    function shouldSpawn(event) {
      if (!settings.onlyInteractors) return true;
      if (event.type === 'comment' || event.type === 'gift') return true;
      if (event.type === 'like') return (likeCounts.get(event.username) ?? 0) >= settings.likeThreshold;
      return false;
    }
    ```
  - Reescrever `handle(event)`:
    ```js
    function handle(event) {
      if (event.type === 'like') likeCounts.set(event.username, (likeCounts.get(event.username) ?? 0) + (Number(event.count) || 1));
      const v = ensure(event, shouldSpawn(event));
      if (!v) return;
      if (THROTTLED_TYPES.has(event.type) && !throttle.allow(event.type + ':' + event.username)) return;
      switch (event.type) {
        case 'comment': v.jump(); break;
        case 'join': break;
        case 'like': R.reactionHearts(scene, v); break;
        case 'follow': R.reactionFollow(scene, v, event.name || event.username, { stage: settings.stageMode }); break;
        case 'share': R.reactionStars(scene, v); break;
        case 'gift': R.reactionGift(scene, v, event, { stage: settings.stageMode }); break;
      }
    }
    ```
  - Em `configure(newCfg)`: adicionar `if (typeof newCfg.onlyInteractors === 'boolean') settings.onlyInteractors = newCfg.onlyInteractors;` e `if (Number.isFinite(newCfg.likeThreshold)) settings.likeThreshold = newCfg.likeThreshold;`.
- [ ] `overlay.js`: `DEFAULT_CONFIG` ganha `onlyInteractors: true, likeThreshold: 10`.
- [ ] `npx vitest run` (suíte toda) verde (não deve quebrar — avatar-manager não tem teste unitário; confirmar que nada mais regrediu).
- [ ] Commit: `feat(overlay): só quem interage aparece (limiar de corações)`.

## Task 3: painel — ConfigTab

**Files:** Modify `admin/src/api.ts`, `admin/src/tabs/ConfigTab.tsx`.

- [ ] `api.ts`: em `Config`, adicionar `onlyInteractors: boolean; likeThreshold: number;`.
- [ ] `ConfigTab.tsx`: no `<form>`, adicionar (perto do "Modo palco"):
  - `<Field label="Só quem interage (comentário, coração, presente)" type="checkbox" checked={cfg.onlyInteractors} onChange={check('onlyInteractors')} />`
  - `<Field label="Corações para aparecer" type="number" min={1} max={1000} value={cfg.likeThreshold} onChange={num('likeThreshold')} />`
  - Incluir `onlyInteractors: cfg.onlyInteractors, likeThreshold: cfg.likeThreshold` no objeto passado a `putConfig(...)`.
- [ ] `npm --prefix admin run typecheck` + `npm --prefix admin test` verdes.
- [ ] Commit: `feat(admin): controles 'só quem interage' + corações para aparecer`.

## Task 4: rebuild dist + verificação final

- [ ] `npm --prefix admin run build`; `git add -A admin/dist && git commit -m "build(admin): rebuild dist com regras de aparição"`.
- [ ] `npx vitest run` e `npm --prefix admin test` verdes; `git status --short` só com `config/config.json`.
