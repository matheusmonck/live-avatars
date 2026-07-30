# Peça 1 — Roster de personagens orientado a dados + sprites locais

Data: 2026-07-30
Status: aprovado (aguardando revisão do spec)
Épico: Painel /admin (Peça 1 de 3). Peça 2 = painel React+Vite + API. Peça 3 = terreno configurável.

## Objetivo

Tirar o roster de personagens do código (`characters.js`) e movê-lo para dados, e
estabelecer um modelo de **sprites locais** (enviados pelo usuário, fora do git) separado
dos **sprites padrão** (CC0, versionados). É a fundação do gerenciador de sprites do painel
(Peça 2) e também **libera um push privado limpo** — tirando do repositório os sprites
`link-minish-cap` (IP da Nintendo) e `robo`.

## Escopo

**Nesta peça:**
- Dois arquivos de roster: `characters.json` (versionado, padrão CC0) e `characters.local.json` (gitignored, do usuário).
- `characters.js` passa a **ler e mesclar** esses dados em vez de hardcodar o roster.
- Modelo de pastas: PNGs padrão versionados; PNGs locais numa pasta gitignored.
- Migração dos dados atuais + mover `robo` e `link-minish-cap` para o lado local.
- Limpeza de histórico (remover os dois sprites de todos os commits) + criar repo privado + push.

**Fora desta peça:**
- Qualquer UI/API do painel (Peça 2).
- Terreno/cenário configurável (Peça 3).
- Recarga automática do overlay ao adicionar sprite (o overlay lê o roster no load; por ora, recarregar a fonte no OBS basta).

## Modelo de dados

Dois arquivos, servidos como estáticos pelo servidor (ficam sob `src/overlay/`, que é a raiz servida):

**`src/overlay/characters.json`** (versionado) — roster padrão CC0 (Ansimuz):
```json
{ "characters": [
  { "id": "hero" }, { "id": "cap" }, { "id": "dog" }, { "id": "frog" },
  { "id": "girl" }, { "id": "hood" }, { "id": "kid" }, { "id": "miner" },
  { "id": "oldwoman" }, { "id": "sage" }, { "id": "woman" }
] }
```

**`src/overlay/characters.local.json`** (gitignored) — sprites do usuário:
```json
{ "characters": [
  { "id": "robo", "frames": 4 },
  { "id": "link-minish-cap", "frames": 10, "facing": "left" }
] }
```

Campos por entrada (todos opcionais menos `id`), com defaults:
- `id` (obrigatório) — nome da pasta do sprite.
- `frames` (default `2`) — nº de quadros `1.png..N.png`.
- `scale` (default `2`) — fator de escala do sprite.
- `facing` (default `"front"`) — `"front"` | `"left"` | `"right"`.

## Layout de arquivos + gitignore

- PNGs padrão: `src/overlay/assets/characters/<id>/1.png … N.png` (versionado).
- PNGs locais: `src/overlay/assets/characters-local/<id>/1.png … N.png` (**gitignored**).
- `.gitignore` ganha duas linhas:
  ```
  src/overlay/assets/characters-local/
  src/overlay/characters.local.json
  ```

A separação por pasta é o que torna o gitignore trivial (uma linha) e à prova de erro —
diferente de tentar ignorar subpastas dinâmicas dentro de uma pasta comum.

## `characters.js` — leitura orientada a dados

Estado do módulo: `roster` (array, populado no load). Cada entrada resolvida:
`{ id, frames, scale, facing, base }`, onde `base` é `"assets/characters"` (padrão) ou
`"assets/characters-local"` (local).

- `loadCharacters()` (já é async):
  1. `fetch('characters.json')` (obrigatório; erro se faltar) → aplica defaults, `base = "assets/characters"`.
  2. `fetch('characters.local.json')` (opcional; `404`/erro → lista vazia) → defaults, `base = "assets/characters-local"`.
  3. Mescla numa lista única; se um `id` local repetir um padrão, o local vence.
  4. Pré-carrega as texturas (`PIXI.Assets.load`) usando `${base}/${id}/${n}.png`, popula o cache.
- A seleção determinística vira uma função **pura e exportada** `pickId(username, ids)` (hash djb2 → índice), e `characterForUser(username)` = `pickId(username, roster.map(r => r.id))`. Isso permite testar a seleção sem browser/PIXI.
- `createCharacterSprite(username)` usa a entrada do roster (frames/scale/facing/base) — mesma assinatura de hoje.

O resto do overlay não muda: continua chamando `loadCharacters()` uma vez e
`createCharacterSprite(username)` por avatar.

## Migração + push limpo

1. Gerar `characters.json` (11 CC0, entradas mínimas `{id}`) e `characters.local.json`
   (`robo` frames 4; `link-minish-cap` frames 10, facing left) a partir do que está
   hoje hardcodado em `characters.js` (`FRAMES`/`SCALES`/`FACING`).
2. Mover as pastas `src/overlay/assets/characters/robo/` e `.../link-minish-cap/` para
   `src/overlay/assets/characters-local/` (ficam no disco, gitignored — o overlay local
   continua mostrando esses personagens).
3. Adicionar as duas linhas ao `.gitignore` e `git rm --cached` os caminhos antigos.
4. Commitar a reestruturação (roster de dados + `characters.js` novo + testes + gitignore).
5. **Limpeza de histórico:** como `link-minish-cap` (Nintendo) e `robo` já estão em commits
   anteriores, reescrever o histórico para removê-los de todos os commits (seguro — nada foi
   para o remoto). Preferir `git filter-repo`; fallback `git filter-branch`.
6. Criar repositório **privado** no GitHub e fazer o push do histórico já limpo.

## Testes

- `characters.test.js` passa a testar a função pura `pickId(username, ids)`:
  determinismo (mesmo usuário → mesmo id) e validade (id sempre pertence à lista), mais a
  aplicação de defaults (uma função de resolução de entrada, se extraída).
- `fetch`/`PIXI.Assets`/render não são testáveis em unidade (rodam no browser) →
  verificação via `npm run sim` + abrir o overlay (avatares dos sprites padrão E dos locais
  aparecem).

## Riscos e mitigação

- **Reescrita de histórico**: só é segura porque nada foi pro remoto. Fazer ANTES do primeiro push.
- **Fresh clone sem sprites locais**: esperado — um clone novo só tem os 11 CC0; os locais
  vivem só na máquina do usuário. O `fetch('characters.local.json')` trata 404 como vazio.
- **`characters.json` ausente/inválido**: é obrigatório e versionado; se falhar, o overlay
  não tem roster — erro explícito no console (não silencioso).
- **Colisão de `id`** entre padrão e local: local vence (regra explícita na mesclagem).

## Não-objetivos

- Sem UI, sem endpoints de API, sem terreno (peças seguintes).
- Sem recarga automática do overlay ao mudar o roster.
- Sem mudança de comportamento visual dos avatares padrão.
