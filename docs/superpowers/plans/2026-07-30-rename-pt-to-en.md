# Rename PT → EN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traduzir identificadores internos e o protocolo WebSocket de português para inglês, mantendo JS e sem mudar comportamento.

**Architecture:** Rename mecânico guiado pelos 35 testes. Camadas independentes, um commit por tarefa, suíte verde entre commits. `config.js` vira a única fronteira PT↔EN (lê chaves PT do `config.json`, devolve objeto EN). Arquivos do overlay sem teste unitário (`scene`, `avatar`, `reactions`, `avatar-manager`, `overlay`, `ws-client`) são verificados com `npm run sim`.

**Tech Stack:** Node ESM, Vitest, PixiJS (via CDN), ws.

**Regras gerais:**
- Comportamento idêntico. Nenhuma mudança de lógica.
- Commits **sem** co-author (preferência do dono do repo).
- Texto de UI (mensagens de console, `"conectando…"`, `"reconectando…"`, faixa de novo seguidor) **permanece em português**. Só valores de *estado* internos viram inglês.
- Chaves do `config/config.json` **permanecem em português**.
- `config/config.json` tem um valor local não-commitado (`usuarioTikTok`); nenhuma tarefa toca no arquivo `config.json` (as chaves ficam PT).

**Verificação padrão de cada tarefa:** `npm test` (deve ficar verde) e/ou `npm run sim` para os arquivos sem teste. Ao final, `git grep` das strings PT antigas deve vir vazio (Tarefa 14).

---

## Camada A — Servidor (identificadores internos; protocolo WS permanece PT nesta camada)

### Task 1: `config.js` — fronteira de tradução

**Files:**
- Modify: `src/server/config.js`
- Modify: `src/server/index.js` (leituras de `cfg.*`)
- Test: `tests/config.test.js`

- [ ] **Step 1: Atualizar os testes (RED)**

Em `tests/config.test.js`, trocar as referências para os nomes EN. O `validateConfig` passa a receber o objeto bruto com chaves PT e retornar objeto com campos EN:

```js
import { validateConfig, DEFAULT_CONFIG } from '../src/server/config.js';

test('preenche valores padrão quando faltam campos', () => {
  const cfg = validateConfig({ usuarioTikTok: 'fulano' });
  expect(cfg.username).toBe('fulano');
  expect(cfg.avatarLimit).toBe(DEFAULT_CONFIG.avatarLimit);
  expect(cfg.inactivitySeconds).toBe(DEFAULT_CONFIG.inactivitySeconds);
  expect(cfg.effectsVolume).toBe(DEFAULT_CONFIG.effectsVolume);
  expect(cfg.port).toBe(DEFAULT_CONFIG.port);
});

test('remove @ do usuário', () => {
  expect(validateConfig({ usuarioTikTok: '@fulano' }).username).toBe('fulano');
});

test('lança erro se usuário estiver vazio', () => {
  expect(() => validateConfig({ usuarioTikTok: '' })).toThrow(/usuarioTikTok/);
});

test('força limites numéricos sãos', () => {
  const cfg = validateConfig({ usuarioTikTok: 'x', limiteAvatares: 0, volumeEfeitos: 5 });
  expect(cfg.avatarLimit).toBeGreaterThanOrEqual(1);
  expect(cfg.effectsVolume).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- tests/config.test.js`
Expected: FAIL (imports `validateConfig`/`DEFAULT_CONFIG` não existem).

- [ ] **Step 3: Reescrever `config.js`**

Mapa de rename + fronteira. Lê chaves PT do arquivo, devolve objeto EN:

```js
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_CONFIG = {
  username: "",
  avatarLimit: 18,
  inactivitySeconds: 150,
  effectsVolume: 0.6,
  port: 8737,
};

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Lê o config.json (chaves em PT — contrato do usuário) e devolve objeto EN.
export function validateConfig(raw) {
  const username = String(raw?.usuarioTikTok ?? "").trim().replace(/^@/, "");
  if (!username) throw new Error("config: usuarioTikTok é obrigatório");
  return {
    username,
    avatarLimit: Math.round(clamp(raw.limiteAvatares, 1, 60, DEFAULT_CONFIG.avatarLimit)),
    inactivitySeconds: Math.round(clamp(raw.inatividadeSegundos, 10, 3600, DEFAULT_CONFIG.inactivitySeconds)),
    effectsVolume: clamp(raw.volumeEfeitos, 0, 1, DEFAULT_CONFIG.effectsVolume),
    port: Math.round(clamp(raw.porta, 1024, 65535, DEFAULT_CONFIG.port)),
  };
}

function readApiKey(here) {
  const fromEnv = String(process.env.SIGN_API_KEY ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const localPath = resolve(here, "../../config/config.local.json");
    const local = JSON.parse(readFileSync(localPath, "utf8"));
    return String(local?.signApiKey ?? "").trim() || undefined;
  } catch {
    return undefined;
  }
}

export function loadConfig() {
  const here = dirname(fileURLToPath(import.meta.url));
  const filePath = resolve(here, "../../config/config.json");
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  const cfg = validateConfig(raw);
  cfg.signApiKey = readApiKey(here);
  return cfg;
}
```

