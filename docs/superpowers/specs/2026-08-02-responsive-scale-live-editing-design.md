# Escala responsiva (vertical + horizontal) + edição ao vivo de tudo

Data: 2026-08-02
Status: aprovado.

Contexto: as lives do TikTok são verticais (9:16, 1080×1920). Hoje tudo no overlay é
pixel absoluto calibrado pro 16:9, então no vertical os avatares ficam pequenos e a
faixa de terreno fica descalibrada. Além disso, quase nada é editável **ao vivo** — a
maioria dos ajustes exige recarregar a fonte do OBS. Queremos: (1) o overlay proporcional
e agnóstico de formato (vertical **e** horizontal no mesmo servidor); (2) **tudo que muda a
aparência** editável ao vivo, sem reload.

Supersede parcialmente `2026-08-01-edit-sprite-scale-design.md` (agora escala vale pra
**todos** os sprites e aplica **ao vivo**) e `2026-08-01-overlay-vertical-9x16-design.md`
(agora há tuning de escala de fato, não só documentação).

## Decisões

- **Resolução de referência 1080×1920.** `uiScale = screen.height / 1920`. Amarrar à
  **altura** faz o mesmo overlay servir vertical (fator 1.0) e horizontal 1920×1080
  (fator 0.5625) mantendo a proporção — **sem 2º servidor**; o formato é a dimensão da
  fonte no OBS.
- **Regra:** posições usam o canvas real (`app.screen.*`); tamanhos = base × `uiScale`.
  Frações de altura já existentes (`highlightPoint` 0.28, banner 0.15) ficam como estão.
- **Escala do avatar em dois níveis, ambos ao vivo:** `efetiva = entry.scale × globalAvatarScale × uiScale`.
  `entry.scale` = diferença **por sprite**; `globalAvatarScale` = multiplicador **global** (config).
- **Tudo ao vivo** via WebSocket (canal que já existe): `config`, `terrain`, e dois eventos
  novos `sprites` e `users`. Única exceção: **Porta** (muda a URL/reinicia o server — não dá).
- **Reconciliação híbrida** ao editar com avatares na tela: escala/coroa/VIP reconciliam na
  hora; **mudança de identidade** (sprite oculto/excluído, override novo) faz o avatar sair
  andando e voltar correto no próximo evento (sem "morph").
- **Default `globalAvatarScale` = 2.0** (avatar padrão ~64px no vertical). Ajustável ao vivo.

## Overlay — `src/overlay/scene.js`

- `const REFERENCE_HEIGHT = 1920;` `const GROUND_MARGIN = 90;`
- `uiScale()` → `app.screen.height / REFERENCE_HEIGHT`; expor no objeto de retorno.
- `groundLine()` → `app.screen.height - GROUND_MARGIN * uiScale()`.
- `layoutBackground()`: `const fit = app.screen.width / bgSprite.texture.width; bgSprite.scale.set(fit * bgScale);`
  onde `bgScale` (default 1) vem do estado do terreno. `bgSprite.y` mantém âncora no rodapé + `bgOffset`.
- `applyTerrain({ active = null, offset = 0, scale = 1 })`: além de `setTerrainOffset(offset)`,
  aplicar `bgScale = Number(scale) || 1` e `layoutBackground()`.
- Sem nova API de resize: o manager registra `scene.app.renderer.on('resize', …)` pra re-escalar.

## Overlay — `src/overlay/characters.js`

- Novo export puro: `effectiveScale(entry, globalScale, uiScale)` → `entry.scale * globalScale * uiScale`.
- Novo export puro: `uiScale(height, reference = 1920)` → `height / reference` (fonte da verdade pro teste;
  `scene.uiScale()` delega). Colocar num módulo puro reaproveitável (ex.: `overlay/scale.js`) pra o
  `node --test` importar sem PIXI.
- `loadCharacters()`: mesclar o mapa **`scales: { id: number }`** de `characters.local.json` sobre as
  entradas (`entry.scale = locData.scales?.[id] ?? entry.scale ?? DEFAULTS.scale`), além do `e.scale`
  legado. Guardar `overrides` e `vipSet` como hoje.
