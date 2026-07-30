# Peça 1 — Roster orientado a dados + sprites locais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover o roster de personagens de `characters.js` (hardcode) para arquivos de dados, com um modelo de sprites locais (gitignored) separado dos padrão (CC0, versionados); depois limpar o histórico dos sprites `robo`/`link-minish-cap` e fazer o push num repo privado.

**Architecture:** `characters.js` passa a buscar (`fetch`) e mesclar `characters.json` (repo) + `characters.local.json` (gitignored), aplicando defaults. A lógica de seleção vira função pura testável. `robo` e `link-minish-cap` migram para uma pasta gitignored e saem do histórico.

**Tech Stack:** Node ESM, Vitest, PixiJS (global `PIXI`, via CDN), git filter-branch, gh CLI.

**Regras gerais:**
- Branch `feat/mvp`. Commits **sem** co-author.
- `config/config.json` tem mudança local não-commitada — **nunca** `git add -A`/`git add .`; usar caminhos específicos (todos fora de `config/`).
- Comportamento visual dos avatares padrão não muda.

---

### Task 1: characters.js orientado a dados + migração dos sprites locais

**Files:**
- Create: `src/overlay/characters.json` (versionado)
- Create: `src/overlay/characters.local.json` (gitignored)
- Modify: `src/overlay/characters.js`
- Test: `tests/characters.test.js`
- Modify: `.gitignore`
- Move: `src/overlay/assets/characters/{robo,link-minish-cap}/` → `src/overlay/assets/characters-local/`

- [ ] **Step 1: Criar `src/overlay/characters.json`** (roster padrão CC0)

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
  ]
}
```

- [ ] **Step 2: Criar `src/overlay/characters.local.json`** (sprites locais — será gitignored no Step 7)

```json
{
  "characters": [
    { "id": "robo", "frames": 4 },
    { "id": "link-minish-cap", "frames": 10, "facing": "left" }
  ]
}
```

- [ ] **Step 3: Reescrever `tests/characters.test.js`** (RED — `pickId`/`resolveEntry` ainda não existem)

```js
import { test, expect } from 'vitest';
import { pickId, resolveEntry } from '../src/overlay/characters.js';

const IDS = ['hero', 'cap', 'dog', 'frog', 'girl'];

test('pickId é determinístico por usuário', () => {
  expect(pickId('fulano', IDS)).toBe(pickId('fulano', IDS));
});

test('pickId sempre retorna um id do roster', () => {
  for (const u of ['ana', 'bruno', 'carla', 'xyz']) {
    expect(IDS).toContain(pickId(u, IDS));
  }
});

test('resolveEntry aplica defaults', () => {
  expect(resolveEntry({ id: 'hero' }, 'assets/characters')).toEqual({
    id: 'hero', frames: 2, scale: 2, facing: 'front', base: 'assets/characters',
  });
});

test('resolveEntry respeita overrides', () => {
  expect(resolveEntry({ id: 'link-minish-cap', frames: 10, facing: 'left' }, 'assets/characters-local')).toEqual({
    id: 'link-minish-cap', frames: 10, scale: 2, facing: 'left', base: 'assets/characters-local',
  });
});
```

- [ ] **Step 4: Rodar e ver falhar** — Run: `npm test -- tests/characters.test.js` → FAIL (imports não existem).

- [ ] **Step 5: Reescrever `src/overlay/characters.js`** (data-driven; mantém as assinaturas públicas `loadCharacters`/`characterForUser`/`createCharacterSprite`)

```js
// Roster de personagens orientado a dados: characters.json (repo, CC0 padrão) +
// characters.local.json (gitignored, sprites do usuário). Sprites de 16x16, N quadros.
const ANIM_SPEED = 0.06;          // troca de quadro por ms de ticker
const DEFAULTS = { frames: 2, scale: 2, facing: 'front' };

// Seleção determinística (djb2) — pura e testável, sem PIXI/fetch.
export function pickId(username, ids) {
  let h = 5381;
  for (let i = 0; i < username.length; i++)
    h = ((h << 5) + h + username.charCodeAt(i)) >>> 0;
  return ids[h % ids.length];
}

// Aplica defaults a uma entrada bruta do roster e fixa a pasta base.
export function resolveEntry(entry, base) {
  return {
    id: entry.id,
    frames: entry.frames ?? DEFAULTS.frames,
    scale: entry.scale ?? DEFAULTS.scale,
    facing: entry.facing ?? DEFAULTS.facing,
    base,
  };
}