- [ ] **Step 4: Atualizar `index.js` (só o que vem de config)**

Trocar em `src/server/index.js`: `carregarConfig` → `loadConfig`; `cfg.usuarioTikTok` → `cfg.username`; `cfg.limiteAvatares` → `cfg.avatarLimit`; `cfg.inatividadeSegundos` → `cfg.inactivitySeconds`; `cfg.porta` → `cfg.port`. **Manter** o frame WS `{ tipo: 'config', limiteAvatares: cfg.avatarLimit, inatividadeSegundos: cfg.inactivitySeconds }` (chaves do frame ainda PT — trocam na Task 13, valores vêm dos campos EN). `cfg.signApiKey` já é EN.

- [ ] **Step 5: Rodar suíte e commitar**

Run: `npm test`  → Expected: PASS (35).
```bash
git add src/server/config.js src/server/index.js tests/config.test.js
git commit -m "refactor: config.js traduz chaves PT do config.json para objeto EN"
```

---

### Task 2: `bridge.js`

**Files:**
- Modify: `src/server/bridge.js`
- Modify: `src/server/index.js` (uso de `criarBridge`/`.fechar`)
- Test: `tests/bridge.test.js`

- [ ] **Step 1: Atualizar `tests/bridge.test.js`** — trocar `criarBridge` → `createBridge`, `.fechar()` → `.close()`, `.clientes()` → `.clients()`, e o arg `aoConectar` (se referenciado) → `onConnect`. (Manter o objeto de evento como está: broadcast é agnóstico.)

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/bridge.test.js` → FAIL.

- [ ] **Step 3: Reescrever `bridge.js`** com o mapa: `criarBridge`→`createBridge`, `aoConectar`→`onConnect`, `evento`→`event`, `.clientes`→`.clients`, `.fechar`→`.close`. (`broadcast`, `msg`, `wss` mantêm.)

- [ ] **Step 4: Atualizar `index.js`** — `criarBridge`→`createBridge`, `bridge.fechar()`→`bridge.close()`.

- [ ] **Step 5: Rodar suíte e commitar**
```bash
git add src/server/bridge.js src/server/index.js tests/bridge.test.js
git commit -m "refactor: bridge.js identificadores PT -> EN"
```

---

### Task 3: `static-server.js`

**Files:**
- Modify: `src/server/static-server.js`
- Modify: `src/server/index.js` (uso de `criarServidorEstatico`)
- Test: `tests/smoke.test.js` (se importar)

- [ ] **Step 1: Verificar o smoke test** — Run: `git grep -n "criarServidorEstatico\|criarServidor" tests/`. Se aparecer, atualizar a referência para `createStaticServer` no passo do commit.

- [ ] **Step 2: Reescrever `static-server.js`** com o mapa: `criarServidorEstatico`→`createStaticServer`, `TIPOS`→`CONTENT_TYPES`, `aqui`→`here`, `raizOverlay`→`overlayRoot`, `caminho`→`urlPath`, `conteudo`→`content`. (Textos de resposta HTTP `'proibido'`/`'não encontrado'` **permanecem PT** — são mensagens ao cliente.)

- [ ] **Step 3: Atualizar `index.js`** — `criarServidorEstatico`→`createStaticServer`.

- [ ] **Step 4: Rodar suíte e commitar**
Run: `npm test` → PASS.
```bash
git add src/server/static-server.js src/server/index.js tests/smoke.test.js
git commit -m "refactor: static-server.js identificadores PT -> EN"
```

---

### Task 4: `connector.js` + internos de `index.js`

**Files:**
- Modify: `src/server/connector.js`
- Modify: `src/server/index.js` (`conectarComRetry`, `tentarReconectar`, wiring)
- Test: `tests/connector.test.js` (só nomes de função; asserções de protocolo permanecem PT nesta task)

- [ ] **Step 1: Atualizar `tests/connector.test.js`** — a função exportada é `criarConnector`→`createConnector`. O arg injetado `criarConexao`→`createConnection`, `aoEvento`→`onEvent`. A conexão fake mantém `.connect`/`.disconnect` (nomes já EN, são da lib). Método `c.conectar()`→`c.connect()`. **Manter** as asserções de protocolo PT (`{ tipo: 'comentario', usuario, nome, fotoUrl }`) e os eventos emitidos `conexao.emit('chat'|'gift', ...)` (nomes da lib).

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/connector.test.js` → FAIL.

