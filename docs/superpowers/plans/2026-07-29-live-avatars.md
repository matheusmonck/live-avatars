# Live Avatars — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um programa que mostra bonequinhos ("avatares") na live do TikTok reagindo automaticamente aos espectadores (comentar, entrar, curtir, seguir, presentear, compartilhar), estilo Stream Avatars.

**Architecture:** Backend Node.js conecta na live via `tiktok-live-connector`, normaliza os eventos e os transmite por WebSocket para uma página (overlay) renderizada com PixiJS. O mesmo servidor HTTP serve o overlay estático. O overlay é adicionado como fonte de navegador no TikTok Live Studio. Um simulador de eventos permite testar sem estar ao vivo.

**Tech Stack:** Node.js (ESM), `tiktok-live-connector`, `ws`, PixiJS v8 (via CDN no overlay), Vitest (testes).

---

## Convenções

**Evento normalizado** — formato interno único que trafega do backend ao overlay:

```js
{
  tipo: 'comentario' | 'entrar' | 'curtida' | 'seguir' | 'presente' | 'compartilhar',
  usuario: 'fulano',        // uniqueId do TikTok, sem @
  nome: 'Fulano',           // nickname
  fotoUrl: 'https://...',   // profilePictureUrl (pode ser '')
  presente: 'rosa',         // só quando tipo === 'presente'
  valorMoedas: 1,           // só quando tipo === 'presente' (diamondCount * repeatCount)
  quantidade: 5             // só quando tipo === 'curtida' (likeCount)
}
```

Nomes de identificadores em português (domínio já foi nomeado assim no design).

## Estrutura de arquivos

```
live-avatars/
  package.json                 # deps + scripts (Task 0)
  config/
    config.json                # config editável pela streamer (Task 1)
  src/
    server/
      config.js                # carrega/valida config.json (Task 1)
      normalize.js             # eventos brutos do TikTok -> evento normalizado (Task 2)
      static-server.js         # serve os arquivos do overlay via HTTP (Task 6)
      bridge.js                # servidor WebSocket, broadcast de eventos (Task 7)
      connector.js             # wrapper do tiktok-live-connector (Task 8)
      simulator.js             # gera eventos falsos (Task 9)
      index.js                 # entry: junta tudo (Task 10)
    overlay/                   # tudo aqui é servido ao navegador (imports relativos)
      gift-scale.js            # valor do presente -> tamanho/duração do efeito (Task 3)
      throttle.js              # anti-enxurrada por usuário (Task 4)
      avatar-registry.js       # estado dos avatares: limite, inatividade, estilo (Task 5)
      index.html               # página capturada pelo Live Studio (Task 11)
      ws-client.js             # cliente WebSocket com reconexão (Task 11)
      scene.js                 # palco PixiJS: chão + zona de destaque (Task 12)
      styles.js                # desenha avatar blob e pixel (Task 13)
      avatar.js                # sprite de um avatar + andar + label @ (Task 13)
      reactions.js             # tipo de evento -> animação (Task 14)
      avatar-manager.js        # cola registry + rendering + reações (Task 15)
      overlay.js               # bootstrap do overlay (Task 15)
  tests/
    config.test.js             # (Task 1)
    normalize.test.js          # (Task 2)
    gift-scale.test.js         # (Task 3)
    throttle.test.js           # (Task 4)
    avatar-registry.test.js    # (Task 5)
    bridge.test.js             # (Task 7)
    connector.test.js          # (Task 8)
    simulator.test.js          # (Task 9)
  iniciar.bat                  # launcher de 1 clique (Task 16)
  README.md                    # instruções (Task 16)
```

**Testes automatizados** cobrem a lógica pura (config, normalização, escala, throttle, registry, bridge, connector, simulator). As partes visuais (PixiJS) são verificadas manualmente com o simulador — cada task visual traz um roteiro de verificação concreto.

Os módulos puros usados pelo overlay em tempo de execução (`gift-scale`, `throttle`, `avatar-registry`) ficam em `src/overlay/` para caírem dentro da raiz servida ao navegador; o backend não depende deles. Os testes os importam de lá.

---

### Task 0: Scaffolding do projeto

**Files:**
- Create: `package.json`
- Create: `tests/smoke.test.js`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "live-avatars",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node src/server/index.js",
    "sim": "node src/server/index.js --sim",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "tiktok-live-connector": "^1.2.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Instalar dependências**

Run: `npm install`
Expected: cria `node_modules/` e `package-lock.json`, sem erros.

- [ ] **Step 3: Escrever um teste smoke pra confirmar o runner**

`tests/smoke.test.js`:

```js
import { test, expect } from 'vitest';

test('vitest está rodando', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Rodar o teste**

Run: `npm test`
Expected: PASS (1 teste).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/smoke.test.js
git commit -m "chore: scaffolding do projeto (npm + vitest)"
```

---

### Task 1: Config

**Files:**
- Create: `config/config.json`
- Create: `src/server/config.js`
- Test: `tests/config.test.js`

- [ ] **Step 1: Escrever o teste que falha**

`tests/config.test.js`:

```js
import { test, expect } from 'vitest';
import { validarConfig, CONFIG_PADRAO } from '../src/server/config.js';

test('preenche valores padrão quando faltam campos', () => {
  const cfg = validarConfig({ usuarioTikTok: 'fulano' });
  expect(cfg.usuarioTikTok).toBe('fulano');
  expect(cfg.limiteAvatares).toBe(CONFIG_PADRAO.limiteAvatares);
  expect(cfg.inatividadeSegundos).toBe(CONFIG_PADRAO.inatividadeSegundos);
  expect(cfg.volumeEfeitos).toBe(CONFIG_PADRAO.volumeEfeitos);
  expect(cfg.porta).toBe(CONFIG_PADRAO.porta);
});

test('remove @ do usuário', () => {
  expect(validarConfig({ usuarioTikTok: '@fulano' }).usuarioTikTok).toBe('fulano');
});

test('lança erro se usuário estiver vazio', () => {
  expect(() => validarConfig({ usuarioTikTok: '' })).toThrow(/usuarioTikTok/);
});

test('força limites numéricos sãos', () => {
  const cfg = validarConfig({ usuarioTikTok: 'x', limiteAvatares: 0, volumeEfeitos: 5 });
  expect(cfg.limiteAvatares).toBeGreaterThanOrEqual(1);
  expect(cfg.volumeEfeitos).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Rodar pra ver falhar**

Run: `npx vitest run tests/config.test.js`
Expected: FAIL (`config.js` não existe).

- [ ] **Step 3: Implementar `src/server/config.js`**

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const CONFIG_PADRAO = {
  usuarioTikTok: '',
  limiteAvatares: 18,
  inatividadeSegundos: 150,
  volumeEfeitos: 0.6,
  porta: 8737,
};

function limitar(valor, min, max, padrao) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

export function validarConfig(bruto) {
  const usuario = String(bruto?.usuarioTikTok ?? '').trim().replace(/^@/, '');
  if (!usuario) throw new Error('config: usuarioTikTok é obrigatório');
  return {
    usuarioTikTok: usuario,
    limiteAvatares: Math.round(limitar(bruto.limiteAvatares, 1, 60, CONFIG_PADRAO.limiteAvatares)),
    inatividadeSegundos: Math.round(limitar(bruto.inatividadeSegundos, 10, 3600, CONFIG_PADRAO.inatividadeSegundos)),
    volumeEfeitos: limitar(bruto.volumeEfeitos, 0, 1, CONFIG_PADRAO.volumeEfeitos),
    porta: Math.round(limitar(bruto.porta, 1024, 65535, CONFIG_PADRAO.porta)),
  };
}

export function carregarConfig() {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const caminho = resolve(aqui, '../../config/config.json');
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  return validarConfig(bruto);
}
```

