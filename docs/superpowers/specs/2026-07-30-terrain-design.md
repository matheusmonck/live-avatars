# Peça 3 — Terreno (cenário de fundo configurável)

Data: 2026-07-30
Status: aprovado autonomamente ("seguir sem parar"). **O visual do terreno precisa de revisão do usuário** (não dá pra verificar sem browser).
Épico: Painel /admin. Peças 1, 2a, 2b feitas. **Peça 3 = terreno.**

## Objetivo

Um **cenário de fundo** (chão/terreno) atrás dos avatares no overlay, que o usuário
**sobe e troca pelo Painel**. Os avatares andam "em cima" dele.

## Escopo

- Backend: módulo `terrains.js` (listar/salvar/remover/definir ativo) + rotas na `admin-api`.
- Overlay: renderiza o terreno ativo como imagem **de largura total, ancorada no rodapé, atrás dos avatares**.
- Painel: `TerrainManager.jsx` — sobe imagem, escolhe ativo (ou "nenhum"), preview, remove.

**Fora:** parallax, múltiplas camadas, tiling animado (YAGNI). Sem recarga automática do overlay.

## Decisões de design (autônomas — mesmo padrão da 2b)

- **Armazenamento local**: imagens em `src/overlay/assets/terrain-local/<nome>.png|jpg` (gitignored);
  terreno **ativo** em `src/overlay/terrain.local.json` = `{ "active": "<arquivo>" | null }` (gitignored).
  (Sem terrenos padrão versionados por ora — começa vazio/"nenhum" = transparente, comportamento atual.)
- **Upload = JSON base64** (como sprites). Aceita PNG/JPG.
- **id/arquivo saneado**: `^[a-z0-9-]{1,40}$` + extensão inferida do dataURL. Rejeita o resto.
- **"nenhum"** = `active: null` → overlay transparente (comportamento de hoje).
- **Render (primeira versão, a ajustar com o usuário)**: sprite de **largura = tela**, **ancorado no rodapé**,
  mantendo a proporção da imagem (altura = width × aspect), numa **camada de fundo atrás de tudo**
  (`backgroundLayer`, adicionada antes das outras). Os avatares (linha do chão em `screen.height - 90`)
  aparecem sobre a parte de cima do terreno. *Posição/altura exata é ponto de eyeball.*

## Backend

### `src/server/terrains.js` (deps de caminho injetáveis)
- `listTerrains({ overlayDir? })` → `{ active, items: [{ file }] }` (lê `terrain.local.json` + arquivos de `assets/terrain-local/`).
- `saveTerrain({ name, image }, { overlayDir? })` → valida `name` (`^[a-z0-9-]{1,40}$`), infere extensão do dataURL (`data:image/(png|jpeg);base64,`), grava `assets/terrain-local/<name>.<ext>`, e define como **ativo** no `terrain.local.json`. Retorna `{ file }`.
- `setActiveTerrain(fileOrNull, { overlayDir? })` → grava `{ active: fileOrNull }` (null = nenhum). Valida que o arquivo existe (se não-null).
- `deleteTerrain(file, { overlayDir? })` → apaga o arquivo; se era o ativo, zera o ativo.

### `admin-api.js` — rotas (deps injetáveis)
- `GET /admin/api/terrain` → `listTerrains()`.
- `POST /admin/api/terrain` → `saveTerrain(body)` (upload + vira ativo); 200/400.
- `PUT /admin/api/terrain/active` → `setActiveTerrain(body.active)`; 200/400.
- `DELETE /admin/api/terrain/<file>` → `deleteTerrain(file)`; 200/400.

## Overlay

- `scene.js`: adicionar `backgroundLayer = new PIXI.Container()` **antes** de `groundLayer` no stage,
  e uma função `setBackground(url)` que carrega a textura e cria/atualiza um sprite de fundo
  (width = `app.screen.width`, ancorado no rodapé, mantendo aspect). Exportar `setBackground` na cena.
- `overlay.js`: no boot, `fetch('terrain.local.json')` (opcional; 404 → nenhum); se `active`,
  chamar `scene.setBackground('assets/terrain-local/' + active)`.
- Redesenhar o fundo em resize (o overlay já usa `resizeTo: window`).

## Painel

- `api.js`: `getTerrain()`, `saveTerrain({name,image})`, `setActiveTerrain(active)`, `deleteTerrain(file)`.
- `TerrainManager.jsx`: mostra o ativo (preview) + "nenhum"; lista os enviados (miniatura, botão "usar"/"remover"); form de upload (nome + arquivo). Aviso "atualize a fonte no OBS".
- `App.jsx`: adiciona `<TerrainManager />`. Rebuild do `dist`.

## Testes
- **Backend (TDD):** `tests/terrains.test.js` (list/save/setActive/delete em diretório temporário; validação; ativo). `admin-api` ganha testes das rotas.
- **Overlay/painel:** verificação manual — **o usuário precisa abrir o overlay e ver o terreno** (posição/altura). O controlador verifica a API/arquivos e o painel sendo servido.

## Riscos
- **Visual não verificável por mim** (sem browser): a render é uma primeira versão; ajustar posição/altura com o usuário.
- **Overlay perde a transparência onde o terreno cobre** — é o esperado (o terreno aparece); acima dele continua transparente (mostra a câmera).

## Não-objetivos
- Terrenos padrão versionados, parallax, tiling, hot-reload, multipart.