- [ ] **Step 3: Reescrever `connector.js`** com o mapa:
  - `criarConnector`→`createConnector`, `conexaoReal`→`realConnection`, `criarConexao`→`createConnection`, `aoEvento`→`onEvent`, `aoStatus`→`onStatus`, `encaminhar`→`forward`, `conexao`→`connection`, `conectar`→`connect` (função retornada), `desconectar`→`disconnect`, `estado`→`state`, `evento`→`event`.
  - Objeto de status: `{ estado: 'conectado' }`→`{ state: 'connected' }`, `'desconectado'`→`'disconnected'`, `'erro'`→`'error'`; `sala`→`room`; `erro`→`error`.
  - Manter os `connection.on('chat'|'member'|'like'|'gift'|'follow'|'share'|'social'|'disconnected', …)` (nomes de evento da lib) e as chamadas `normalizar*` (renomeadas só na Task 13).
  - **Cuidado:** as funções `normalizar*` de `normalize.js` ainda têm nome PT nesta camada — manter as chamadas como `normalizarComentario` etc. até a Task 13.

- [ ] **Step 4: Atualizar `index.js`** — `criarConnector`→`createConnector`; `conectarComRetry`→`connectWithRetry`; `tentarReconectar`→`retryConnection`; `motivo`→`reason`; no `aoStatus`/`onStatus` trocar `s.estado === 'conectado'`→`s.state === 'connected'` e `'desconectado'`→`'disconnected'`. Passar `onEvent`/`onStatus` no lugar de `aoEvento`/`aoStatus`. **Textos de console permanecem PT.**

- [ ] **Step 5: Rodar suíte e commitar**
Run: `npm test` → PASS.
```bash
git add src/server/connector.js src/server/index.js tests/connector.test.js
git commit -m "refactor: connector.js e wiring do index.js PT -> EN"
```

---

### Task 5: `simulator.js` (só internos; eventos emitidos permanecem PT)

**Files:**
- Modify: `src/server/simulator.js`
- Modify: `src/server/index.js` (uso de `iniciarSimulador`)
- Test: `tests/simulator.test.js` (nomes de função; asserções de protocolo permanecem PT)

- [ ] **Step 1: Atualizar `tests/simulator.test.js`** — `gerarEventoAleatorio`→`randomEvent`, `iniciarSimulador`→`startSimulator`, `TIPOS_SIMULAVEIS`→`SIMULATABLE_TYPES`. **Manter** asserções sobre os campos/tipos PT do evento (trocam na Task 13).

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/simulator.test.js` → FAIL.

- [ ] **Step 3: Reescrever `simulator.js`** com o mapa (mantendo strings de protocolo PT):
  - `TIPOS_SIMULAVEIS`→`SIMULATABLE_TYPES`, `NOMES`→`NAMES`, `PESOS_TIPO`→`TYPE_WEIGHTS`, `PRESENTES`→`GIFTS`, `escolherPeso`→`weightedPick`, `gerarEventoAleatorio`→`randomEvent`, `iniciarSimulador`→`startSimulator`, `aoEvento`→`onEvent`.
  - vars: `usuario`→`username`, `tipo`→`type`, `evento`→`event`, `parado`→`stopped`, `agendar`→`schedule`, `total`/`x`/`p`/`it`/`s` (manter curtos), `peso`→`weight`.
  - `GIFTS` mantém as chaves PT internas por enquanto (`nome`, `moedas`, `peso`) OU já renomeia para `name`/`coins`/`weight` **desde que** o mapeamento na saída ainda emita as chaves PT do protocolo. Recomendado: renomear as chaves internas do array `GIFTS` para EN (`name`/`coins`/`weight`) e no `randomEvent` ainda escrever `event.presente = p.name; event.valorMoedas = p.coins;` (saída PT até a Task 13).
  - **Manter** o objeto emitido com chaves PT: `{ tipo, usuario, nome, fotoUrl }`, `event.quantidade`, `event.presente`, `event.valorMoedas`, e os valores de `type` (`'curtida'` etc.).

- [ ] **Step 4: Atualizar `index.js`** — `iniciarSimulador`→`startSimulator`.

- [ ] **Step 5: Rodar suíte e commitar**
Run: `npm test` → PASS.
```bash
git add src/server/simulator.js src/server/index.js tests/simulator.test.js
git commit -m "refactor: simulator.js internos PT -> EN (protocolo ainda PT)"
```

---

## Camada B — Overlay (folhas com teste primeiro; depois interfaces sem teste via sim)

### Task 6: `characters.js`

**Files:**
- Modify: `src/overlay/characters.js`
- Modify: `src/overlay/avatar.js` (usa `criarSpritePersonagem`)
- Modify: `src/overlay/overlay.js` (usa `carregarPersonagens`)
- Test: `tests/characters.test.js`

- [ ] **Step 1: Atualizar `tests/characters.test.js`** — `personagemDoUsuario`→`characterForUser`, `PERSONAGENS`→`CHARACTERS` (conforme o que o teste importa). Rodar `git grep -n "personagemDoUsuario\|PERSONAGENS" tests/characters.test.js` para ver o que existe.

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/characters.test.js` → FAIL.