- [ ] **Step 4: Criar `config/config.json`**

```json
{
  "usuarioTikTok": "coloque_o_@_aqui",
  "limiteAvatares": 18,
  "inatividadeSegundos": 150,
  "volumeEfeitos": 0.6,
  "porta": 8737
}
```

- [ ] **Step 5: Rodar os testes**

Run: `npx vitest run tests/config.test.js`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add config/config.json src/server/config.js tests/config.test.js
git commit -m "feat: carregamento e validação de config"
```

---

### Task 2: Normalização de eventos

**Files:**
- Create: `src/server/normalize.js`
- Test: `tests/normalize.test.js`

- [ ] **Step 1: Escrever o teste que falha**

`tests/normalize.test.js`:

```js
import { test, expect } from 'vitest';
import {
  normalizarComentario, normalizarEntrar, normalizarCurtida,
  normalizarSeguir, normalizarCompartilhar, normalizarPresente,
} from '../src/server/normalize.js';

const base = { uniqueId: 'fulano', nickname: 'Fulano', profilePictureUrl: 'http://foto' };

test('comentário', () => {
  expect(normalizarComentario({ ...base, comment: 'oi' })).toEqual({
    tipo: 'comentario', usuario: 'fulano', nome: 'Fulano', fotoUrl: 'http://foto',
  });
});

test('entrar', () => {
  expect(normalizarEntrar(base).tipo).toBe('entrar');
});

test('curtida soma likeCount', () => {
  const n = normalizarCurtida({ ...base, likeCount: 7 });
  expect(n.tipo).toBe('curtida');
  expect(n.quantidade).toBe(7);
});

test('seguir e compartilhar', () => {
  expect(normalizarSeguir(base).tipo).toBe('seguir');
  expect(normalizarCompartilhar(base).tipo).toBe('compartilhar');
});

test('presente: valor = diamondCount * repeatCount', () => {
  const n = normalizarPresente({ ...base, giftName: 'rosa', diamondCount: 1, repeatCount: 3, giftType: 2, repeatEnd: true });
  expect(n).toEqual({
    tipo: 'presente', usuario: 'fulano', nome: 'Fulano', fotoUrl: 'http://foto',
    presente: 'rosa', valorMoedas: 3,
  });
});

test('presente streakável intermediário é ignorado (null)', () => {
  const n = normalizarPresente({ ...base, giftName: 'rosa', diamondCount: 1, repeatCount: 2, giftType: 1, repeatEnd: false });
  expect(n).toBeNull();
});

test('foto ausente vira string vazia', () => {
  expect(normalizarEntrar({ uniqueId: 'x', nickname: 'X' }).fotoUrl).toBe('');
});
```

- [ ] **Step 2: Rodar pra ver falhar**

Run: `npx vitest run tests/normalize.test.js`
Expected: FAIL (`normalize.js` não existe).

- [ ] **Step 3: Implementar `src/server/normalize.js`**

```js
function dadosUsuario(raw) {
  return {
    usuario: String(raw?.uniqueId ?? '').replace(/^@/, ''),
    nome: String(raw?.nickname ?? raw?.uniqueId ?? ''),
    fotoUrl: String(raw?.profilePictureUrl ?? ''),
  };
}

export function normalizarComentario(raw) {
  return { tipo: 'comentario', ...dadosUsuario(raw) };
}

export function normalizarEntrar(raw) {
  return { tipo: 'entrar', ...dadosUsuario(raw) };
}

export function normalizarCurtida(raw) {
  return { tipo: 'curtida', ...dadosUsuario(raw), quantidade: Number(raw?.likeCount ?? 1) };
}

export function normalizarSeguir(raw) {
  return { tipo: 'seguir', ...dadosUsuario(raw) };
}

export function normalizarCompartilhar(raw) {
  return { tipo: 'compartilhar', ...dadosUsuario(raw) };
}

