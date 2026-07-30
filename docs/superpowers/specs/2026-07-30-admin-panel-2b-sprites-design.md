# Peça 2b — Gerenciador de sprites no Painel

Data: 2026-07-30
Status: aprovado autonomamente (usuário pediu "seguir sem parar"); revisável depois.
Épico: Painel /admin. Peça 1 (roster de dados) e 2a (painel base) feitas. **Peça 2b = gerenciador de sprites**. Peça 3 = terreno.

## Objetivo

Deixar o usuário **adicionar, ver e remover sprites de personagem pelo Painel**, sem editar
código nem mexer em arquivos — o motivo original de existir o painel. Constrói sobre o modelo
da Peça 1 (roster em `characters.json` padrão + `characters.local.json` local gitignored, PNGs
em `assets/characters/` e `assets/characters-local/`) e a API da Peça 2a.

## Escopo

**Nesta peça:**
- Backend: módulo `sprites.js` (listar/salvar/remover) + rotas na `admin-api` (`GET/POST /admin/api/sprites`, `DELETE /admin/api/sprites/:id`).
- Frontend: `SpriteManager.jsx` — lista com preview animado, formulário de adicionar (nome, PNGs, escala, direção), botão remover nos locais.
- Upload de PNGs via **JSON com base64** (sem dependência de multipart; PNGs de sprite são pequenos).

**Fora:**
- Terreno (Peça 3).
- Recarga automática do overlay ao mudar sprites (o overlay lê o roster no load; o painel avisa "atualize a fonte no OBS").
- Editar/remover os sprites **padrão** (CC0) — são somente-leitura; só os **locais** são editáveis.

## Decisões de design (tomadas autonomamente)

- **Upload = JSON base64**: `POST` com `{ id, scale, facing, frames: ["<base64 png>", ...] }`.
  Sem parser multipart nem nova dependência. Adequado a PNGs 16×16 de poucos KB.
- **frames = número de PNGs enviados** (não é campo manual).
- **id saneado**: precisa casar `^[a-z0-9-]{1,40}$` (evita path traversal e nomes estranhos). Rejeita o resto com 400.
- **Somente locais editáveis**: `saveSprite`/`deleteSprite` operam só em `characters.local.json` + `assets/characters-local/`. Tentar remover um padrão → 400.
- **Preview client-side**: o painel anima os quadros ciclando as URLs já servidas (`assets/characters[-local]/<id>/<n>.png`); nada de trabalho no servidor além de servir os PNGs (que já são servidos).
- **Colisão de id** (local sobre padrão): permitido — o local vence no overlay (regra da Peça 1); no painel isso aparece como "sobrescreve padrão".

## Backend

### `src/server/sprites.js` (novo) — deps de caminho injetáveis para teste
- `listSprites({ overlayDir? })` → array `{ id, frames, scale, facing, source: 'default'|'local' }`,
  lendo `characters.json` (default) e `characters.local.json` (local; ausente → vazio).
- `saveSprite({ id, scale, facing, frames }, { overlayDir? })`:
  - valida `id` (`^[a-z0-9-]{1,40}$`) e que `frames` é array não-vazio de PNGs base64;
  - grava os PNGs em `assets/characters-local/<id>/1.png … N.png` (decodifica base64; aceita com ou sem prefixo `data:image/png;base64,`);
  - faz upsert da entrada em `characters.local.json` com `frames: N` (+ `scale`/`facing` se != default);
  - cria `characters.local.json` se não existir. Lança em input inválido.
- `deleteSprite(id, { overlayDir? })`:
  - só remove se o `id` estiver em `characters.local.json` (é local); senão lança;
  - apaga a pasta `assets/characters-local/<id>/` e remove a entrada do `characters.local.json`.

### `admin-api.js` — novas rotas (deps `listSprites`/`saveSprite`/`deleteSprite` injetáveis)
- `GET /admin/api/sprites` → `listSprites()`.
- `POST /admin/api/sprites` → `saveSprite(body)`; `200 {ok:true}` ou `400 {error}`.
- `DELETE /admin/api/sprites/<id>` → `deleteSprite(id)`; `200` ou `400`.

## Frontend

### `admin/src/api.js` — adicionar
`getSprites()`, `saveSprite({id,scale,facing,frames})`, `deleteSprite(id)`.

### `admin/src/SpriteManager.jsx` (novo)
- **Lista**: cada sprite com um mini-preview **animado** (cicla os quadros via `assets/...`),
  o `id`, `source` (padrão/local), e — se local — botão **Remover**.
- **Adicionar**: campo `nome` (id), select `direção` (front/left/right), número `escala` (default 2),
  input de arquivo `múltiplos PNGs`. Ao escolher os arquivos, mostra um **preview animado** dos quadros
  selecionados (ordenados por nome de arquivo). **Salvar** lê os arquivos como base64 e faz `POST`.
- Após adicionar/remover: aviso "atualize a fonte de navegador no OBS pra ver a mudança".
- Erros da API exibidos inline.

### `admin/src/App.jsx`
Adiciona `<SpriteManager />` (abaixo do controle). Rebuild do `admin/dist`.

## Fluxo de dados

Painel → `GET /admin/api/sprites` (lista). Adicionar: lê PNGs (FileReader→base64) → `POST` →
grava em `assets/characters-local/` + `characters.local.json`. Remover: `DELETE` → apaga pasta + entrada.
Preview é 100% client-side sobre as URLs servidas.

## Tratamento de erro
- `id` inválido / `frames` vazio → `400` com mensagem.
- Remover um sprite padrão → `400` "sprite padrão não pode ser removido".
- Base64 inválido → `400`.

## Testes
- **Backend (TDD, Node):** `tests/sprites.test.js` — `listSprites` (merge default+local com `source`),
  `saveSprite` (grava PNGs no diretório temporário + upserta o json, valida id, conta frames),
  `deleteSprite` (só local; apaga pasta e entrada; recusa padrão). `admin-api` ganha testes das 3 rotas.
- **Frontend:** verificação manual (abrir `/admin`, adicionar um sprite com 2 PNGs, ver na lista com preview, remover) — o controlador verifica a persistência via API/arquivos.

## Riscos
- **Base64 grande**: PNGs de sprite são minúsculos; ok. (Se um dia virar sprites grandes, migrar pra multipart.)
- **Overlay não recarrega sozinho**: documentado; o usuário atualiza a fonte no OBS.
- **`characters-local/` e `characters.local.json` são gitignored** (Peça 1): sprites adicionados ficam locais — comportamento desejado.

## Não-objetivos
- Sem editar sprites padrão, sem terreno, sem hot-reload do overlay, sem multipart.