function urlsFor(entry) {
  return Array.from({ length: entry.frames }, (_, i) => `${entry.base}/${entry.id}/${i + 1}.png`);
}

let roster = [];                  // entradas resolvidas, populado no load
const cache = new Map();          // id -> [Texture, ...]

async function fetchRoster(url, base) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.characters ?? []).map((e) => resolveEntry(e, base));
  } catch {
    return [];
  }
}

// Pré-carrega todas as texturas (chamar 1x antes de criar avatares).
export async function loadCharacters() {
  const defaults = await fetchRoster('characters.json', 'assets/characters');
  if (!defaults.length) throw new Error('characters.json ausente ou vazio');
  const locals = await fetchRoster('characters.local.json', 'assets/characters-local');

  const byId = new Map();
  for (const e of defaults) byId.set(e.id, e);
  for (const e of locals) byId.set(e.id, e); // id local vence colisão
  roster = [...byId.values()];

  const all = roster.flatMap(urlsFor);
  const map = await PIXI.Assets.load(all);
  for (const u of all) {
    const t = map[u];
    if (t?.source) t.source.scaleMode = 'nearest'; // pixel nítido
  }
  for (const e of roster) cache.set(e.id, urlsFor(e).map((u) => map[u]));
}

// Personagem fixo por usuário (hash estável sobre o roster carregado).
export function characterForUser(username) {
  return pickId(username, roster.map((e) => e.id));
}

// Cria o AnimatedSprite do personagem do usuário (texturas já pré-carregadas).
export function createCharacterSprite(username) {
  const id = characterForUser(username);
  const entry = roster.find((e) => e.id === id);
  const sprite = new PIXI.AnimatedSprite(cache.get(id));
  sprite.anchor.set(0.5, 1); // "pés" na origem (linha do chão)
  sprite.scale.set(entry.scale);
  sprite.animationSpeed = ANIM_SPEED;
  sprite.play();

  // Espelha o sprite pra olhar na direção do movimento (+1 direita, -1 esquerda).
  // Arte 'front' não vira; 'left'/'right' viram conforme a convenção.
  const facing = entry.facing;
  sprite.faceTo = (direction) => {
    if (facing === 'front') return;
    const facesLeft = facing === 'left';
    sprite.scale.x = entry.scale * ((direction === -1) === facesLeft ? 1 : -1);
  };
  return sprite;
}
```

- [ ] **Step 6: Rodar e ver passar** — Run: `npm test` → 35/35 PASS (as 2 folhas de `characters` viram 4 testes; total continua verde).

- [ ] **Step 7: Mover os sprites locais + gitignore**

```bash
mkdir -p src/overlay/assets/characters-local
git -C . mv src/overlay/assets/characters/robo src/overlay/assets/characters-local/robo
git -C . mv src/overlay/assets/characters/link-minish-cap src/overlay/assets/characters-local/link-minish-cap
```
Depois acrescentar ao `.gitignore` (no fim do arquivo):
```
src/overlay/assets/characters-local/
src/overlay/characters.local.json
```
E remover do índice o rastreio dos caminhos movidos (o `git mv` renomeou-os como *tracked* no novo caminho; queremos o novo caminho **untracked/gitignored**):
```bash
git -C . rm -r --cached src/overlay/assets/characters-local/robo src/overlay/assets/characters-local/link-minish-cap
```
Confirmar que agora estão ignorados:
```bash
git -C . check-ignore src/overlay/assets/characters-local/robo/1.png src/overlay/characters.local.json
```
Expected: as duas linhas aparecem (ignoradas). Os PNGs continuam no disco.

- [ ] **Step 8: Verificar via simulador** — Run: `npm run sim`, abrir `http://localhost:8737`. Confirmar: avatares dos personagens **padrão** aparecem, e os **locais** (robo, link-minish-cap) também (eles ainda estão no disco). Ctrl+C.

- [ ] **Step 9: Commit** (staged específico — nunca `-A`)