// Presentes "streakáveis" (giftType === 1) chegam repetidos enquanto a pessoa
// segura o botão; só contam quando repeatEnd === true. Retorna null nos frames
// intermediários pra não animar N vezes.
export function normalizarPresente(raw) {
  const streakable = raw?.giftType === 1;
  if (streakable && !raw?.repeatEnd) return null;
  const repeat = Number(raw?.repeatCount ?? 1);
  const diamantes = Number(raw?.diamondCount ?? 0);
  return {
    tipo: 'presente',
    ...dadosUsuario(raw),
    presente: String(raw?.giftName ?? 'presente'),
    valorMoedas: diamantes * repeat,
  };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run tests/normalize.test.js`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/server/normalize.js tests/normalize.test.js
git commit -m "feat: normalização dos eventos do TikTok"
```

---

### Task 3: Escala do presente

**Files:**
- Create: `src/overlay/gift-scale.js`
- Test: `tests/gift-scale.test.js`

- [ ] **Step 1: Escrever o teste que falha**

`tests/gift-scale.test.js`:

```js
import { test, expect } from 'vitest';
import { escalaPresente } from '../src/overlay/gift-scale.js';

test('presente barato = efeito pequeno', () => {
  const e = escalaPresente(1);
  expect(e.nivel).toBe('pequeno');
  expect(e.escala).toBeCloseTo(1.4);
  expect(e.confetes).toBeLessThanOrEqual(20);
});

test('presente médio', () => {
  expect(escalaPresente(50).nivel).toBe('medio');
});

test('presente caro = explosão', () => {
  const e = escalaPresente(500);
  expect(e.nivel).toBe('grande');
  expect(e.confetes).toBeGreaterThanOrEqual(120);
  expect(e.duracaoMs).toBeGreaterThanOrEqual(4000);
});

test('valor inválido cai no pequeno', () => {
  expect(escalaPresente(undefined).nivel).toBe('pequeno');
});
```

- [ ] **Step 2: Rodar pra ver falhar**

Run: `npx vitest run tests/gift-scale.test.js`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/overlay/gift-scale.js`**

```js
// Traduz o valor em moedas de um presente no tamanho/duração do efeito visual.
export function escalaPresente(valorMoedas) {
  const v = Number.isFinite(Number(valorMoedas)) ? Number(valorMoedas) : 0;
  if (v > 100) {
    return { nivel: 'grande', escala: 2.6, duracaoMs: 5000, confetes: 160 };
  }
  if (v > 5) {
    return { nivel: 'medio', escala: 2.0, duracaoMs: 3500, confetes: 70 };
  }
  return { nivel: 'pequeno', escala: 1.4, duracaoMs: 2500, confetes: 18 };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run tests/gift-scale.test.js`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/overlay/gift-scale.js tests/gift-scale.test.js
git commit -m "feat: escala visual do presente por valor"
```

---

### Task 4: Throttle anti-enxurrada

**Files:**
- Create: `src/overlay/throttle.js`
- Test: `tests/throttle.test.js`

- [ ] **Step 1: Escrever o teste que falha**

`tests/throttle.test.js`:

```js
import { test, expect } from 'vitest';
import { criarThrottle } from '../src/overlay/throttle.js';

test('permite o primeiro evento e bloqueia repetição dentro da janela', () => {
  let agora = 1000;
  const th = criarThrottle(500, () => agora);
  expect(th.permitir('fulano')).toBe(true);
  agora = 1100;
  expect(th.permitir('fulano')).toBe(false);
  agora = 1600;
  expect(th.permitir('fulano')).toBe(true);
});

test('usuários diferentes não interferem', () => {
  let agora = 0;
  const th = criarThrottle(500, () => agora);
  expect(th.permitir('a')).toBe(true);
  expect(th.permitir('b')).toBe(true);
});
```

- [ ] **Step 2: Rodar pra ver falhar**

Run: `npx vitest run tests/throttle.test.js`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/overlay/throttle.js`**

```js
// Throttle por usuário: evita animar N vezes numa enxurrada de eventos iguais
// (ex: rajada de curtidas). `agora` é injetável pra facilitar testes.
export function criarThrottle(janelaMs, agora = () => Date.now()) {
  const ultimo = new Map();
  return {
    permitir(usuario) {
      const t = agora();
      const anterior = ultimo.get(usuario) ?? -Infinity;
      if (t - anterior < janelaMs) return false;
      ultimo.set(usuario, t);
      return true;
    },
  };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run tests/throttle.test.js`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/overlay/throttle.js tests/throttle.test.js
git commit -m "feat: throttle por usuário contra enxurrada de eventos"
```

---

### Task 5: Registry de avatares (limite, inatividade, estilo)

**Files:**
- Create: `src/overlay/avatar-registry.js`
- Test: `tests/avatar-registry.test.js`

O registry é a lógica pura de ciclo de vida dos avatares (sem PixiJS). O overlay usa a mesma classe para saber quem criar/remover.

- [ ] **Step 1: Escrever o teste que falha**

`tests/avatar-registry.test.js`:

```js
import { test, expect } from 'vitest';
import { CriarRegistry, estiloDoUsuario } from '../src/overlay/avatar-registry.js';

test('estilo é determinístico por usuário (blob ou pixel)', () => {
  expect(estiloDoUsuario('fulano')).toBe(estiloDoUsuario('fulano'));
  expect(['blob', 'pixel']).toContain(estiloDoUsuario('fulano'));
});

test('registrar cria avatar novo com estilo e @', () => {
  const r = CriarRegistry({ limite: 5, inatividadeMs: 1000 });
  const res = r.registrar('fulano', 1000);
  expect(res.novo).toBe(true);
  expect(res.avatar.usuario).toBe('fulano');
  expect(['blob', 'pixel']).toContain(res.avatar.estilo);
  expect(res.removidos).toEqual([]);
});

test('registrar de novo não cria, só atualiza atividade', () => {
  const r = CriarRegistry({ limite: 5, inatividadeMs: 1000 });
  r.registrar('fulano', 1000);
  const res = r.registrar('fulano', 1500);
  expect(res.novo).toBe(false);
});

test('estoura o limite removendo o menos ativo', () => {
  const r = CriarRegistry({ limite: 2, inatividadeMs: 10000 });
  r.registrar('a', 100);
  r.registrar('b', 200);
  const res = r.registrar('c', 300); // estoura -> remove 'a'
  expect(res.novo).toBe(true);
  expect(res.removidos).toEqual(['a']);
  expect(r.tem('a')).toBe(false);
  expect(r.tem('c')).toBe(true);
});

test('expirarInativos remove quem passou do tempo', () => {
  const r = CriarRegistry({ limite: 5, inatividadeMs: 1000 });
  r.registrar('a', 1000);
  r.registrar('b', 1500);
  const removidos = r.expirarInativos(2200); // 'a' inativo há 1200ms
  expect(removidos).toEqual(['a']);
  expect(r.tem('b')).toBe(true);
});
```

- [ ] **Step 2: Rodar pra ver falhar**

Run: `npx vitest run tests/avatar-registry.test.js`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/overlay/avatar-registry.js`**

```js
// Hash simples e estável (djb2) -> escolhe o estilo do avatar.
// Mesmo usuário sempre recebe o mesmo estilo.
export function estiloDoUsuario(usuario) {
  let h = 5381;
  for (let i = 0; i < usuario.length; i++) h = ((h << 5) + h + usuario.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? 'blob' : 'pixel';
}

export function CriarRegistry({ limite, inatividadeMs }) {
  // usuario -> { usuario, estilo, ultimaInteracao }
  const avatares = new Map();

  function maisAntigo() {
    let alvo = null;
    for (const a of avatares.values()) {
      if (!alvo || a.ultimaInteracao < alvo.ultimaInteracao) alvo = a;
    }
    return alvo;
  }

  return {
    registrar(usuario, agora) {
      const existente = avatares.get(usuario);
      if (existente) {
        existente.ultimaInteracao = agora;
        return { novo: false, avatar: existente, removidos: [] };
      }
      const removidos = [];
      while (avatares.size >= limite) {
        const velho = maisAntigo();
        if (!velho) break;
        avatares.delete(velho.usuario);
        removidos.push(velho.usuario);
      }
      const avatar = { usuario, estilo: estiloDoUsuario(usuario), ultimaInteracao: agora };
      avatares.set(usuario, avatar);
      return { novo: true, avatar, removidos };
    },

    expirarInativos(agora) {
      const removidos = [];
      for (const a of avatares.values()) {
        if (agora - a.ultimaInteracao > inatividadeMs) removidos.push(a.usuario);
      }
      for (const u of removidos) avatares.delete(u);
      return removidos;
    },

    tem(usuario) { return avatares.has(usuario); },
    lista() { return [...avatares.values()]; },
  };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run tests/avatar-registry.test.js`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/overlay/avatar-registry.js tests/avatar-registry.test.js
git commit -m "feat: registry de avatares (limite, inatividade, estilo)"
```

---

### Task 6: Servidor estático do overlay

**Files:**
- Create: `src/server/static-server.js`

Serve os arquivos de `src/overlay/` por HTTP (sem dependências extras), pra o Live Studio apontar pra `http://localhost:PORTA`.

- [ ] **Step 1: Implementar `src/server/static-server.js`**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, normalize, extname } from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export function criarServidorEstatico() {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const raizOverlay = resolve(aqui, '../overlay');

  return createServer(async (req, res) => {
    try {
      let caminho = decodeURIComponent(req.url.split('?')[0]);
      if (caminho === '/') caminho = '/index.html';
      const abs = normalize(resolve(raizOverlay, '.' + caminho));
      if (!abs.startsWith(raizOverlay)) { res.writeHead(403).end('proibido'); return; }
      const conteudo = await readFile(abs);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(abs)] ?? 'application/octet-stream' });
      res.end(conteudo);
    } catch {
      res.writeHead(404).end('não encontrado');
    }
  });
}
```

- [ ] **Step 2: Verificação manual (rápida)**

Crie temporariamente `src/overlay/index.html` com `<h1>ok</h1>` (será substituído na Task 11), então rode:

```bash
node -e "import('./src/server/static-server.js').then(m=>{const s=m.criarServidorEstatico();s.listen(8737,()=>console.log('http://localhost:8737'))})"
```

Abra `http://localhost:8737` no navegador.
Expected: aparece "ok". Encerre com Ctrl+C e apague o `index.html` temporário (ou deixe pra Task 11 sobrescrever).

- [ ] **Step 3: Commit**

```bash
git add src/server/static-server.js
git commit -m "feat: servidor estático do overlay"
```

---

### Task 7: Bridge WebSocket

**Files:**
- Create: `src/server/bridge.js`
- Test: `tests/bridge.test.js`

- [ ] **Step 1: Escrever o teste que falha**

`tests/bridge.test.js`:

```js
import { test, expect } from 'vitest';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { criarBridge } from '../src/server/bridge.js';

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

test('broadcast entrega evento a um cliente conectado', async () => {
  const http = createServer();
  const bridge = criarBridge(http);
  await new Promise(r => http.listen(0, r));
  const porta = http.address().port;

  const cliente = new WebSocket(`ws://localhost:${porta}`);
  const recebidos = [];
  cliente.on('message', (m) => recebidos.push(JSON.parse(m.toString())));
  await new Promise(r => cliente.on('open', r));

  bridge.broadcast({ tipo: 'comentario', usuario: 'fulano' });
  await esperar(50);

  expect(recebidos).toEqual([{ tipo: 'comentario', usuario: 'fulano' }]);
  expect(bridge.clientes()).toBe(1);

  cliente.close();
  await new Promise(r => http.close(r));
});
```

- [ ] **Step 2: Rodar pra ver falhar**

Run: `npx vitest run tests/bridge.test.js`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/server/bridge.js`**

