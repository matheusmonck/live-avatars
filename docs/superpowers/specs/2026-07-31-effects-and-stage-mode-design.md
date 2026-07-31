# Efeitos mais vivos + toggle "Modo palco"

**Data:** 2026-07-31
**Status:** aprovado (brainstorming)

## Contexto

Os efeitos de reação (`src/overlay/reactions.js`) são básicos e "duros":

- **Corações (like):** 4 corações desenhados com 2 círculos + 1 retângulo (nem lê como coração), sobem devagar com animação **linear** e somem.
- **Estrelas (share):** 6 estrelas com `g.star()` padrão, mesma subida linear.
- **Confete (follow/gift):** quadradinhos iguais com gravidade + rotação + fade — monótono.
- **Presente (gift):** leva o boneco ao ponto de destaque, aplica escala proporcional às moedas e solta confete.
- **Seguir (follow):** confete no centro + banner com o nome de quem seguiu.

Não há easing, pop de entrada, variação por partícula nem brilho. O usuário quer os efeitos **mais vivos, mais cheios e com formas de verdade**, e quer poder **desligar o "palco"** (centralizar o boneco no presente + banner do seguidor) pra que tudo aconteça no lugar onde o avatar está.

## Objetivo

1. Reescrever os efeitos com formas vetoriais de verdade, easing, pop-in, variação e mais volume — **abordagem "polir no lugar"**, sem dependências novas, mantendo a API pública.
2. Adicionar uma configuração booleana **`modoPalco`** (default ligado) no /admin que, quando desligada, faz presente e seguidor dispararem os efeitos no lugar do avatar (sem centralizar, sem banner).

## Escopo

### Parte 1 — Efeitos (`src/overlay/reactions.js`, reescrito)

A API pública permanece: `reactionHearts(scene, avatar)`, `reactionStars(scene, avatar)`, `reactionFollow(scene, avatar, name, opts)`, `reactionGift(scene, avatar, event, opts)`. Só `reactionFollow`/`reactionGift` ganham o parâmetro `opts` (ver Parte 2).

Estrutura interna nova:

- **Objeto de tunables no topo** do arquivo: contagens, paletas (rosas/vermelhos pros corações, dourados pras estrelas, 5 cores pro confete), tamanhos, durações. Facilita ajuste fino ("eyeball") depois.
- **Easing puro e exportado** (testável sem browser):
  - `easeOutCubic(t)` — subida rápido→lento.
  - `easeOutBack(t)` — pop de entrada com overshoot.
- **Formas via `PIXI.GraphicsContext` compartilhado** (1 geometria reaproveitada, cor por partícula via `tint`):
  - **Coração:** path com curvas bézier (`moveTo` + `bezierCurveTo`), preenchido branco e tintado.
  - **Estrela:** `g.star()` pontuda (raio interno menor), tintada dourada.
  - **Confete:** por instância, mistura de quadrado e fita fina (variação de `scale.x/scale.y`), tintado de uma paleta de 5 cores.
- **Dois animadores** (cada partícula se auto-remove ao terminar — mesmo padrão atual com `ticker.add`/`remove` + `destroy`):
  - `floatUp(scene, node, opts)` (corações/estrelas): escala 0→1 com `easeOutBack` (~120ms de pop) → sobe com `easeOutCubic` → **sway senoidal** lateral → giro/tilt leve → fade nos últimos ~35% da vida → leve encolhida no fim. Tamanho/cor/atraso de início levemente aleatórios (**spawn escalonado**).
  - `confettiBurst(scene, x, y, count, opts)`: velocidade inicial espalhada + gravidade + **flutter** (oscilação de `scale.x` simulando giro no ar) + rotação + fade. Tamanho e cor variados.
- **Bloom sutil:** corações/estrelas embrulhados num `Container` com uma cópia maior translúcida em `blendMode: 'add'` atrás — dá brilho sem filtro pesado.
- **Volume:** corações 4→~8, estrelas 6→~10 (tunável). Confete do seguidor sobe um pouco; confete do presente continua proporcional às moedas via `giftScale`.