- Estado vivo: `globalScale` (default 2). Novos setters, todos atualizam memória sem re-fetch salvo upload:
  - `setGlobalScale(v)`; `setSpriteScale(id, v)` (atualiza `entry.scale` do roster); `setVip(list)`;
    `setOverrides(map)`.
  - `reloadCharacters()` async: re-`fetchJson` de `characters.json`/`characters.local.json`, `Assets.load`
    de quaisquer frames novos, reconstrói `roster`/`overrides`/`vipSet`. Usado no evento `sprites`.
- `createCharacterSprite(username)`: anexa `sprite.entry = entry` e expõe `sprite.applyScale(globalScale, ui)`
  que calcula `abs = effectiveScale(entry, globalScale, ui)`, guarda `sprite._abs = abs`, e seta a escala
  respeitando o `faceTo`. `faceTo(direction)` passa a usar `sprite._abs` (não `entry.scale`).

## Overlay — `src/overlay/avatar.js`

- Body: no create e ao reconciliar, `body.applyScale(globalScale, scene.uiScale())`.
- Label @: `fontSize = Math.round(12 * ui)`, `label.y = 6 * ui`. Coroa 👑: `fontSize = Math.round(14 * ui)`,
  `crown.y = -body.height - 2` (já relativo ao corpo). Reposicionar label/coroa ao reescalar.
- Margens de entrada/borda (`±30`, `< 30`, `> w-30`), `speed` base e `jump` (`height 34`) × `ui`.
- Expor no retorno: `applyScale(globalScale, ui)` (reescala body + reposiciona label/coroa),
  `setVip(bool)` (cria/remove a coroa ao vivo), `characterId()` (id atual, pra detectar troca de identidade).

## Overlay — `src/overlay/avatar-manager.js`

- Guardar `settings.avatarScale` (do cfg; default 2). `rescaleAll()` = itera `visuals` e chama
  `v.applyScale(settings.avatarScale, scene.uiScale())`. Registrar `scene.app.renderer.on('resize', rescaleAll)`.
- `configure(newCfg)`: além do atual, se `Number.isFinite(newCfg.avatarScale)` atualiza e chama `rescaleAll()`.
- Novos handlers (roteados de `overlay.js`):
  - `onSprites()` (evento `{type:'sprites'}`): `await reloadCharacters()`; `rescaleAll()`; **reconciliar
    identidade**: pra cada visual cujo `characterId()` sumiu do roster (oculto/excluído), `removeVisual(u)`.
  - `onUsers(evt)` (evento `{type:'users'}`): `setOverrides`/`setVip`; reconciliar coroas (`v.setVip(...)`);
    identidade: se o `characterId` do usuário mudou (novo override), `removeVisual(u)`; `ensureVips()` pra
    subir VIPs novos. Remoção de VIP não força saída (a coroa some via `setVip(false)`).
- `handle`: sem mudança de assinatura.

## Overlay — `src/overlay/overlay.js`

- `DEFAULT_CONFIG.avatarScale = 2`. Aplicar `globalScale` inicial no `characters`/manager a partir do config.
- Terreno inicial: ler também `scales?.[active]` do `terrain.local.json`.
- Roteamento WS: `case 'config' → manager.configure`; `case 'terrain' → scene.applyTerrain`;
  **`case 'sprites' → manager.onSprites()`**; **`case 'users' → manager.onUsers(event)`**; resto → `manager.handle`.

## Servidor — `src/server/config.js`

- `DEFAULT_CONFIG.avatarScale = 2`. `validateConfig`: `avatarScale: clamp(raw.escalaAvatares, 0.2, 6, 2)`.
  `toRawConfig`: `escalaAvatares: en.avatarScale`.

## Servidor — `src/server/sprites.js`