- [ ] **Step 3: Reescrever `characters.js`** com o mapa:
  - `PERSONAGENS`→`CHARACTERS`, `carregarPersonagens`→`loadCharacters`, `personagemDoUsuario`→`characterForUser`, `criarSpritePersonagem`→`createCharacterSprite`, `sprite.virarPara`→`sprite.faceTo`.
  - constantes: `ESCALA`→`SCALE`, `VELOCIDADE_ANIM`→`ANIM_SPEED`, `PADRAO_QUADROS`→`DEFAULT_FRAMES`, `QUADROS`→`FRAMES`, `ESCALAS`→`SCALES`, `OLHANDO`→`FACING`.
  - helpers: `quadrosDe`→`framesOf`, `escalaDe`→`scaleOf`, `olhandoDe`→`facingOf`.
  - vars: `nome`→`name`, `quadros`→`frames`, `escala`→`scale`, `olhar`→`facing`, `olhaEsquerda`→`facesLeft`, `direcao`→`direction`, `todas`→`all`, `mapa`→`map`.
  - valores de `FACING`: `'frente'`→`'front'`, `'esquerda'`→`'left'`, `'direita'`→`'right'` (atualizar o default `?? "front"` e as comparações).

- [ ] **Step 4: Atualizar consumidores** — `avatar.js`: `criarSpritePersonagem`→`createCharacterSprite`. `overlay.js`: `carregarPersonagens`→`loadCharacters`.

- [ ] **Step 5: Rodar suíte e commitar**
Run: `npm test` → PASS.
```bash
git add src/overlay/characters.js src/overlay/avatar.js src/overlay/overlay.js tests/characters.test.js
git commit -m "refactor: characters.js PT -> EN"
```

---

### Task 7: `gift-scale.js`

**Files:**
- Modify: `src/overlay/gift-scale.js`
- Modify: `src/overlay/reactions.js` (usa `escalaPresente` e `.escala/.confetes/.duracaoMs`)
- Test: `tests/gift-scale.test.js`

- [ ] **Step 1: Atualizar `tests/gift-scale.test.js`** — `escalaPresente`→`giftScale`; saída `.nivel`→`.level`, `.escala`→`.scale`, `.confetes`→`.confetti`, `.duracaoMs`→`.durationMs`; valores `'pequeno'`→`'small'`, `'medio'`→`'medium'`, `'grande'`→`'large'`.

```js
import { giftScale } from '../src/overlay/gift-scale.js';

test('presente barato = efeito pequeno', () => {
  const e = giftScale(1);
  expect(e.level).toBe('small');
  expect(e.scale).toBeCloseTo(1.4);
  expect(e.confetti).toBeLessThanOrEqual(20);
});
test('presente médio', () => { expect(giftScale(50).level).toBe('medium'); });
test('presente caro = explosão', () => {
  const e = giftScale(500);
  expect(e.level).toBe('large');
  expect(e.confetti).toBeGreaterThanOrEqual(120);
  expect(e.durationMs).toBeGreaterThanOrEqual(4000);
});
test('valor inválido cai no pequeno', () => { expect(giftScale(undefined).level).toBe('small'); });
test('fronteiras exatas dos níveis', () => {
  expect(giftScale(5).level).toBe('small');
  expect(giftScale(6).level).toBe('medium');
  expect(giftScale(100).level).toBe('medium');
  expect(giftScale(101).level).toBe('large');
});
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/gift-scale.test.js` → FAIL.

- [ ] **Step 3: Reescrever `gift-scale.js`**:

```js
// Traduz o valor em moedas de um presente no tamanho/duração do efeito visual.
export function giftScale(coins) {
  const v = Number.isFinite(Number(coins)) ? Number(coins) : 0;
  if (v > 100) return { level: 'large', scale: 2.6, durationMs: 5000, confetti: 160 };
  if (v > 5) return { level: 'medium', scale: 2.0, durationMs: 3500, confetti: 70 };
  return { level: 'small', scale: 1.4, durationMs: 2500, confetti: 18 };
}
```

- [ ] **Step 4: Atualizar `reactions.js`** — `import { giftScale }`; em `reacaoPresente`: `const fx = giftScale(evento.valorMoedas)` (o campo `valorMoedas` do evento continua PT até a Task 13) e usar `fx.scale`, `fx.confetti`, `fx.durationMs`. (O resto de reactions.js é renomeado na Task 11.)

- [ ] **Step 5: Rodar suíte e commitar**
Run: `npm test` → PASS.
```bash
git add src/overlay/gift-scale.js src/overlay/reactions.js tests/gift-scale.test.js
git commit -m "refactor: gift-scale.js PT -> EN"
```

---

### Task 8: `throttle.js`

**Files:**
- Modify: `src/overlay/throttle.js`
- Modify: `src/overlay/avatar-manager.js` (usa `criarThrottle`/`.permitir`)
- Test: `tests/throttle.test.js`