```bash
git add src/overlay/characters.json src/overlay/characters.js tests/characters.test.js .gitignore
git add src/overlay/assets/characters/robo src/overlay/assets/characters/link-minish-cap
git commit -m "feat: roster de personagens orientado a dados + sprites locais gitignored"
```
(O segundo `git add` encena as *remoções* dos caminhos antigos. `characters.local.json` e `assets/characters-local/` ficam de fora por estarem no `.gitignore`. `config/config.json` não é tocado.)

Verificação do commit:
```bash
git -C . ls-files src/overlay/assets/characters/ | grep -E "robo|link-minish-cap" || echo "OK: robo/link fora do índice"
git -C . show --stat HEAD | grep -E "characters.json|characters.js"
```

---

### Task 2: Limpeza de histórico + repo privado + push

**Files:** nenhum de código; opera sobre o histórico git e o remoto.

**Contexto:** `robo` e `link-minish-cap` foram removidos do HEAD na Task 1, mas os blobs ainda
estão em commits anteriores (foram adicionados no commit de sprites). Como nada foi para o
remoto, é seguro reescrever o histórico para removê-los de todos os commits.

- [ ] **Step 1: Backup de segurança da branch** (antes de reescrever)

```bash
git -C . branch backup/pre-filter-mvp
```

- [ ] **Step 2: Purgar os dois sprites de todo o histórico**

Preferir `git filter-repo` se disponível:
```bash
git filter-repo --force \
  --path src/overlay/assets/characters/robo/ \
  --path src/overlay/assets/characters/link-minish-cap/ \
  --invert-paths
```
Se `git filter-repo` não estiver instalado, usar o `filter-branch` embutido:
```bash
git filter-branch --force --index-filter \
  "git rm -r --cached --ignore-unmatch src/overlay/assets/characters/robo src/overlay/assets/characters/link-minish-cap" \
  --prune-empty -- --all
```

- [ ] **Step 3: Verificar que sumiram do histórico**

```bash
git -C . log --all --oneline -- src/overlay/assets/characters/robo src/overlay/assets/characters/link-minish-cap
```
Expected: **saída vazia** (nenhum commit referencia mais esses caminhos).
```bash
npm test
```
Expected: 35/35 PASS (o working tree não mudou; só o histórico).

- [ ] **Step 4: Criar repo privado e fazer push**

Verificar o gh:
```bash
gh auth status
```
Se autenticado, criar o repo **privado** e empurrar (rodar da raiz do projeto):
```bash
gh repo create live-avatars --private --source=. --remote=origin --push
```
Se o `gh` não estiver autenticado/instalado, **parar e escalar**: pedir ao usuário para
rodar `gh auth login` (ou criar o repo manualmente e passar a URL), depois:
```bash
git -C . remote add origin <URL-do-repo-privado>
git -C . push -u origin feat/mvp
```

- [ ] **Step 5: Confirmar o push limpo**

```bash
git -C . ls-remote --heads origin
```
Expected: a branch `feat/mvp` aparece no remoto. E o remoto **não** contém `robo`/`link-minish-cap`
(garantido pelo Step 2/3).

- [ ] **Step 6: Remover o backup** (após confirmar que está tudo certo)

```bash
git -C . branch -D backup/pre-filter-mvp
```

---

## Self-review (cobertura do spec)

- **Modelo de dados** (`characters.json` + `characters.local.json`, defaults): Task 1 Steps 1–2, `resolveEntry` no Step 5, testes no Step 3. ✓
- **Layout + gitignore** (pasta separada, 2 linhas): Task 1 Step 7. ✓
- **`characters.js` data-driven** (fetch+merge, `pickId` pura, mesma assinatura pública): Task 1 Step 5. ✓
- **Migração** (gerar JSONs, mover robo/link): Task 1 Steps 1,2,7. ✓
- **Push limpo** (reescrever histórico, repo privado, push): Task 2. ✓
- **Testes** (`pickId`/`resolveEntry`; render via sim): Task 1 Steps 3,8. ✓
- **Riscos**: fresh clone sem locais (fetch 404 → []) coberto no Step 5; `characters.json` obrigatório (throw) no Step 5; colisão de id (local vence) no Step 5. ✓
- **Consistência de nomes**: `pickId`, `resolveEntry`, `loadCharacters`, `characterForUser`, `createCharacterSprite`, `roster`, `cache`, `urlsFor`, bases `assets/characters`/`assets/characters-local` — usados de forma idêntica entre Steps. ✓
- Sem placeholders. ✓