- Estado passa a ter mapa **`scales`** em `characters.local.json`. `setSpriteScale(id, scale)`:
  aceita **qualquer** id existente (default ou local) — valida contra `listSprites().some(id)`; grava
  `data.scales[id] = s` (cria o mapa); se `s === DEFAULTS.scale` remove `data.scales[id]`. Continua
  validando `Number.isFinite(s) && s > 0`. (Remove a restrição "sprite local não encontrado".)
- `listSprites`: `scale: localData.scales?.[e.id] ?? e.scale ?? DEFAULTS.scale`.

## Servidor — `src/server/terrains.js`

- `readState`/`writeState` incluem `scales: {}` (além de `offsets`). `clampScale(v)` → `min(4, max(0.2, n))`
  com fallback 1. `setTerrainScale(file, scale)` (espelha `setTerrainOffset`). `listTerrains` items:
  `{ file, offset, scale: st.scales[file] ?? 1 }`. `deleteTerrain` também limpa `scales[file]`.

## Servidor — `src/server/admin-api.js`

- `PUT /config`: broadcast passa a incluir `avatarScale: cfg.avatarScale` (e `effectsVolume` p/ ficar ao vivo).
- `PUT /sprites/scale`, `POST /sprites`, `PUT /sprites/hidden`, `DELETE /sprites/*`: após a ação,
  `bridge.broadcast({ type: 'sprites' })`.
- `PUT /users`, `DELETE /users/*`: após a ação, `bridge.broadcast({ type: 'users', ...listUsers() })`.
- Novo `PUT /terrain/scale` body `{ file, scale }` → `setTerrainScale` + broadcast
  `{ type:'terrain', active, offset, scale }`. Os broadcasts de `/terrain/active` e `/terrain/offset`
  passam a incluir `scale` (do item ativo).

## Painel — `admin/` (React/TS) + rebuild do `dist`

- `api.ts`: `setTerrainScale(file, scale)`; `avatarScale` entra no payload de config; `setSpriteScale` já existe.
- **ConfigTab**: campo "Escala global dos avatares" (number/slider, min 0.2 max 6 step 0.1) no PUT de config.
- **SpritesTab**: controle de escala para **todos** os sprites (não só locais); feedback "aplicado ao vivo"
  (remover o "atualize a fonte no OBS").
- **TerrainTab/Manager**: controle "Escala do terreno" (min 0.2 max 4 step 0.1) ao lado do offset.
- Rebuild `admin/dist` + commit (o streamer nunca roda build).

## README

- Mesmo overlay serve **vertical 1080×1920** e **horizontal 1920×1080** — muda só a dimensão da fonte no OBS.
- Edições do /admin aplicam **ao vivo** (sem recarregar a fonte), exceto **Porta**.

## Testes (TDD)

- Raiz (`node --test`, hoje 121 verde):
  - `scale.js`: `uiScale(h, ref)`, `effectiveScale(entry, global, ui)` (puros).
  - `config.test.js`: `avatarScale` clamp + round-trip PT↔EN.
  - `sprites.test.js`: `setSpriteScale` grava no mapa `scales` p/ id **padrão**; remove no default;
    `listSprites` reflete; erro em id inexistente/escala inválida.
  - `terrains.test.js`: `setTerrainScale` clamp; `listTerrains` inclui `scale`; delete limpa `scales`.
  - `admin-api.test.js`: `/config` broadcast inclui `avatarScale`; `/sprites/scale` e afins fazem
    broadcast `{type:'sprites'}`; `/users` faz `{type:'users'}`; `/terrain/scale` faz `{type:'terrain',…,scale}`.
- Admin (`vitest`, hoje 8 verde): ConfigTab renderiza a escala global; SpritesTab mostra escala p/ sprite
  padrão; TerrainTab renderiza a escala do terreno.

## Escopo

- **Fora:** tornar a Porta editável ao vivo; segundo servidor/instância (duas lives simultâneas);
  `?formato=` na URL (só se aparecer desalinhamento vertical×horizontal — fica de reserva);
  editar `facing`/frames ao vivo (YAGNI).
