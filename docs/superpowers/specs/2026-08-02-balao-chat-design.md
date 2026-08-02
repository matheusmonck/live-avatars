# Balãozinho de chat na cabeça do avatar — Design

**Data:** 2026-08-02
**Branch:** feat/mvp

## Objetivo

Quando um espectador comenta na live, mostrar um balãozinho de fala na cabeça
do avatar dele com o texto do comentário. Dá vida ao "chat flutuante" e mostra
a mensagem real de quem interage.

## Decisões (do brainstorm)

- **Densidade:** todos podem ter balão, com **teto** de balões simultâneos na tela.
- **Excedente:** **enfileira** — comentários acima do teto esperam um slot livre.
- **Duração:** ~**3s** por balão.
- **Texto:** corta em ~**80 caracteres** (com "…") + **filtro de palavrão** de uma
  lista configurável (mascara com `*`). Sem filtro de emoji-só/link no MVP.
- **1 balão por avatar:** mensagem nova do mesmo avatar troca o texto e reinicia
  o timer, sem gastar um slot novo.
- Mantém o `v.jump()` no comentário (pulo + balão juntos).

## Arquitetura

Balão é **filho do `root` do avatar** (igual à coroa/label): acompanha o passeio,
escala junto no `applyScale`, e sobe pro palco junto num presente — de graça.
O gerenciador controla teto global + fila + timers.

### Unidades

1. **`src/overlay/bubble-text.js`** (puro, testável no Node)
   `sanitizeBubble(text, { maxChars, badWords })` → colapsa espaços, mascara
   palavrões (match por token com fronteira, case-insensitive), corta em
   `maxChars` com "…". Retorna `''` se sobrar nada (aí não mostra balão).

2. **`src/overlay/bubble-queue.js`** (puro, testável)
   `createBubbleQueue({ max })` — máquina de estados de slots/fila, sem PIXI nem
   timers:
   - `submit(username, text)` → `{ action: 'show' | 'update' | 'queued', ... }`
     - já ativo → `update` (troca texto)
     - slot livre → `show`
     - cheio → `queued` (dedup por usuário: mantém a última msg)
   - `release(username)` → `{ next: {username,text} | null }` — libera o slot
     (timer expirou ou avatar saiu) e promove o próximo da fila.
   - `setMax(n)`, `has`, `activeCount`, `queuedCount`.

3. **Backend — texto do comentário**
   - `normalize.js`: `normalizeComment` inclui `text: String(raw.comment ?? '')`
     (campo `comment` do `WebcastChatMessage` da tiktok-live-connector v2).
   - `simulator.js`: eventos `comment` ganham `text` sorteado de um pool de frases.

4. **Config — teto e lista configuráveis** (`config.js` + `config/config.json`)
   Contrato PT ↔ EN:
   - `baloesAtivos` ↔ `bubblesEnabled` (padrão `true`)
   - `baloesMax` ↔ `bubbleMax` (padrão `5`, clamp 0–20)
   - `palavroesBloqueados` ↔ `bubbleBadWords` (lista de strings; padrão `[]`)

   Duração (3000ms) e maxChars (80) ficam como constantes de tuning no overlay.
   Helper `configFrame(cfg)` extraído em `config.js` e usado por `index.js` e
   `admin-api.js` (hoje o objeto é duplicado nos dois — evita uma 3ª divergência).

5. **`avatar.js` — render**
   `showBubble(text)` / `clearBubble()` / `hasBubble()`. Balão = `Container`
   (retângulo arredondado escuro translúcido `0x1b1b1f`@~0.82 + rabinho + `PIXI.Text`
   com `wordWrap`), ancorado acima da cabeça (usa `body.height`, como a coroa).
   Reposiciona/recria em `applyScale(globalScale, ui)`.

6. **`avatar-manager.js` — fluxo**
   No `case 'comment'`: `sanitizeBubble` → se vazio, só pula. Senão `queue.submit`:
   - `show`/`update` → `showBubbleFor(user, text)` (render + timer de 3s; reset se update)
   - `queued` → nada agora (entra quando um slot liberar)

   Timers num `Map(username -> timeoutId)`. Ao expirar: `clearBubble` + `release` +
   promove o próximo válido (pula quem já saiu). `removeVisual` também libera o
   slot e promove o próximo. `configure` atualiza `bubblesEnabled`/`bubbleMax`
   (`queue.setMax`)/`bubbleBadWords` ao vivo.

7. **`overlay.js`** — `DEFAULT_CONFIG` ganha `bubblesEnabled/bubbleMax/bubbleBadWords`.

## Testes

- `tests/bubble-text.test.js` — colapso de espaço, corte com "…", máscara de
  palavrão (só token inteiro, não substring), texto vazio → `''`.
- `tests/bubble-queue.test.js` — show até o teto, queued acima, dedup por usuário,
  update de ativo, release promove próximo, setMax.
- `tests/normalize.test.js` — comentário inclui `text`.
- `tests/simulator.test.js` — evento `comment` traz `text` string.
- `tests/config.test.js` — novas chaves (default, clamp, PT↔EN, lista saneada).

`avatar.js`/`avatar-manager.js` (dependem de PIXI) verificados via `npm run sim`.

## Fora de escopo (por ora)

- Filtro de emoji-só/link.
- UI no /admin pra editar a lista de palavrões (editável no `config.json`).