```js
import { WebSocketServer } from 'ws';

// Anexa um servidor WebSocket a um http.Server existente e permite broadcast.
export function criarBridge(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  return {
    broadcast(evento) {
      const msg = JSON.stringify(evento);
      for (const ws of wss.clients) {
        if (ws.readyState === ws.OPEN) ws.send(msg);
      }
    },
    clientes() { return wss.clients.size; },
    fechar() { wss.close(); },
  };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run tests/bridge.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/bridge.js tests/bridge.test.js
git commit -m "feat: bridge WebSocket com broadcast"
```

---

### Task 8: Connector do TikTok

**Files:**
- Create: `src/server/connector.js`
- Test: `tests/connector.test.js`

O connector recebe a conexão por injeção de dependência (`criarConexao`), o que permite testar com um `EventEmitter` falso — sem live real.

- [ ] **Step 1: Escrever o teste que falha**

`tests/connector.test.js`:

```js
import { test, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { criarConnector } from '../src/server/connector.js';

function fakeConexao() {
  const em = new EventEmitter();
  em.connect = async () => ({ roomId: '1' });
  em.disconnect = () => {};
  return em;
}

test('encaminha comentário normalizado', async () => {
  const conexao = fakeConexao();
  const recebidos = [];
  const c = criarConnector('fulano', {
    criarConexao: () => conexao,
    aoEvento: (e) => recebidos.push(e),
  });
  await c.conectar();
  conexao.emit('chat', { uniqueId: 'ana', nickname: 'Ana', profilePictureUrl: 'f', comment: 'oi' });
  expect(recebidos[0]).toEqual({ tipo: 'comentario', usuario: 'ana', nome: 'Ana', fotoUrl: 'f' });
});

test('presente streakável intermediário não é encaminhado', async () => {
  const conexao = fakeConexao();
  const recebidos = [];
  const c = criarConnector('fulano', { criarConexao: () => conexao, aoEvento: (e) => recebidos.push(e) });
  await c.conectar();
  conexao.emit('gift', { uniqueId: 'ana', giftName: 'rosa', diamondCount: 1, repeatCount: 1, giftType: 1, repeatEnd: false });
  expect(recebidos).toHaveLength(0);
  conexao.emit('gift', { uniqueId: 'ana', giftName: 'rosa', diamondCount: 1, repeatCount: 2, giftType: 1, repeatEnd: true });
  expect(recebidos[0].tipo).toBe('presente');
  expect(recebidos[0].valorMoedas).toBe(2);
});
```

- [ ] **Step 2: Rodar pra ver falhar**

Run: `npx vitest run tests/connector.test.js`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/server/connector.js`**

```js
import { WebcastPushConnection } from 'tiktok-live-connector';
import {
  normalizarComentario, normalizarEntrar, normalizarCurtida,
  normalizarSeguir, normalizarCompartilhar, normalizarPresente,
} from './normalize.js';

// Fábrica padrão da conexão real. Injetável nos testes.
function conexaoReal(usuario) {
  return new WebcastPushConnection(usuario);
}