- [ ] **Step 1: Atualizar `tests/throttle.test.js`** — `criarThrottle`→`createThrottle`, `.permitir(...)`→`.allow(...)`.

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/throttle.test.js` → FAIL.

- [ ] **Step 3: Reescrever `throttle.js`** — `criarThrottle`→`createThrottle`, `.permitir`→`.allow`, `janelaMs`→`windowMs`, `agora`→`now`, `ultimo`→`last`, `anterior`→`previous`, `usuario`→`key` (o parâmetro é uma chave genérica `tipo:usuario`).

- [ ] **Step 4: Atualizar `avatar-manager.js`** — só as duas referências: `criarThrottle`→`createThrottle`, `throttle.permitir(...)`→`throttle.allow(...)`. (O resto de avatar-manager é a Task 11.)

- [ ] **Step 5: Rodar suíte e commitar**
Run: `npm test` → PASS.
```bash
git add src/overlay/throttle.js src/overlay/avatar-manager.js tests/throttle.test.js
git commit -m "refactor: throttle.js PT -> EN"
```

---

### Task 9: `avatar-registry.js`

**Files:**
- Modify: `src/overlay/avatar-registry.js`
- Modify: `src/overlay/avatar-manager.js` (usa `criarRegistry` e a API do registry)
- Test: `tests/avatar-registry.test.js`

- [ ] **Step 1: Atualizar `tests/avatar-registry.test.js`** — mapa da API: `criarRegistry`→`createRegistry`; opções `{ limite, inatividadeMs }`→`{ limit, inactivityMs }`; `.registrar(u, agora)`→`.register(u, now)`; retorno `{ novo, avatar, removidos }`→`{ isNew, avatar, removed }`; `.expirarInativos(agora)`→`.expireInactive(now)`; `.configurar(...)`→`.configure(...)`; `.tem(u)`→`.has(u)`; `.lista()`→`.list()`; campo `ultimaInteracao`→`lastInteraction`. Rodar `git grep -n` no arquivo de teste para pegar todas as ocorrências.

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/avatar-registry.test.js` → FAIL.

- [ ] **Step 3: Reescrever `avatar-registry.js`** com o mapa acima + internos: `avatares`→`avatars`, `maisAntigo`→`oldest`, `alvo`→`target`, `existente`→`existing`, `velho`→`old`, `removidos`→`removed`, `novoLimite`→`newLimit`, `novaInatividade`→`newInactivity`, `usuario`→`username`, `agora`→`now`.

- [ ] **Step 4: Atualizar `avatar-manager.js`** — as chamadas: `criarRegistry({ limite, inatividadeMs })`→`createRegistry({ limit, inactivityMs })`; `registry.registrar(...)`→`registry.register(...)`; `res.removidos`→`result.removed`; `res.novo`→`result.isNew`; `registry.expirarInativos(...)`→`registry.expireInactive(...)`; `registry.configurar({ limite, inatividadeMs })`→`registry.configure({ limit, inactivityMs })`. (Restante de avatar-manager na Task 11.)

- [ ] **Step 5: Rodar suíte e commitar**
Run: `npm test` → PASS.
```bash
git add src/overlay/avatar-registry.js src/overlay/avatar-manager.js tests/avatar-registry.test.js
git commit -m "refactor: avatar-registry.js PT -> EN"
```

---

### Task 10: `scene.js` + `avatar.js` (sem teste unitário — verificar via sim)

**Files:**
- Modify: `src/overlay/scene.js`
- Modify: `src/overlay/avatar.js`
- Modify: `src/overlay/reactions.js` (consome API da cena/avatar)
- Modify: `src/overlay/avatar-manager.js` (consome `criarAvatarVisual` e API do avatar)
- Modify: `src/overlay/overlay.js` (usa `criarCena`)

- [ ] **Step 1: Reescrever `scene.js`** — mapa da interface `scene`:
  - `criarCena`→`createScene`, `elemento`→`element`.
  - `camadaChao`→`groundLayer`, `camadaEfeitos`→`effectsLayer`, `camadaDestaque`→`highlightLayer`.
  - `linhaChao`→`groundLine`, `pontoDestaque`→`highlightPoint`.
  - retorno: `{ app, groundLayer, effectsLayer, highlightLayer, groundLine, highlightPoint }`.

- [ ] **Step 2: Reescrever `avatar.js`** — mapa da interface `avatar`:
  - `criarAvatarVisual`→`createAvatarVisual`; destructuring `{ usuario }`→`{ username }`.
  - `raiz`→`root`, `corpo`→`body`, `larguraTela`→`screenWidth`, `direcao`→`direction`, `velocidade`→`speed`, `saindo`→`leaving`, `pausado`→`paused`, `larg`→`w`, `dur`→`duration`, `altura`→`height`.
  - `corpo.virarPara`→`body.faceTo`.
  - funções: `andar`→`walk`, `pular`→`jump`, `sair(aoFim)`→`leave(onDone)`.
  - API do scene consumida: `cena.linhaChao()`→`scene.groundLine()`, `cena.camadaChao`→`scene.groundLayer`, `cena.app` (mantém). Renomear o parâmetro `cena`→`scene`.
  - retorno: `{ root, username, walk, jump, leave, pause: () => {...}, resume: () => {...}, position: () => ({ x: root.x, y: root.y }) }` (`pausar`→`pause`, `retomar`→`resume`, `posicao`→`position`).