Performance: contagens na casa das dezenas; `Graphics` + ticker por partícula é adequado. O `GraphicsContext` compartilhado evita reconstruir geometria por partícula.

### Parte 2 — Toggle "Modo palco" (`modoPalco` / `stageMode`)

Booleano novo, default `true` (= comportamento atual). Percorre o mesmo caminho de plumbing do `avatarLimit`.

| Camada | Mudança |
|---|---|
| `config/config.json` | nova chave PT `"modoPalco": true` |
| `src/server/config.js` | `DEFAULT_CONFIG.stageMode = true`; helper `bool(value, fallback)`; `validateConfig` lê `raw.modoPalco`; `toRawConfig` grava `modoPalco: en.stageMode` |
| `src/server/index.js` | frame `{ type: 'config', ... }` inclui `stageMode: c.stageMode` |
| `src/server/admin-api.js` | broadcast do PUT inclui `stageMode: cfg.stageMode` |
| `src/overlay/overlay.js` | `DEFAULT_CONFIG` inclui `stageMode: true` |
| `src/overlay/avatar-manager.js` | guarda o flag num `settings` mutável; `configure()` atualiza; `handle()` passa `{ stage: settings.stageMode }` pra `reactionFollow`/`reactionGift` |
| `admin/src/api.ts` | `Config.stageMode: boolean`; incluído no payload do `putConfig` |
| `admin/src/tabs/ConfigTab.tsx` | checkbox "Modo palco (destaque de presente + banner)" ligado ao `cfg.stageMode` |

**Comportamento em `reactions.js`** (`opts.stage`, default `true` quando ausente — retrocompatível):

- `reactionFollow(scene, avatar, name, { stage })`:
  - `stage: true` → banner (com pop de entrada) + `confettiBurst` no ponto de destaque (atual).
  - `stage: false` → só `confettiBurst` na cabeça do avatar (`avatar.position()`), **sem banner**.
- `reactionGift(scene, avatar, event, { stage })`:
  - `stage: true` → leva o boneco ao destaque + escala proporcional + confete (atual).
  - `stage: false` → `confettiBurst` proporcional às moedas **no lugar** + pop de escala rápido no próprio boneco (sem centralizar, **sem pausar** o passeio).

## Contratos / Interfaces

- Frame `config` do servidor → overlay ganha o campo `stageMode: boolean`.
- `Config` (admin) ganha `stageMode: boolean`.
- `reactionFollow`/`reactionGift` ganham 4º/`opts` argumento `{ stage: boolean }`; ausência = `true`.
- `easeOutCubic`, `easeOutBack` exportados de `reactions.js`.

## Testes

- **Novos (unidade, puro):** `easeOutCubic`/`easeOutBack` — fronteiras `t=0 → 0`, `t=1 → 1`, e overshoot de `easeOutBack` (algum `t` intermediário > 1 / final volta a 1).
- **`tests/config.test.js`:** `validateConfig` inclui `stageMode` (default `true`); round-trip PT↔EN preserva `modoPalco`; coerção de valores não-booleanos cai no default.
- **`tests/admin-api.test.js`:** frame `config` emitido no PUT inclui `stageMode`.
- **`admin/src/api.test.ts`:** ajustar fixtures/tipos se afirmarem o shape de `Config`.
- **Verificação manual (`npm run sim`):** disparar like/share/follow/gift com `modoPalco` ligado e desligado; confirmar formas novas, pop, brilho, e o comportamento no-lugar vs. palco.

## Fora de escopo

- Motor de partículas com pool / biblioteca externa (`@pixi/particle-emitter`) — o código fica organizado pra virar isso depois, mas não agora.
- Emojis ou sprites PNG pras formas (decidido: vetor desenhado).
- Áudio / uso do `effectsVolume` (segue sem consumidor).
- Toggles separados pra presente e seguidor (decidido: um interruptor só).
