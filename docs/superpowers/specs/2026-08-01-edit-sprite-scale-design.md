# Editar escala de sprite já adicionado (sem re-upload)

Data: 2026-08-01
Status: aprovado.
Contexto: hoje pra mudar a escala de um sprite local é preciso remover e re-subir os PNGs
(`saveSprite` exige `frames`). Queremos ajustar a **escala** de um sprite **local** já adicionado
sem reenviar imagens. **Só sprites locais** (os padrão não têm entrada editável).

## Servidor — `src/server/sprites.js`

- `setSpriteScale(id, scale, { overlayDir })`:
  - lê `characters.local.json`; acha o `characters[i]` com `id`; se não existir (não é sprite local),
    lança `new Error('sprite local não encontrado')`.
  - `const s = Number(scale)`; se não finito ou `<= 0`, lança `new Error('escala inválida')`.
  - convenção do `saveSprite`: se `s === DEFAULTS.scale` (2), remove `e.scale`; senão `e.scale = s`.
  - grava o arquivo (mesmo padrão de escrita).

## Servidor — rota em `admin-api.js`

- `PUT /admin/api/sprites/scale` body `{ id, scale }` → `setSpriteScale(id, scale)`; 200 `{ok:true}` / 400 `{error}`.
  (Segue o padrão de `PUT /admin/api/sprites/hidden`.)

## Painel — `admin/src/tabs/SpritesTab.tsx` + `api.ts`

- `api.ts`: `setSpriteScale(id: string, scale: number): Promise<ApiResult>` (`PUT /admin/api/sprites/scale`).
- SpritesTab: para cada sprite **local** na lista, um controle de **escala** (number, min 1, max 6,
  step 0.5, valor inicial `s.scale`) que ao confirmar (onBlur) chama `setSpriteScale(s.id, valor)` e
  recarrega, com feedback "Escala salva ✓ (atualize a fonte no OBS)".

## Overlay

- Nenhuma mudança: o overlay lê `scale` do `characters.local.json` no load (`resolveEntry`/`createCharacterSprite`).
  Editar + recarregar o overlay aplica.

## Testes

- `tests/sprites.test.js`: `setSpriteScale` altera a escala de um sprite local; remove o campo quando volta
  ao default; lança em id inexistente e em escala inválida.
- `tests/admin-api.test.js`: rota `PUT /sprites/scale` (sucesso + 400).

## Build / escopo

- Rebuild + commit do `admin/dist`. **Fora:** editar escala de sprite padrão, editar `facing` (poderia
  ser incluído depois; agora só escala, YAGNI).