- [ ] **Step 3: Atualizar `reactions.js` (só as referências de cena/avatar)** — `cena`→`scene` (parâmetro de todas as funções), `cena.camadaEfeitos`→`scene.effectsLayer`, `cena.camadaDestaque`→`scene.highlightLayer`, `cena.camadaChao`→`scene.groundLayer`, `cena.pontoDestaque()`→`scene.highlightPoint()`, `cena.linhaChao()`→`scene.groundLine()`; `avatar.posicao()`→`avatar.position()`, `avatar.pausar()`→`avatar.pause()`, `avatar.retomar()`→`avatar.resume()`, `avatar.raiz`→`avatar.root`. (Os nomes das funções `reacao*` e internos são a Task 11 — pode deixar como estão neste commit, desde que carregue.)

- [ ] **Step 4: Atualizar `avatar-manager.js` (só criação/uso do avatar)** — `criarAvatarVisual`→`createAvatarVisual`; `v.sair()`→`v.leave()`, `v.pular()`→`v.jump()`, `v.andar(...)`→`v.walk(...)`; parâmetro `cena`→`scene`. (Restante na Task 11.)

- [ ] **Step 5: Atualizar `overlay.js`** — `criarCena`→`createScene`, `cena`→`scene`.

- [ ] **Step 6: Verificar via simulador** — Run: `npm test` (deve continuar PASS — nada quebrou nos testes) e depois `npm run sim`. Abrir `http://localhost:8737`, confirmar: avatares entram andando, pulam em comentários, sobem em presentes (efeito + confete), somem por inatividade. Encerrar com Ctrl+C.

- [ ] **Step 7: Commit**
```bash
git add src/overlay/scene.js src/overlay/avatar.js src/overlay/reactions.js src/overlay/avatar-manager.js src/overlay/overlay.js
git commit -m "refactor: interfaces scene/avatar do overlay PT -> EN"
```

---

### Task 11: `reactions.js` + `avatar-manager.js` (internos; sem teste — verificar via sim)

**Files:**
- Modify: `src/overlay/reactions.js`
- Modify: `src/overlay/avatar-manager.js`

- [ ] **Step 1: Reescrever internos de `reactions.js`**:
  - funções: `particula`→`particle`, `animarSubindo`→`animateRising`, `explodirConfete`→`explodeConfetti`, `reacaoCuracao`→`reactionHearts`, `reacaoEstrelas`→`reactionStars`, `reacaoSeguir`→`reactionFollow`, `reacaoPresente`→`reactionGift`.
  - params/vars: `cor`→`color`, `forma`→`shape`, `dur`→`duration`, `faixa`→`banner`, `nome`→`name`, `quantidade`→`count`, `cores`→`colors`, `alvo`→`target`, `inicio`→`start`, `animar`→`animate`, `voltar`→`goBack`, `de`→`from`, `subir`→`riseMs`.
  - valores de `shape`: `'circulo'`→`'circle'`, `'coracao'`→`'heart'`, `'estrela'`→`'star'`.
  - **Texto da faixa permanece PT**: `` `⭐ novo seguidor: @${name} 💖` ``.
  - `reactionGift` lê `evento.valorMoedas` — manter PT até Task 13 (só o nome interno `fx`/`scale`/`confetti`/`durationMs` já veio da Task 7).

- [ ] **Step 2: Reescrever internos de `avatar-manager.js`**:
  - `criarGerenciador`→`createManager`, `garantir`→`ensure`, `removerVisual`→`removeVisual`, `visuais`→`visuals`, `TIPOS_THROTTLED`→`THROTTLED_TYPES`, `res`→`result`, `tratar`→`handle`, `configurar`→`configure`, `novo`→`newCfg`.
  - imports de reações: `R.reacaoCuracao`→`R.reactionHearts`, `R.reacaoSeguir`→`R.reactionFollow`, `R.reacaoEstrelas`→`R.reactionStars`, `R.reacaoPresente`→`R.reactionGift`.
  - **Manter consumo do protocolo PT** nesta task: `evento.tipo`, valores `'comentario'`/`'entrar'`/`'curtida'`/`'seguir'`/`'compartilhar'`/`'presente'`, `evento.usuario`, `evento.nome`, `cfg.limiteAvatares`, `cfg.inatividadeSegundos` (o frame de config ainda manda PT). O switch e o Set `THROTTLED_TYPES` continuam com strings PT até a Task 13.

- [ ] **Step 3: Verificar via simulador** — Run: `npm test` → PASS; `npm run sim` → confirmar todas as reações (coração/estrela/seguidor/presente) visualmente. Ctrl+C.

- [ ] **Step 4: Commit**
```bash
git add src/overlay/reactions.js src/overlay/avatar-manager.js
git commit -m "refactor: reactions.js e avatar-manager.js internos PT -> EN"
```

