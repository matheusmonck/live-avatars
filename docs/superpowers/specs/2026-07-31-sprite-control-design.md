# Controle de sprites: ocultar padrão + fixar por usuário

**Data:** 2026-07-31
**Status:** aprovado (brainstorming)

## Contexto

Roster orientado a dados: `src/overlay/characters.json` (repo, defaults CC0: hero, cap, dog, frog, girl, hood, kid, miner, oldwoman, sage, woman) + `characters.local.json` (gitignored, sprites do usuário — hoje `{ characters: [] }`). `loadCharacters()` mescla os dois; `characterForUser(username) = pickId(username, roster ids)` (hash djb2 determinístico). Hoje só sprites locais podem ser removidos (`sprites.js deleteSprite` recusa os padrão); e não há como fixar um sprite específico para um usuário.

## Objetivo

1. **Ocultar sprites padrão** (reversível/soft): o usuário some com defaults que não quer, sem apagar arquivo do repo.
2. **Fixar sprite por usuário**: `matheusmonck → luffy` (caso semeado), extensível por um mapa de overrides.

## Modelo de dados
- `characters.local.json` (gitignored) ganha `hidden: [ids]` (sprites ocultados).
- Overrides usuário→sprite: mapa `overrides` em `characters.json` (versionado, **semeado com `{ "matheusmonck": "luffy" }`**) mesclado com `overrides` opcional em `characters.local.json` (local vence).

## A) Ocultar sprites padrão (soft, reversível)

### Servidor — `src/server/sprites.js`
- `listSprites()` passa a incluir `hidden: boolean` por item (id presente em `hidden`).
- `setSpriteHidden(id, hidden, { overlayDir })` — adiciona/remove o id do array `hidden` em `characters.local.json`, preservando `characters`/`overrides`.
- `deleteSprite(id)` também limpa o id de `hidden` (higiene).

### Overlay — `src/overlay/characters.js`
- `visibleRoster(entries, hiddenIds)` — **função pura exportada**: filtra os ocultos; **trava**: se o resultado ficaria vazio, devolve `entries` (nunca fica sem sprite).
- `loadCharacters()` lê `characters` + `hidden` + `overrides` dos dois arquivos, monta o roster mesclado, aplica `visibleRoster`, e guarda `overrides` (module-level).

### Admin — `admin/src/tabs/SpritesTab.tsx`
- Sprites **padrão** ganham botão **"ocultar"/"restaurar"** (refletindo `hidden`); item oculto aparece marcado (ex.: esmaecido + "(oculto)"). Sprites locais seguem com "Remover".
- Ocultar é reload-based (igual ao fluxo atual de sprites: "atualize a fonte no OBS") — **sem broadcast**.

## B) Fixar sprite por usuário

### Overlay — `src/overlay/characters.js`
- `pickId(username, ids, overrides = {})` — se `overrides[username]` existir **e** estiver em `ids`, retorna ele; senão, mantém o hash djb2. Retrocompatível (chamadas com 2 args seguem iguais).
- `characterForUser(username)` passa o `overrides` mesclado.
- **Graceful**: enquanto não existir um sprite com id `luffy` no roster, `matheusmonck` cai no hash normal.

### Dados — `src/overlay/characters.json`
- Adiciona `"overrides": { "matheusmonck": "luffy" }`.

## Servidor — `src/server/admin-api.js`
- Rota nova `PUT /admin/api/sprites/hidden` `{ id, hidden }` → `setSpriteHidden(id, hidden)`, devolve `{ ok: true }`; erro → 400. (Sem broadcast.)
- Adiciona `setSpriteHidden` às deps injetáveis.

## Admin — `admin/src/api.ts`
- `SpriteItem` ganha `hidden: boolean`.
- `setSpriteHidden(id, hidden): Promise<ApiResult>` → `PUT /admin/api/sprites/hidden`.

## Build
- Rebuild do `admin/dist` + commit (o /admin é servido do build).

## Testes
- `tests/characters.test.js`: `pickId` com overrides (aplica quando o alvo está em ids; ignora e cai no hash quando não está; determinístico sem override); `visibleRoster` (filtra ocultos; fallback quando todos ocultos).
- `tests/sprites.test.js`: `setSpriteHidden` adiciona/remove de `hidden`; `listSprites` marca `hidden` (assertivas existentes passam a incluir `hidden: false`).
- `tests/admin-api.test.js`: `PUT /admin/api/sprites/hidden` chama `setSpriteHidden(id, hidden)`.
- `admin/src/api.test.ts`: `setSpriteHidden` manda o PUT certo.
- Manual (`npm run sim`): ocultar um padrão e confirmar que ele some do rodízio (recarregar overlay); subir um sprite `luffy` e confirmar que `matheusmonck` recebe o luffy (via simulador não há matheusmonck — testar com um sprite `luffy` e um override temporário, ou validar por unit).

## Fora de escopo
- UI no /admin pra editar overrides (só o mapa semeado + edição por JSON).
- Broadcast/reroster ao vivo de sprites (segue reload-based, como hoje).
- Criar a arte do luffy (é um sprite local que o usuário sobe).