export function criarConnector(usuario, {
  criarConexao = conexaoReal,
  aoEvento = () => {},
  aoStatus = () => {},
} = {}) {
  const conexao = criarConexao(usuario);

  function encaminhar(evento) {
    if (evento) aoEvento(evento);
  }

  conexao.on('chat', (d) => encaminhar(normalizarComentario(d)));
  conexao.on('member', (d) => encaminhar(normalizarEntrar(d)));
  conexao.on('like', (d) => encaminhar(normalizarCurtida(d)));
  conexao.on('gift', (d) => encaminhar(normalizarPresente(d)));
  conexao.on('follow', (d) => encaminhar(normalizarSeguir(d)));
  conexao.on('share', (d) => encaminhar(normalizarCompartilhar(d)));
  // Versões antigas emitem 'social' com displayType indicando follow/share.
  conexao.on('social', (d) => {
    const tipo = String(d?.displayType ?? '');
    if (tipo.includes('follow')) encaminhar(normalizarSeguir(d));
    else if (tipo.includes('share')) encaminhar(normalizarCompartilhar(d));
  });

  conexao.on('disconnected', () => aoStatus({ estado: 'desconectado' }));

  async function conectar() {
    try {
      const estado = await conexao.connect();
      aoStatus({ estado: 'conectado', sala: estado?.roomId });
      return estado;
    } catch (err) {
      aoStatus({ estado: 'erro', erro: String(err?.message ?? err) });
      throw err;
    }
  }

  return {
    conectar,
    desconectar() { try { conexao.disconnect(); } catch {} },
  };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run tests/connector.test.js`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/server/connector.js tests/connector.test.js
git commit -m "feat: connector do TikTok com injeção de dependência"
```

---

### Task 9: Simulador de eventos

**Files:**
- Create: `src/server/simulator.js`
- Test: `tests/simulator.test.js`

- [ ] **Step 1: Escrever o teste que falha**

`tests/simulator.test.js`:

```js
import { test, expect } from 'vitest';
import { gerarEventoAleatorio, TIPOS_SIMULAVEIS } from '../src/server/simulator.js';

test('gera evento com formato normalizado válido', () => {
  for (let i = 0; i < 50; i++) {
    const e = gerarEventoAleatorio(() => 0.5);
    expect(TIPOS_SIMULAVEIS).toContain(e.tipo);
    expect(typeof e.usuario).toBe('string');
    expect(e.usuario.length).toBeGreaterThan(0);
    if (e.tipo === 'presente') expect(typeof e.valorMoedas).toBe('number');
  }
});
```

- [ ] **Step 2: Rodar pra ver falhar**

Run: `npx vitest run tests/simulator.test.js`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/server/simulator.js`**

```js
export const TIPOS_SIMULAVEIS = ['comentario', 'entrar', 'curtida', 'seguir', 'presente', 'compartilhar'];

const NOMES = ['ana', 'bruno', 'carla', 'dan', 'edu', 'fer', 'gi', 'hugo', 'isa', 'joao'];
const PRESENTES = [
  { nome: 'rosa', moedas: 1 },
  { nome: 'sorvete', moedas: 5 },
  { nome: 'chapeu', moedas: 50 },
  { nome: 'leao', moedas: 300 },
  { nome: 'foguete', moedas: 1000 },
];

// `rnd` injetável (retorna 0..1) pra testes determinísticos.
export function gerarEventoAleatorio(rnd = Math.random) {
  const escolher = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
  const usuario = escolher(NOMES) + Math.floor(rnd() * 90 + 10);
  const tipo = escolher(TIPOS_SIMULAVEIS);
  const evento = { tipo, usuario, nome: usuario, fotoUrl: `https://i.pravatar.cc/80?u=${usuario}` };
  if (tipo === 'curtida') evento.quantidade = Math.floor(rnd() * 10) + 1;
  if (tipo === 'presente') {
    const p = escolher(PRESENTES);
    evento.presente = p.nome;
    evento.valorMoedas = p.moedas;
  }
  return evento;
}

// Dispara eventos num intervalo. Retorna função pra parar.
export function iniciarSimulador(aoEvento, intervaloMs = 900) {
  const id = setInterval(() => aoEvento(gerarEventoAleatorio()), intervaloMs);
  return () => clearInterval(id);
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run tests/simulator.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/simulator.js tests/simulator.test.js
git commit -m "feat: simulador de eventos pra testar sem live"
```

---

### Task 10: Entry do servidor

**Files:**
- Create: `src/server/index.js`

Junta config + servidor estático + bridge + (connector OU simulador). Modo simulador com `--sim`. Reconexão automática do connector quando a live não estiver no ar.

- [ ] **Step 1: Implementar `src/server/index.js`**

```js
import { carregarConfig } from './config.js';
import { criarServidorEstatico } from './static-server.js';
import { criarBridge } from './bridge.js';
import { criarConnector } from './connector.js';
import { iniciarSimulador } from './simulator.js';

const MODO_SIM = process.argv.includes('--sim');

function main() {
  const cfg = carregarConfig();
  const http = criarServidorEstatico();
  const bridge = criarBridge(http);

  http.listen(cfg.porta, () => {
    console.log(`\n  Live Avatars no ar 🎉`);
    console.log(`  Overlay:  http://localhost:${cfg.porta}`);
    console.log(`  (adicione essa URL como Fonte de Navegador no TikTok Live Studio)\n`);
  });

  if (MODO_SIM) {
    console.log('  MODO SIMULADOR: gerando eventos falsos.\n');
    iniciarSimulador((e) => bridge.broadcast(e));
    return;
  }

  conectarComRetry(cfg, bridge);
}

function conectarComRetry(cfg, bridge) {
  const connector = criarConnector(cfg.usuarioTikTok, {
    aoEvento: (e) => bridge.broadcast(e),
    aoStatus: (s) => {
      if (s.estado === 'conectado') console.log(`  Conectado à live de @${cfg.usuarioTikTok} ✅`);
      if (s.estado === 'desconectado') tentarReconectar(cfg, bridge, 'live encerrada/queda');
    },
  });
  connector.conectar().catch(() => {
    tentarReconectar(cfg, bridge, `live de @${cfg.usuarioTikTok} offline ou @ inválido`);
  });
}

function tentarReconectar(cfg, bridge, motivo) {
  console.log(`  ⚠  ${motivo}. Tentando novamente em 15s...`);
  setTimeout(() => conectarComRetry(cfg, bridge), 15000);
}

main();
```

- [ ] **Step 2: Verificação manual (modo simulador)**

Run: `npm run sim`
Expected: imprime "Live Avatars no ar" e a URL; sem crash. (Ainda sem overlay visual — Task 11.) Encerre com Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/server/index.js
git commit -m "feat: entry do servidor (connector/simulador + reconexão)"
```

---

### Task 11: Overlay — página + cliente WebSocket

**Files:**
- Create: `src/overlay/index.html`
- Create: `src/overlay/ws-client.js`

- [ ] **Step 1: Criar `src/overlay/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <title>Live Avatars</title>
  <style>
    html, body { margin: 0; height: 100%; background: transparent; overflow: hidden; }
    #palco { position: fixed; inset: 0; }
    #status { position: fixed; top: 8px; left: 8px; font: 12px system-ui; color: #fff;
      background: #0006; padding: 4px 8px; border-radius: 6px; }
    #status.ok { display: none; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.js"></script>
</head>
<body>
  <div id="palco"></div>
  <div id="status">conectando…</div>
  <script type="module" src="./overlay.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `src/overlay/ws-client.js`**

```js
// Cliente WebSocket com reconexão automática. Deriva a URL do próprio host.
export function conectarWS({ aoEvento, aoStatus }) {
  let ws;
  function abrir() {
    const url = `ws://${location.host}`;
    ws = new WebSocket(url);
    ws.onopen = () => aoStatus('conectado');
    ws.onmessage = (ev) => {
      try { aoEvento(JSON.parse(ev.data)); } catch {}
    };
    ws.onclose = () => {
      aoStatus('reconectando');
      setTimeout(abrir, 2000);
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  abrir();
}
```

- [ ] **Step 3: Verificação manual**

Deixe rodando `npm run sim`, abra `http://localhost:8737`. Abra o console do navegador (F12).
Expected: página carrega sem erro; `PIXI` existe no console (digite `PIXI.VERSION`). O texto "conectando…" aparece (overlay.js ainda não existe — será criado na Task 15; por ora crie um stub vazio `src/overlay/overlay.js` com `// stub` só pra não dar 404, será sobrescrito).

- [ ] **Step 4: Commit**

```bash
git add src/overlay/index.html src/overlay/ws-client.js src/overlay/overlay.js
git commit -m "feat: overlay HTML + cliente WebSocket com reconexão"
```

---

### Task 12: Cena PixiJS (chão + zona de destaque)

**Files:**
- Create: `src/overlay/scene.js`

- [ ] **Step 1: Criar `src/overlay/scene.js`**

```js
// Cria a aplicação PixiJS transparente e as camadas da cena.
// Layout: chão no rodapé; zona de destaque no centro-alto.
export async function criarCena(elemento) {
  const app = new PIXI.Application();
  await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: true });
  elemento.appendChild(app.canvas);

  const camadaChao = new PIXI.Container();       // avatares andando
  const camadaEfeitos = new PIXI.Container();    // corações, confete, estrelas
  const camadaDestaque = new PIXI.Container();   // presente em destaque
  app.stage.addChild(camadaChao, camadaEfeitos, camadaDestaque);

  function linhaChao() { return app.screen.height - 90; }
  function pontoDestaque() { return { x: app.screen.width / 2, y: app.screen.height * 0.28 }; }

  return { app, camadaChao, camadaEfeitos, camadaDestaque, linhaChao, pontoDestaque };
}
```

- [ ] **Step 2: Verificação manual**

Temporariamente, edite `src/overlay/overlay.js` para:

```js
import { criarCena } from './scene.js';
const cena = await criarCena(document.getElementById('palco'));
const teste = new PIXI.Graphics().circle(0, 0, 30).fill(0xff6b9d);
teste.x = 200; teste.y = cena.linhaChao();
cena.camadaChao.addChild(teste);
```

Rode `npm run sim`, abra `http://localhost:8737`.
Expected: um círculo rosa aparece perto do rodapé, sobre fundo transparente (a página fica "vazia" com o círculo). Sem erros no console. Reverta esse `overlay.js` de teste depois (a Task 15 escreve o definitivo).

- [ ] **Step 3: Commit**

```bash
git add src/overlay/scene.js
git commit -m "feat: cena PixiJS (chão + zona de destaque)"
```

---

### Task 13: Desenho e sprite do avatar (blob/pixel + andar + @)

**Files:**
- Create: `src/overlay/styles.js`
- Create: `src/overlay/avatar.js`

- [ ] **Step 1: Criar `src/overlay/styles.js`**

```js
const CORES = [0xff6b9d, 0x4fd1c5, 0xffd166, 0x6c8cff, 0xe63946, 0x2a9d8f];

function corDe(usuario) {
  let h = 0;
  for (let i = 0; i < usuario.length; i++) h = (h + usuario.charCodeAt(i)) % CORES.length;
  return CORES[h];
}

// Desenha um blob fofo dentro de um Container.
function desenharBlob(usuario) {
  const c = new PIXI.Container();
  const cor = corDe(usuario);
  const corpo = new PIXI.Graphics().roundRect(-26, -60, 52, 60, 22).fill(cor);
  const olhoE = new PIXI.Graphics().circle(-10, -34, 5).fill(0xffffff);
  const olhoD = new PIXI.Graphics().circle(10, -34, 5).fill(0xffffff);
  const pupE = new PIXI.Graphics().circle(-9, -33, 2).fill(0x111111);
  const pupD = new PIXI.Graphics().circle(11, -33, 2).fill(0x111111);
  c.addChild(corpo, olhoE, olhoD, pupE, pupD);
  return c;
}

// Desenha um personagem pixel art simples dentro de um Container.
function desenharPixel(usuario) {
  const c = new PIXI.Container();
  const cor = corDe(usuario);
  const cabeca = new PIXI.Graphics().rect(-16, -60, 32, 26).fill(0xf4c28a);
  const cabelo = new PIXI.Graphics().rect(-16, -60, 32, 8).fill(0x5b3a2e);
  const olhoE = new PIXI.Graphics().rect(-10, -48, 5, 5).fill(0x111111);
  const olhoD = new PIXI.Graphics().rect(6, -48, 5, 5).fill(0x111111);
  const corpo = new PIXI.Graphics().rect(-20, -34, 40, 26).fill(cor);
  const pernaE = new PIXI.Graphics().rect(-16, -8, 12, 8).fill(0x3a3f52);
  const pernaD = new PIXI.Graphics().rect(4, -8, 12, 8).fill(0x3a3f52);
  c.addChild(cabeca, cabelo, olhoE, olhoD, corpo, pernaE, pernaD);
  return c;
}

export function desenharAvatar(estilo, usuario) {
  return estilo === 'pixel' ? desenharPixel(usuario) : desenharBlob(usuario);
}
```

- [ ] **Step 2: Criar `src/overlay/avatar.js`**

```js
import { desenharAvatar } from './styles.js';

// Representa um avatar na tela: corpo + label @, com passeio pelo chão.
export function criarAvatarVisual({ usuario, estilo }, cena) {
  const raiz = new PIXI.Container();
  const corpo = desenharAvatar(estilo, usuario);
  raiz.addChild(corpo);

  const label = new PIXI.Text({
    text: '@' + usuario,
    style: { fontFamily: 'system-ui', fontSize: 12, fill: 0xffffff, stroke: { color: 0x000000, width: 3 } },
  });
  label.anchor.set(0.5, 0);
  label.y = 6;
  raiz.addChild(label);

  // Entra caminhando por uma das bordas em direção ao centro.
  const larguraTela = cena.app.screen.width;
  raiz.x = Math.random() < 0.5 ? -30 : larguraTela + 30;
  raiz.y = cena.linhaChao();
  cena.camadaChao.addChild(raiz);

  let direcao = raiz.x < 0 ? 1 : -1;
  let velocidade = 0.02 + Math.random() * 0.02; // px por ms
  let saindo = false;
  let pausado = false;

  function andar(dtMs) {
    if (pausado) return;
    raiz.x += direcao * velocidade * dtMs;
    corpo.scale.x = direcao; // "olha" pra onde anda
    const larg = cena.app.screen.width;
    if (!saindo) {
      if (raiz.x < 30) direcao = 1;
      if (raiz.x > larg - 30) direcao = -1;
    }
  }

  function pular() {
    const base = cena.linhaChao();
    let t = 0;
    const dur = 400, altura = 34;
    const anim = (ticker) => {
      t += ticker.deltaMS;
      const p = Math.min(1, t / dur);
      raiz.y = base - Math.sin(p * Math.PI) * altura;
      if (p >= 1) { raiz.y = base; cena.app.ticker.remove(anim); }
    };
    cena.app.ticker.add(anim);
  }

  function sair(aoFim) {
    saindo = true;
    direcao = raiz.x < cena.app.screen.width / 2 ? -1 : 1;
    velocidade = 0.12;
    const anim = (ticker) => {
      andar(ticker.deltaMS);
      if (raiz.x < -60 || raiz.x > cena.app.screen.width + 60) {
        cena.app.ticker.remove(anim);
        raiz.destroy({ children: true });
        aoFim?.();
      }
    };
    cena.app.ticker.add(anim);
  }

  return {
    raiz, corpo, usuario, andar, pular, sair,
    pausar: () => { pausado = true; },
    retomar: () => { pausado = false; },
    posicao: () => ({ x: raiz.x, y: raiz.y }),
  };
}
```

- [ ] **Step 3: Verificação manual**

Temporariamente ponha em `overlay.js`:

```js
import { criarCena } from './scene.js';
import { criarAvatarVisual } from './avatar.js';
const cena = await criarCena(document.getElementById('palco'));
const a = criarAvatarVisual({ usuario: 'teste', estilo: 'blob' }, cena);
const b = criarAvatarVisual({ usuario: 'outro', estilo: 'pixel' }, cena);
cena.app.ticker.add((t) => { a.andar(t.deltaMS); b.andar(t.deltaMS); });
setInterval(() => a.pular(), 1500);
```

Rode `npm run sim`, abra a URL.
Expected: dois bonequinhos (um blob rosa/colorido, um pixel) andando pelo rodapé com o `@` embaixo; o blob pula a cada 1,5s. Reverta o `overlay.js` depois.

- [ ] **Step 4: Commit**

```bash
git add src/overlay/styles.js src/overlay/avatar.js
git commit -m "feat: desenho blob/pixel + sprite do avatar (andar, pular, sair, label)"
```

---

### Task 14: Reações (animações por tipo de evento)

**Files:**
- Create: `src/overlay/reactions.js`

- [ ] **Step 1: Criar `src/overlay/reactions.js`**

```js
import { escalaPresente } from './gift-scale.js';

function particula(cena, x, y, cor, forma = 'circulo') {
  const g = new PIXI.Graphics();
  if (forma === 'circulo') g.circle(0, 0, 5).fill(cor);
  else if (forma === 'coracao') g.circle(-3, 0, 3).fill(cor).circle(3, 0, 3).fill(cor).rect(-5, 0, 10, 6).fill(cor);
  else g.star(0, 0, 5, 7).fill(cor);
  g.x = x; g.y = y;
  cena.camadaEfeitos.addChild(g);
  return g;
}

function animarSubindo(cena, g, dur, driftX) {
  let t = 0;
  const anim = (ticker) => {
    t += ticker.deltaMS;
    const p = t / dur;
    g.y -= 0.05 * ticker.deltaMS;
    g.x += driftX * ticker.deltaMS;
    g.alpha = 1 - p;
    if (p >= 1) { cena.app.ticker.remove(anim); g.destroy(); }
  };
  cena.app.ticker.add(anim);
}

export function reacaoCuracao(cena, avatar) { // corações (curtida)
  const { x, y } = avatar.posicao();
  for (let i = 0; i < 4; i++) {
    const g = particula(cena, x + (Math.random() * 30 - 15), y - 50, 0xff5d8f, 'coracao');
    animarSubindo(cena, g, 1200, (Math.random() - 0.5) * 0.02);
  }
}

export function reacaoEstrelas(cena, avatar) { // compartilhar
  const { x, y } = avatar.posicao();
  for (let i = 0; i < 6; i++) {
    const g = particula(cena, x + (Math.random() * 40 - 20), y - 50, 0xffd166, 'estrela');
    animarSubindo(cena, g, 1000, (Math.random() - 0.5) * 0.05);
  }
}

export function reacaoSeguir(cena, avatar, nome) { // confete + faixa
  explodirConfete(cena, avatar.posicao().x, avatar.posicao().y - 50, 40);
  const faixa = new PIXI.Text({
    text: `⭐ novo seguidor: @${nome} 💖`,
    style: { fontFamily: 'system-ui', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 4 } },
  });
  faixa.anchor.set(0.5);
  faixa.x = cena.app.screen.width / 2;
  faixa.y = cena.app.screen.height * 0.15;
  cena.camadaEfeitos.addChild(faixa);
  let t = 0;
  const anim = (ticker) => {
    t += ticker.deltaMS;
    if (t > 2500) { faixa.alpha -= 0.02; }
    if (faixa.alpha <= 0) { cena.app.ticker.remove(anim); faixa.destroy(); }
  };
  cena.app.ticker.add(anim);
}

function explodirConfete(cena, x, y, quantidade) {
  const cores = [0xff6b9d, 0x4fd1c5, 0xffd166, 0x6c8cff, 0xe63946];
  for (let i = 0; i < quantidade; i++) {
    const g = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(cores[i % cores.length]);
    g.x = x; g.y = y;
    cena.camadaEfeitos.addChild(g);
    let vx = (Math.random() - 0.5) * 0.4;
    let vy = -Math.random() * 0.5 - 0.2;
    let t = 0;
    const anim = (ticker) => {
      t += ticker.deltaMS;
      vy += 0.001 * ticker.deltaMS; // gravidade
      g.x += vx * ticker.deltaMS;
      g.y += vy * ticker.deltaMS;
      g.rotation += 0.01 * ticker.deltaMS;
      g.alpha = Math.max(0, 1 - t / 2500);
      if (g.alpha <= 0) { cena.app.ticker.remove(anim); g.destroy(); }
    };
    cena.app.ticker.add(anim);
  }
}

// Presente: leva o avatar pro destaque, aplica escala e confete proporcional.
export function reacaoPresente(cena, avatar, evento) {
  const e = escalaPresente(evento.valorMoedas);
  const alvo = cena.pontoDestaque();
  const inicio = avatar.posicao();
  const base = cena.linhaChao();
  avatar.pausar(); // pausa o passeio enquanto está em destaque
  let t = 0;
  const subir = 700;
  const animar = (ticker) => {
    t += ticker.deltaMS;
    const p = Math.min(1, t / subir);
    avatar.raiz.x = inicio.x + (alvo.x - inicio.x) * p;
    avatar.raiz.y = inicio.y + (alvo.y - inicio.y) * p;
    avatar.raiz.scale.set(1 + (e.escala - 1) * p);
    if (p >= 1) {
      cena.app.ticker.remove(animar);
      explodirConfete(cena, alvo.x, alvo.y, e.confetes);
      setTimeout(() => voltar(), e.duracaoMs);
    }
  };
  function voltar() {
    let t2 = 0;
    const de = { x: avatar.raiz.x, y: avatar.raiz.y, s: avatar.raiz.scale.x };
    const anim2 = (ticker) => {
      t2 += ticker.deltaMS;
      const p = Math.min(1, t2 / 500);
      avatar.raiz.x = de.x + (inicio.x - de.x) * p;
      avatar.raiz.y = de.y + (base - de.y) * p;
      avatar.raiz.scale.set(de.s + (1 - de.s) * p);
      if (p >= 1) { cena.app.ticker.remove(anim2); avatar.retomar(); }
    };
    cena.app.ticker.add(anim2);
  }
  cena.app.ticker.add(animar);
}
```

- [ ] **Step 2: Verificação manual**

Temporariamente em `overlay.js`:

```js
import { criarCena } from './scene.js';
import { criarAvatarVisual } from './avatar.js';
import * as R from './reactions.js';
const cena = await criarCena(document.getElementById('palco'));
const a = criarAvatarVisual({ usuario: 'teste', estilo: 'blob' }, cena);
cena.app.ticker.add((t) => a.andar(t.deltaMS));
window.addEventListener('keydown', (ev) => {
  if (ev.key === '1') R.reacaoCuracao(cena, a);
  if (ev.key === '2') R.reacaoEstrelas(cena, a);
  if (ev.key === '3') R.reacaoSeguir(cena, a, 'teste');
  if (ev.key === '4') R.reacaoPresente(cena, a, { valorMoedas: 1 });
  if (ev.key === '5') R.reacaoPresente(cena, a, { valorMoedas: 500 });
});
```

Rode `npm run sim`, abra a URL, clique na página e aperte teclas 1–5.
Expected: 1=corações, 2=estrelas, 3=confete+faixa, 4=vai ao destaque com pouco confete, 5=destaque grande com explosão de confete e volta ao chão. Reverta o `overlay.js`.

- [ ] **Step 3: Commit**

```bash
git add src/overlay/reactions.js
git commit -m "feat: reações (corações, estrelas, confete/faixa, destaque de presente)"
```

---

### Task 15: Avatar-manager + bootstrap do overlay

**Files:**
- Create: `src/overlay/avatar-manager.js`
- Modify: `src/overlay/overlay.js` (substitui o stub/testes anteriores)

Cola o registry (lógica) ao rendering e às reações. Aplica limite, expiração por inatividade e throttle de curtidas.

- [ ] **Step 1: Criar `src/overlay/avatar-manager.js`**

```js
import { CriarRegistry } from './avatar-registry.js';
import { criarThrottle } from './throttle.js';
import { criarAvatarVisual } from './avatar.js';
import * as R from './reactions.js';

export function criarGerenciador(cena, cfg) {
  const registry = CriarRegistry({
    limite: cfg.limiteAvatares,
    inatividadeMs: cfg.inatividadeSegundos * 1000,
  });
  const throttleCurtida = criarThrottle(1500);
  const visuais = new Map(); // usuario -> avatarVisual

  function garantir(evento) {
    const res = registry.registrar(evento.usuario, Date.now());
    for (const u of res.removidos) removerVisual(u);
    if (res.novo) {
      const v = criarAvatarVisual(res.avatar, cena);
      visuais.set(evento.usuario, v);
    }
    return visuais.get(evento.usuario);
  }

  function removerVisual(usuario) {
    const v = visuais.get(usuario);
    if (v) { visuais.delete(usuario); v.sair(); }
  }

  function tratar(evento) {
    if (evento.tipo === 'curtida' && !throttleCurtida.permitir(evento.usuario)) return;
    const v = garantir(evento);
    if (!v) return;
    switch (evento.tipo) {
      case 'comentario': v.pular(); break;
      case 'entrar': break; // já entrou andando ao ser criado
      case 'curtida': R.reacaoCuracao(cena, v); break;
      case 'seguir': R.reacaoSeguir(cena, v, evento.nome || evento.usuario); break;
      case 'compartilhar': R.reacaoEstrelas(cena, v); break;
      case 'presente': R.reacaoPresente(cena, v, evento); break;
    }
  }

  // Andar contínuo de todos os avatares.
  cena.app.ticker.add((ticker) => {
    for (const v of visuais.values()) v.andar(ticker.deltaMS);
  });

  // Expiração por inatividade a cada 5s.
  setInterval(() => {
    for (const u of registry.expirarInativos(Date.now())) removerVisual(u);
  }, 5000);

  return { tratar };
}
```

- [ ] **Step 2: Escrever `src/overlay/overlay.js` (definitivo)**

```js
import { criarCena } from './scene.js';
import { conectarWS } from './ws-client.js';
import { criarGerenciador } from './avatar-manager.js';

// Config mínima do overlay (limite/inatividade). Casada com o config do backend
// por valores padrão; o backend é a fonte de verdade dos eventos.
const CFG = { limiteAvatares: 18, inatividadeSegundos: 150 };

const statusEl = document.getElementById('status');

const cena = await criarCena(document.getElementById('palco'));
const gerenciador = criarGerenciador(cena, CFG);

conectarWS({
  aoEvento: (evento) => gerenciador.tratar(evento),
  aoStatus: (s) => {
    statusEl.textContent = s === 'conectado' ? '' : (s === 'reconectando' ? 'reconectando…' : s);
    statusEl.className = s === 'conectado' ? 'ok' : '';
  },
});
```

- [ ] **Step 3: Verificação manual (fim-a-fim com simulador)**

Run: `npm run sim` e abra `http://localhost:8737`.
Expected:
- Bonequinhos (blob e pixel misturados) surgem andando conforme os eventos falsos chegam.
- Comentários fazem pular; curtidas soltam corações; compartilhar solta estrelas; seguir mostra confete + faixa; presente leva ao destaque (pequeno/grande conforme o valor) e volta.
- Quando passam de ~18, os mais antigos saem andando.
- Sem erros no console.

- [ ] **Step 4: Commit**

```bash
git add src/overlay/avatar-manager.js src/overlay/overlay.js
git commit -m "feat: gerenciador (registry+rendering+reações) e bootstrap do overlay"
```

---

### Task 16: Launcher `.bat` + README

**Files:**
- Create: `iniciar.bat`
- Create: `README.md`

- [ ] **Step 1: Criar `iniciar.bat`**

```bat
@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Iniciando Live Avatars...
echo.
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)
start "" "http://localhost:8737"
call npm run dev
pause
```

- [ ] **Step 2: Criar `README.md`**

```markdown
# Live Avatars

Bonequinhos que reagem à sua live do TikTok (estilo Stream Avatars).

## Primeira vez
1. Instale o [Node.js LTS](https://nodejs.org).
2. Abra o arquivo `config/config.json` e coloque o seu @ do TikTok em `usuarioTikTok`.

## Usar na live
1. Dê **duplo-clique em `iniciar.bat`**. Ele sobe o programa e abre o overlay no navegador.
2. No **TikTok Live Studio**, adicione uma **Fonte de Navegador** apontando para:
   `http://localhost:8737`
   (largura 1080, altura 1920 — vertical). Faça isso só uma vez.
3. Comece sua live normalmente. Os bonequinhos aparecem sozinhos.

## Testar sem estar ao vivo
Rode o modo simulador (gera eventos falsos):
```
npm run sim
```
e abra `http://localhost:8737`.

## Ajustes (`config/config.json`)
- `usuarioTikTok` — seu @ (sem o @).
- `limiteAvatares` — máximo de bonequinhos na tela.
- `inatividadeSegundos` — tempo sem interagir até o bonequinho sair.
- `volumeEfeitos` — 0 a 1.
- `porta` — porta local (padrão 8737).
```

- [ ] **Step 3: Verificação manual**

Duplo-clique em `iniciar.bat` (com um `@` real e válido de uma live no ar em `config.json`, OU rode `npm run sim` pra testar sem live).
Expected: navegador abre no overlay; com live real, os eventos reais aparecem; com simulador, os falsos.

- [ ] **Step 4: Rodar toda a suíte de testes**

Run: `npm test`
Expected: todos os testes PASS.

- [ ] **Step 5: Commit**

```bash
git add iniciar.bat README.md
git commit -m "feat: launcher .bat de 1 clique + README"
```

---

## Verificação final (checklist fim-a-fim)

- [ ] `npm test` — toda a suíte verde.
- [ ] `npm run sim` + overlay: todos os 6 tipos de reação funcionam visualmente.
- [ ] Limite de avatares e saída por inatividade funcionam.
- [ ] Live real: `iniciar.bat` conecta pelo `@` do config; eventos reais aparecem; reconexão funciona (encerre e reabra a live pra testar).
- [ ] Overlay adicionado como Fonte de Navegador no Live Studio, vertical, fundo transparente sobre a câmera.

## Notas sobre a lib do TikTok

`tiktok-live-connector` é não-oficial e o formato de eventos pode mudar entre versões. O `connector.js` isola isso: se algum evento parar de chegar, ajuste apenas o mapeamento de nomes de eventos lá (a normalização e o resto do sistema não mudam). Eventos de seguir/compartilhar podem vir como `follow`/`share` dedicados ou dentro de `social` (ambos já tratados).
```