---

### Task 12: `overlay.js` + `ws-client.js` + `index.html`

**Files:**
- Modify: `src/overlay/ws-client.js`
- Modify: `src/overlay/overlay.js`
- Modify: `src/overlay/index.html`

- [ ] **Step 1: Reescrever `ws-client.js`** — `conectarWS`→`connectWS`, `aoEvento`→`onEvent`, `aoStatus`→`onStatus`, `abrir`→`open`, `ws`(mantém). Valores de status: `aoStatus('conectado')`→`onStatus('connected')`, `aoStatus('reconectando')`→`onStatus('reconnecting')`. (Texto `'overlay: frame inválido ignorado'` permanece PT.)

- [ ] **Step 2: Reescrever `overlay.js`** — `conectarWS`→`connectWS`, `criarGerenciador`→`createManager`, `carregarPersonagens`→`loadCharacters`, `criarCena`→`createScene`; `CFG_PADRAO`→`DEFAULT_CONFIG` com campos `{ avatarLimit: 18, inactivitySeconds: 150 }`; `cena`→`scene`, `gerenciador`→`manager`, `evento`→`event`; `manager.configurar`→`manager.configure`, `manager.tratar`→`manager.handle`. **Manter** `event.tipo === 'config'` (protocolo PT até Task 13) e o mapeamento de status para texto PT: `s === 'connected' ? '' : (s === 'reconnecting' ? 'reconectando…' : s)`. Trocar `getElementById('palco')`→`getElementById('stage')`.

- [ ] **Step 3: Atualizar `index.html`** — `id="palco"`→`id="stage"` e o CSS `#palco`→`#stage`. (Textos visíveis `"conectando…"`, `lang="pt-br"`, `<title>` permanecem.)

- [ ] **Step 4: Verificar via simulador** — `npm run sim` → overlay conecta (status some ao conectar), reações funcionam. Testar reconexão: parar e reiniciar o server, ver `"reconectando…"` e voltar. Ctrl+C.

- [ ] **Step 5: Commit**
```bash
git add src/overlay/ws-client.js src/overlay/overlay.js src/overlay/index.html
git commit -m "refactor: overlay.js, ws-client.js e index.html PT -> EN"
```

---

## Camada C — Protocolo WebSocket (troca atômica nas duas pontas + testes)

### Task 13: Protocolo `type` + campos PT → EN

**Files:**
- Modify: `src/server/normalize.js`
- Modify: `src/server/simulator.js`
- Modify: `src/server/index.js` (frame de config)
- Modify: `src/overlay/avatar-manager.js` (consumo)
- Modify: `src/overlay/reactions.js` (`evento.valorMoedas`)
- Modify: `src/overlay/overlay.js` (`event.tipo`)
- Test: `tests/normalize.test.js`, `tests/connector.test.js`, `tests/simulator.test.js`

Glossário (aprovado): campo `tipo`→`type`; valores `comentario/entrar/curtida/seguir/compartilhar/presente`→`comment/join/like/follow/share/gift`; campos `usuario→username`, `nome→name`, `fotoUrl→avatarUrl`, `quantidade→count`, `valorMoedas→coins`, `presente(nome)→giftName`; frame config `limiteAvatares→avatarLimit`, `inatividadeSegundos→inactivitySeconds`.

- [ ] **Step 1: Atualizar `tests/normalize.test.js`** — saída esperada com nomes EN:

```js
test('comentário', () => {
  expect(normalizeComment({ ...base, content: 'oi' })).toEqual({
    type: 'comment', username: 'fulano', name: 'Fulano', avatarUrl: 'http://foto',
  });
});
test('curtida soma count', () => {
  const n = normalizeLike({ ...base, count: 7 });
  expect(n.type).toBe('like');
  expect(n.count).toBe(7);
});
test('presente: valor = diamondCount * repeatCount', () => {
  const n = normalizeGift({ ...base, gift: { name: 'rosa', diamondCount: 1, type: 2 }, repeatCount: 3, repeatEnd: 1 });
  expect(n).toEqual({
    type: 'gift', username: 'fulano', name: 'Fulano', avatarUrl: 'http://foto',
    giftName: 'rosa', coins: 3,
  });
});
```
(Também: `normalizarComentario`→`normalizeComment`, `normalizarEntrar`→`normalizeJoin`, `normalizarCurtida`→`normalizeLike`, `normalizarSeguir`→`normalizeFollow`, `normalizarCompartilhar`→`normalizeShare`, `normalizarPresente`→`normalizeGift` nos imports; ajustar os testes de `entrar`→`join`, `seguir`/`compartilhar`→`follow`/`share`, e o streakável.)

- [ ] **Step 2: Atualizar `tests/connector.test.js`** — asserção do comentário para `{ type: 'comment', username: 'ana', name: 'Ana', avatarUrl: 'f' }`; do presente para `.type === 'gift'` e `.coins === 2`.

