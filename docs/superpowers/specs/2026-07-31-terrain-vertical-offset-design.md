# Ajuste vertical do terreno (offset por terreno, ao vivo)

**Data:** 2026-07-31
**Status:** aprovado (brainstorming)

## Contexto

O terreno de fundo nem sempre alinha com o pé dos avatares. `src/overlay/scene.js` ancora a imagem no rodapé (`bgSprite.y = app.screen.height - bgSprite.height`), mas os avatares pisam em `groundLine() = app.screen.height - 90`. Cada PNG tem a linha do chão numa altura diferente, então a superfície raramente cai nos 90px. O estado do terreno (`terrain.local.json`, gitignored) hoje guarda só `{ active }`, e o overlay lê esse arquivo apenas no carregamento (trocar terreno exige recarregar a fonte no OBS).

## Objetivo

Um **offset vertical por terreno**, ajustável **ao vivo** por um slider no /admin: arrastar move o terreno no overlay (fonte do OBS) em tempo real, via WebSocket. Cada terreno lembra o próprio offset.

## Modelo de dados

`terrain.local.json` passa a ser `{ active, offsets: { <file>: <int px> } }`. Retrocompatível: `offsets` ausente → `{}`; offset ausente de um arquivo → `0`. Offset clampado a inteiro em **−400..400**.

## Fluxo de dados (ao vivo)

Slider do terreno **ativo** no /admin → `PUT /admin/api/terrain/offset { file, offset }` → persiste + `bridge.broadcast({ type: 'terrain', active, offset })` → overlay reposiciona o terreno na hora. Trocar de terreno (`PUT /admin/api/terrain/active`) também passa a fazer broadcast do frame `terrain` (troca ao vivo, bônus). No load, o overlay lê `active` + `offsets[active]` do `terrain.local.json`.

## Componentes

### Servidor — `src/server/terrains.js`
- `setTerrainOffset(file, offset, { overlayDir })` — grava o offset (inteiro, clamp −400..400) no mapa `offsets` do `terrain.local.json`, preservando `active` e as demais entradas.
- `listTerrains()` passa a devolver `items: [{ file, offset }]` (offset default 0), mantendo `active`.
- `deleteTerrain(file)` também remove a entrada `offsets[file]`.
- `saveTerrain` inalterado (novo terreno = offset 0 por ausência).
- Helper interno `writeState(base, active, offsets)` atualizado pra escrever os dois campos.

### Servidor — `src/server/admin-api.js`
- Rota nova `PUT /admin/api/terrain/offset` `{ file, offset }` → `setTerrainOffset` + `bridge.broadcast({ type: 'terrain', active: <ativo atual>, offset })`.
- `PUT /admin/api/terrain/active` passa a também `bridge.broadcast({ type: 'terrain', active, offset: <offset do novo ativo> })`.

### Overlay — `src/overlay/scene.js`
- `bgOffset` (px). `layoutBackground()` usa `bgSprite.y = app.screen.height - bgSprite.height + bgOffset`.
- `setTerrainOffset(px)` — só atualiza `bgOffset` e re-layout (sem recarregar imagem → drag suave).
- `applyTerrain({ active, offset })` — recarrega a imagem só se `active` mudou (guarda `currentActive`); depois aplica o offset. Trata `active` nulo (limpa o fundo).
- Exporta `applyTerrain` (e mantém `setBackground` internamente).

### Overlay — `src/overlay/overlay.js`
- No load, lê `t.active` + `t.offsets?.[t.active] ?? 0` do `terrain.local.json` e chama `scene.applyTerrain({ active, offset })`.
- Handler WS: `event.type === 'terrain'` → `scene.applyTerrain(event)`.

### Admin — `admin/src/api.ts` + `admin/src/tabs/TerrainTab.tsx`
- `TerrainState.items: { file: string; offset: number }[]`.
- `setTerrainOffset(file, offset): Promise<ApiResult>` → `PUT /admin/api/terrain/offset`.
- TerrainTab: slider "Ajuste vertical" (−400..400, mostra o valor em px) **para o terreno ativo**; `onChange` chama `setTerrainOffset(active, valor)` ao vivo. Sem terreno ativo, sem slider.
- Rebuild do `admin/dist` + commit (o `/admin` é servido do build).

## Testes
- `tests/terrains.test.js`: `setTerrainOffset` grava/atualiza/clampa (fora de faixa e não-inteiro); `listTerrains` devolve items com `offset` (e o teste existente vira `{ file, offset: 0 }`); `deleteTerrain` remove o offset.
- `tests/admin-api.test.js`: `PUT /admin/api/terrain/offset` chama `setTerrainOffset` e faz `broadcast` de `{ type:'terrain', ... }`; `PUT /terrain/active` faz broadcast do frame `terrain`.
- `admin/src/api.test.ts`: `setTerrainOffset` manda o PUT certo com o corpo.
- Manual (`npm run sim`): ativar um terreno, arrastar o slider e ver o chão subir/descer até bater no pé dos avatares; confirmar que troca de terreno atualiza ao vivo.

## Fora de escopo
- Slider por item (só o ativo tem slider; offset dos demais é aplicado quando ativados).
- Ajuste horizontal ou de escala do terreno.
- Tornar upload de terreno ao vivo (segue exigindo o fluxo atual).