- [ ] **Step 3: Atualizar `tests/simulator.test.js`** — os tipos esperados viram EN (`comment/join/like/follow/share/gift`); campos `usuario→username`, `nome→name`, `fotoUrl→avatarUrl`, `quantidade→count`, `presente→giftName`, `valorMoedas→coins`.

- [ ] **Step 4: Rodar e ver falhar** — Run: `npm test` → FAIL (normalize/connector/simulator).

- [ ] **Step 5: Reescrever `normalize.js`** — funções `normalize*` (Comment/Join/Like/Follow/Share/Gift), `dadosUsuario`→`userData`, e a saída EN:
  - `userData`: `{ username: user.displayId…, name: user.nickname…, avatarUrl: user.avatarThumb?.urlList?.[0]… }`.
  - `normalizeComment`→`{ type: 'comment', ...userData(raw) }`; join/like/follow/share análogos com `type` EN; like inclui `count: Number(raw?.count ?? 1)`.
  - `normalizeGift`: `{ type: 'gift', ...userData(raw), giftName: String(gift.name ?? 'presente'), coins: diamonds * repeat }`.

- [ ] **Step 6: Atualizar `connector.js`** — as chamadas `normalizar*` → `normalize*` correspondentes.

- [ ] **Step 7: Atualizar `simulator.js` (saída EN)** — `SIMULATABLE_TYPES` e `TYPE_WEIGHTS` com valores EN; `randomEvent` emite `{ type, username, name, avatarUrl }`, `event.count`, `event.giftName`, `event.coins`.

- [ ] **Step 8: Atualizar `index.js` (frame)** — `bridge` envia `{ type: 'config', avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds }`.

- [ ] **Step 9: Atualizar consumo no overlay** — `avatar-manager.js`: `event.type`, `THROTTLED_TYPES = new Set(['like','follow','share'])`, switch com `'comment'/'join'/'like'/'follow'/'share'/'gift'`, `event.username`, `event.name`, `cfg.avatarLimit`, `cfg.inactivitySeconds`. `reactions.js`: `reactionGift` lê `event.coins` (passar para `giftScale(event.coins)`). `overlay.js`: `event.type === 'config'`.

- [ ] **Step 10: Rodar suíte e commitar**
Run: `npm test` → PASS (35).
```bash
git add src/server/normalize.js src/server/simulator.js src/server/connector.js src/server/index.js src/overlay/avatar-manager.js src/overlay/reactions.js src/overlay/overlay.js tests/normalize.test.js tests/connector.test.js tests/simulator.test.js
git commit -m "refactor: protocolo WebSocket tipo/campos PT -> EN"
```

---

## Camada D — Fechamento

### Task 14: Varredura final + verificação manual

**Files:** nenhum novo; correções pontuais se a varredura achar sobras.

- [ ] **Step 1: Varredura de sobras PT** — Run:
```bash
git grep -nE "criar|carregar|conectar|normalizar|iniciar|tratar|configurar|usuario|cena|gerenciador|personagem|presente|comentario|curtida|seguir|compartilhar|palco|camada|posicao|pausar|retomar|reacao|escala[A-Z]" -- src/ tests/
```
Expected: só ocorrências legítimas (textos de UI em PT, chaves PT lidas em `config.js`, mensagens de console/HTTP, comentários). Qualquer identificador de código restante → corrigir.

- [ ] **Step 2: Suíte completa** — Run: `npm test` → PASS (35).

- [ ] **Step 3: Verificação manual — simulador** — Run: `npm run sim`; abrir o overlay; confirmar avatares, pulos, reações e presentes. Ctrl+C.

- [ ] **Step 4: Verificação manual — modo real** — Run: `node src/server/index.js`; confirmar que sobe sem erro de import e tenta conectar (com a chave em `config.local.json`). Ctrl+C.

- [ ] **Step 5: Commit (se houve correção na varredura)**
```bash
git add -A -- src/ tests/
git commit -m "refactor: varredura final de identificadores PT remanescentes"
```

---

## Notas de verificação (self-review)

- **Cobertura do spec:** identificadores internos (Tasks 1–12), protocolo WS (Task 13), chaves de config em PT via fronteira `config.js` (Task 1), textos de UI em PT preservados (chamado em cada task), varredura final (Task 14). ✓
- **Consistência de tipos/nomes:** a interface do `avatar` (`root/username/walk/jump/leave/pause/resume/position`), do `scene` (`groundLayer/effectsLayer/highlightLayer/groundLine/highlightPoint`), do `registry` (`register/expireInactive/configure/has/list` + `{isNew,avatar,removed}`) e do protocolo (`type` + `username/name/avatarUrl/count/coins/giftName`) são usadas de forma idêntica entre produtor e consumidor nas tasks. ✓
- **Sem placeholders:** cada task traz o mapa completo old→new. ✓
- **Arquivos sem teste** (`scene`, `avatar`, `reactions`, `avatar-manager`, `overlay`, `ws-client`): verificados via `npm run sim` (Tasks 10–12) e varredura (Task 14).
