# Peça 2a — Painel /admin base + controle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um painel React+Vite servido em `/admin` que edita config, cola a chave e inicia/para a conexão com status ao vivo, com o servidor subindo em modo idle (sem auto-conectar).

**Architecture:** Backend Node ganha um `connection-manager` controlável (start/stop/status) e um `admin-api` (`/admin/api/*`); o servidor HTTP roteia admin-api / painel / overlay; o status vai pro painel pelo WebSocket que já existe. Frontend React+Vite em `admin/`, buildado para `admin/dist/` (versionado).

**Tech Stack:** Node ESM, Vitest, ws, React 18 + Vite, PixiJS (overlay, inalterado).

**Regras gerais:**
- Branch `feat/mvp`. Commits **sem** co-author.
- Nunca `git add -A`/`.`; caminhos específicos.
- Backend por TDD. Frontend: verificação manual (sem browser automatizado aqui).
- Texto de UI em português; identificadores em inglês.

---

### Task 1: `config.js` — não exigir @ no validate + `saveConfig`/`saveKey`

No modelo idle o servidor sobe possivelmente sem `@` configurado, então `validateConfig` não
pode mais lançar erro com usuário vazio (a exigência migra para `connection-manager.start`).
Também adicionamos escrita de config e da chave.

**Files:**
- Modify: `src/server/config.js`
- Test: `tests/config.test.js`

- [ ] **Step 1: Atualizar `tests/config.test.js`** — trocar o teste que exige `@` e adicionar testes de `saveConfig`/`toRawConfig`:

```js
import { test, expect } from 'vitest';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateConfig, DEFAULT_CONFIG, saveConfig, toRawConfig } from '../src/server/config.js';

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

test('usuário vazio é permitido (modo idle) e vira string vazia', () => {
  expect(validateConfig({ usuarioTikTok: '' }).username).toBe('');
});

test('força limites numéricos sãos', () => {
  const cfg = validateConfig({ usuarioTikTok: 'x', limiteAvatares: 0, volumeEfeitos: 5 });
  expect(cfg.avatarLimit).toBeGreaterThanOrEqual(1);
  expect(cfg.effectsVolume).toBeLessThanOrEqual(1);
});

test('toRawConfig mapeia campos EN de volta para chaves PT', () => {
  expect(toRawConfig({ username: 'ana', avatarLimit: 20, inactivitySeconds: 100, effectsVolume: 0.5, port: 9000 }))
    .toEqual({ usuarioTikTok: 'ana', limiteAvatares: 20, inatividadeSegundos: 100, volumeEfeitos: 0.5, porta: 9000 });
});

test('saveConfig grava JSON com chaves PT e devolve config EN', () => {
  const dir = mkdtempSync(join(tmpdir(), 'la-'));
  const path = join(dir, 'config.json');
  writeFileSync(path, JSON.stringify({ usuarioTikTok: 'old', limiteAvatares: 18, inatividadeSegundos: 150, volumeEfeitos: 0.6, porta: 8737 }));
  const cfg = saveConfig({ username: 'nova', avatarLimit: 30, inactivitySeconds: 90, effectsVolume: 0.4, port: 8000 }, path);
  expect(cfg.username).toBe('nova');
  const gravado = JSON.parse(readFileSync(path, 'utf8'));
  expect(gravado.usuarioTikTok).toBe('nova');
  expect(gravado.limiteAvatares).toBe(30);
});
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/config.test.js` → FAIL (`saveConfig`/`toRawConfig` não existem; teste do usuário vazio ainda espera throw).

- [ ] **Step 3: Editar `src/server/config.js`** — (a) remover o `throw` de usuário vazio em `validateConfig`; (b) adicionar `toRawConfig`, `saveConfig`, `saveKey`. Trocar o bloco do `validateConfig` e acrescentar as funções:

```js
export function validateConfig(raw) {
  const username = String(raw?.usuarioTikTok ?? "").trim().replace(/^@/, "");
  return {
    username,
    avatarLimit: Math.round(clamp(raw.limiteAvatares, 1, 60, DEFAULT_CONFIG.avatarLimit)),
    inactivitySeconds: Math.round(clamp(raw.inatividadeSegundos, 10, 3600, DEFAULT_CONFIG.inactivitySeconds)),
    effectsVolume: clamp(raw.volumeEfeitos, 0, 1, DEFAULT_CONFIG.effectsVolume),
    port: Math.round(clamp(raw.porta, 1024, 65535, DEFAULT_CONFIG.port)),
  };
}

// Mapeia o objeto EN (usado pelo código/painel) de volta para as chaves PT do config.json.
export function toRawConfig(en) {
  return {
    usuarioTikTok: en.username,
    limiteAvatares: en.avatarLimit,
    inatividadeSegundos: en.inactivitySeconds,
    volumeEfeitos: en.effectsVolume,
    porta: en.port,
  };
}

function caminhoConfig() {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../config/config.json");
}

// Valida e grava o config.json (chaves PT). Devolve o config EN.
export function saveConfig(en, configPath = caminhoConfig()) {
  const raw = toRawConfig(en);
  const cfg = validateConfig(raw);
  writeFileSync(configPath, JSON.stringify(raw, null, 2) + "\n", "utf8");
  return cfg;
}

// Grava a chave do sign server no config.local.json (gitignored).
export function saveKey(signApiKey, keyPath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = keyPath ?? resolve(here, "../../config/config.local.json");
  writeFileSync(path, JSON.stringify({ signApiKey: String(signApiKey ?? "").trim() }, null, 2) + "\n", "utf8");
}
```
Adicionar `writeFileSync` ao import de `node:fs` (hoje só `readFileSync`). Refatorar `loadConfig` para usar `caminhoConfig()` também (DRY).

- [ ] **Step 4: Rodar e commitar** — Run: `npm test` → PASS.
```bash
git add src/server/config.js tests/config.test.js
git commit -m "feat: config.js permite @ vazio (idle) + saveConfig/saveKey"
```

---

### Task 2: `connection-manager.js` (controle de conexão)

**Files:**
- Create: `src/server/connection-manager.js`
- Test: `tests/connection-manager.test.js`

- [ ] **Step 1: Escrever `tests/connection-manager.test.js`** (RED)

```js
import { test, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { createConnectionManager } from '../src/server/connection-manager.js';

function fakeBridge() {
  const frames = [];
  return { broadcast: (f) => frames.push(f), frames };
}

// Connector fake controlável: connect() resolve/rejeita conforme configurado.
function fakeConnectorFactory(behavior) {
  return (username, opts) => ({
    _opts: opts,
    connect: () => behavior.connect(),
    disconnect: vi.fn(),
  });
}

test('start conecta e emite status connected', async () => {
  const bridge = fakeBridge();
  const createConnector = fakeConnectorFactory({ connect: () => Promise.resolve({ roomId: 'R1' }) });
  const m = createConnectionManager({ bridge, createConnector });
  m.start({ username: 'ana', signApiKey: 'k' });
  await vi.waitFor(() => expect(m.getStatus().state).toBe('connected'));
  expect(m.getStatus()).toMatchObject({ state: 'connected', username: 'ana', room: 'R1' });
  expect(bridge.frames.some(f => f.type === 'status' && f.state === 'connecting')).toBe(true);
  expect(bridge.frames.some(f => f.type === 'status' && f.state === 'connected')).toBe(true);
});

test('start exige username e signApiKey', () => {
  const m = createConnectionManager({ bridge: fakeBridge(), createConnector: fakeConnectorFactory({ connect: () => Promise.resolve({}) }) });
  expect(() => m.start({ username: '', signApiKey: 'k' })).toThrow(/username/);
  expect(() => m.start({ username: 'ana', signApiKey: '' })).toThrow(/signApiKey/);
});

test('falha de conexão vira status error e agenda retry', async () => {
  const bridge = fakeBridge();
  const createConnector = fakeConnectorFactory({ connect: () => Promise.reject(new Error('boom')) });
  const m = createConnectionManager({ bridge, createConnector, retryMs: 5 });
  m.start({ username: 'ana', signApiKey: 'k' });
  await vi.waitFor(() => expect(m.getStatus().state).toBe('error'));
  expect(m.getStatus().reason).toMatch(/boom/);
  m.stop(); // cancela o retry pra não vazar timer
});

test('stop volta para idle e desconecta', async () => {
  const bridge = fakeBridge();
  const disconnect = vi.fn();
  const createConnector = () => ({ connect: () => Promise.resolve({ roomId: 'R' }), disconnect });
  const m = createConnectionManager({ bridge, createConnector });
  m.start({ username: 'ana', signApiKey: 'k' });
  await vi.waitFor(() => expect(m.getStatus().state).toBe('connected'));
  m.stop();
  expect(m.getStatus().state).toBe('idle');
  expect(disconnect).toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/connection-manager.test.js` → FAIL.

- [ ] **Step 3: Escrever `src/server/connection-manager.js`**

```js
import { UserOfflineError } from 'tiktok-live-connector';
import { createConnector } from './connector.js';

// Gerencia o ciclo de vida da conexão com o TikTok de forma controlável (start/stop)
// e observável (getStatus + frames de status pelo bridge).
export function createConnectionManager({
  bridge,
  createConnector: makeConnector = createConnector,
  retryMs = 15000,
} = {}) {
  let status = { state: 'idle' };
  let connector = null;
  let timer = null;
  let cfg = null;

  function setStatus(s) {
    status = s;
    bridge.broadcast({ type: 'status', ...s });
  }

  function scheduleRetry() {
    timer = setTimeout(() => { timer = null; connect(); }, retryMs);
  }

  function connect() {
    setStatus({ state: 'connecting', username: cfg.username });
    connector = makeConnector(cfg.username, {
      signApiKey: cfg.signApiKey,
      onEvent: (e) => bridge.broadcast(e),
      onStatus: (st) => {
        if (st.state === 'disconnected') {
          setStatus({ state: 'reconnecting', username: cfg.username });
          scheduleRetry();
        }
      },
    });
    connector.connect()
      .then((st) => setStatus({ state: 'connected', username: cfg.username, room: st?.roomId }))
      .catch((err) => {
        const offline = err instanceof UserOfflineError;
        setStatus({
          state: offline ? 'offline' : 'error',
          username: cfg.username,
          reason: String(err?.message ?? err).slice(0, 120),
        });
        scheduleRetry();
      });
  }

  return {
    start(newCfg) {
      if (!newCfg?.username) throw new Error('username obrigatório para iniciar');
      if (!newCfg?.signApiKey) throw new Error('signApiKey obrigatório para iniciar');
      this.stop();
      cfg = newCfg;
      connect();
    },
    stop() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (connector) { try { connector.disconnect(); } catch {} connector = null; }
      if (status.state !== 'idle') setStatus({ state: 'idle' });
    },
    getStatus() { return status; },
  };
}
```

- [ ] **Step 4: Rodar e commitar** — Run: `npm test` → PASS.
```bash
git add src/server/connection-manager.js tests/connection-manager.test.js
git commit -m "feat: connection-manager controlável (start/stop/status)"
```

---

### Task 3: `admin-api.js` (rotas `/admin/api/*`)

**Files:**
- Create: `src/server/admin-api.js`
- Test: `tests/admin-api.test.js`

- [ ] **Step 1: Escrever `tests/admin-api.test.js`** (RED) — sobe um http real com o handler e usa `fetch` (como o `bridge.test`).

```js
import { test, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { createAdminApi } from '../src/server/admin-api.js';

async function comServidor(deps, fn) {
  const api = createAdminApi(deps);
  const http = createServer((req, res) => { if (!api.handle(req, res)) { res.writeHead(404).end(); } });
  await new Promise(r => http.listen(0, r));
  const base = `http://localhost:${http.address().port}`;
  try { await fn(base); } finally { await new Promise(r => http.close(r)); }
}

const depsBase = () => ({
  manager: { start: vi.fn(), stop: vi.fn(), getStatus: () => ({ state: 'idle' }) },
  bridge: { broadcast: vi.fn() },
  loadConfig: () => ({ username: 'ana', avatarLimit: 18, inactivitySeconds: 150, effectsVolume: 0.6, port: 8737, signApiKey: 'k' }),
  saveConfig: vi.fn((en) => en),
  saveKey: vi.fn(),
});

test('GET /admin/api/config devolve config sem a chave, com hasKey', async () => {
  await comServidor(depsBase(), async (base) => {
    const r = await fetch(`${base}/admin/api/config`);
    const j = await r.json();
    expect(j).toMatchObject({ username: 'ana', avatarLimit: 18, hasKey: true });
    expect(j.signApiKey).toBeUndefined();
  });
});

test('POST /admin/api/start chama manager.start', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/start`, { method: 'POST' });
    expect(r.status).toBe(200);
    expect(deps.manager.start).toHaveBeenCalled();
  });
});

test('start sem @ devolve 400', async () => {
  const deps = depsBase();
  deps.manager.start = vi.fn(() => { throw new Error('username obrigatório para iniciar'); });
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/start`, { method: 'POST' });
    expect(r.status).toBe(400);
  });
});

test('PUT /admin/api/key grava a chave', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const r = await fetch(`${base}/admin/api/key`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signApiKey: 'nova' }) });
    expect(r.status).toBe(200);
    expect(deps.saveKey).toHaveBeenCalledWith('nova');
  });
});

test('não intercepta rotas fora de /admin/api', async () => {
  await comServidor(depsBase(), async (base) => {
    const r = await fetch(`${base}/overlay.js`);
    expect(r.status).toBe(404); // handle() devolveu false -> 404 do servidor de teste
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — Run: `npm test -- tests/admin-api.test.js` → FAIL.

- [ ] **Step 3: Escrever `src/server/admin-api.js`**

```js
import { loadConfig as loadConfigReal } from './config.js';
import { saveConfig as saveConfigReal, saveKey as saveKeyReal } from './config.js';

// Handler das rotas /admin/api/*. Deps injetáveis para teste.
export function createAdminApi({
  manager,
  bridge,
  loadConfig = loadConfigReal,
  saveConfig = saveConfigReal,
  saveKey = saveKeyReal,
} = {}) {
  function readBody(req) {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => { data += c; });
      req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    });
  }
  function json(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  }

  async function route(req, res, path) {
    if (path === '/admin/api/config' && req.method === 'GET') {
      const cfg = loadConfig();
      const { signApiKey, ...rest } = cfg;
      return json(res, 200, { ...rest, hasKey: Boolean(signApiKey) });
    }
    if (path === '/admin/api/config' && req.method === 'PUT') {
      const body = await readBody(req);
      try {
        const cfg = saveConfig(body);
        bridge.broadcast({ type: 'config', avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds });
        return json(res, 200, { ok: true });
      } catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/key' && req.method === 'PUT') {
      const body = await readBody(req);
      saveKey(body.signApiKey);
      return json(res, 200, { ok: true });
    }
    if (path === '/admin/api/start' && req.method === 'POST') {
      try { manager.start(loadConfig()); return json(res, 200, { ok: true }); }
      catch (e) { return json(res, 400, { error: String(e?.message ?? e) }); }
    }
    if (path === '/admin/api/stop' && req.method === 'POST') {
      manager.stop(); return json(res, 200, { ok: true });
    }
    if (path === '/admin/api/status' && req.method === 'GET') {
      return json(res, 200, manager.getStatus());
    }
    return json(res, 404, { error: 'rota não encontrada' });
  }

  return {
    // Retorna true se tratou a requisição (rota /admin/api/*), false caso contrário.
    handle(req, res) {
      const path = req.url.split('?')[0];
      if (!path.startsWith('/admin/api/')) return false;
      route(req, res, path);
      return true;
    },
  };
}
```

- [ ] **Step 4: Rodar e commitar** — Run: `npm test` → PASS.
```bash
git add src/server/admin-api.js tests/admin-api.test.js
git commit -m "feat: admin-api com rotas de config/chave/start/stop/status"
```

---

### Task 4: Roteamento HTTP + `index.js` idle

**Files:**
- Modify: `src/server/static-server.js`
- Modify: `src/server/index.js`

- [ ] **Step 1: Refatorar `static-server.js` para rotear painel + overlay + admin-api**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, normalize, extname, sep } from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

async function serveStatic(root, urlPath, res) {
  try {
    let p = decodeURIComponent(urlPath.split('?')[0]);
    if (p === '' || p === '/') p = '/index.html';
    const abs = normalize(resolve(root, '.' + p));
    if (abs !== root && !abs.startsWith(root + sep)) { res.writeHead(403).end('proibido'); return; }
    const conteudo = await readFile(abs);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(abs)] ?? 'application/octet-stream' });
    res.end(conteudo);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
}

// Servidor HTTP que roteia: /admin/api -> adminApi ; /admin -> painel (dist) ; resto -> overlay.
export function createStaticServer({ adminApi } = {}) {
  const here = dirname(fileURLToPath(import.meta.url));
  const overlayRoot = resolve(here, '../overlay');
  const adminRoot = resolve(here, '../../admin/dist');

  return createServer((req, res) => {
    const path = req.url.split('?')[0];
    if (adminApi && path.startsWith('/admin/api/')) { if (adminApi(req, res)) return; }
    if (path === '/admin' || path.startsWith('/admin/')) {
      return serveStatic(adminRoot, path.replace(/^\/admin/, '') || '/', res);
    }
    return serveStatic(overlayRoot, path, res);
  });
}
```

- [ ] **Step 2: Reescrever `main()` do `index.js` para o modelo idle**

```js
import { loadConfig } from './config.js';
import { createStaticServer } from './static-server.js';
import { createBridge } from './bridge.js';
import { createConnectionManager } from './connection-manager.js';
import { createAdminApi } from './admin-api.js';
import { startSimulator } from './simulator.js';

const MODO_SIM = process.argv.includes('--sim');

function main() {
  const cfg = loadConfig();
  let manager;
  let adminApi;
  const http = createStaticServer({ adminApi: (req, res) => adminApi.handle(req, res) });

  const bridge = createBridge(http, (ws) => {
    const c = loadConfig();
    ws.send(JSON.stringify({ type: 'config', avatarLimit: c.avatarLimit, inactivitySeconds: c.inactivitySeconds }));
    ws.send(JSON.stringify({ type: 'status', ...manager.getStatus() }));
  });

  manager = createConnectionManager({ bridge });
  adminApi = createAdminApi({ manager, bridge });

  http.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  A porta ${cfg.port} já está em uso. Feche a outra janela do Live Avatars (ou mude "porta" no config/config.json) e tente de novo.\n`);
      process.exit(1);
    }
    throw err;
  });

  process.on('SIGINT', () => {
    console.log('\n  Encerrando Live Avatars...');
    manager.stop();
    bridge.close();
    http.close();
    process.exit(0);
  });

  http.listen(cfg.port, () => {
    console.log(`\n  Live Avatars no ar 🎉`);
    console.log(`  Overlay:  http://localhost:${cfg.port}`);
    console.log(`  Painel:   http://localhost:${cfg.port}/admin`);
    console.log(`  (abra o Painel pra configurar e iniciar a conexão)\n`);
  });

  if (MODO_SIM) {
    console.log('  MODO SIMULADOR: gerando eventos falsos.\n');
    startSimulator((e) => bridge.broadcast(e));
  }
  // Modelo idle: não conecta no boot; o painel inicia via /admin/api/start.
}

main();
```
Remover do arquivo as funções `connectWithRetry`/`retryConnection` e o import de `UserOfflineError`/`createConnector` (migraram para o connection-manager).

- [ ] **Step 3: Verificação de boot idle + roteamento** — Run (bash):
```bash
node src/server/index.js > /tmp/idle.log 2>&1 & SRV=$!; sleep 2
cat /tmp/idle.log            # deve imprimir Overlay + Painel, e NÃO tentar conectar
curl -s http://localhost:8737/admin/api/status    # {"state":"idle"}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8737/            # 200 (overlay)
kill $SRV
```
Expected: log mostra "Painel: .../admin" e nenhuma tentativa de conexão; status `idle`; overlay 200.

- [ ] **Step 4: Rodar suíte e commitar** — Run: `npm test` → PASS (o restante não quebrou).
```bash
git add src/server/static-server.js src/server/index.js
git commit -m "feat: servidor idle + roteamento /admin, /admin/api e overlay"
```

---

### Task 5: Scaffold React+Vite em `admin/` servido em `/admin`

**Files:**
- Create: `admin/package.json`, `admin/vite.config.js`, `admin/index.html`, `admin/src/main.jsx`, `admin/src/App.jsx`
- Modify: `.gitignore` (ignorar `admin/node_modules`)
- Build: `admin/dist/` (versionado)

- [ ] **Step 1: Criar `admin/package.json`**
```json
{
  "name": "live-avatars-admin",
  "private": true,
  "type": "module",
  "scripts": { "build": "vite build", "dev": "vite" },
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": { "@vitejs/plugin-react": "^4.3.1", "vite": "^5.4.0" }
}
```

- [ ] **Step 2: Criar `admin/vite.config.js`** (base `/admin/` porque é servido sob esse prefixo)
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
});
```

- [ ] **Step 3: Criar `admin/index.html`**
```html
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Live Avatars — Painel</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/admin/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Criar `admin/src/main.jsx`**
```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 5: Criar `admin/src/App.jsx`** (shell mínimo por ora)
```jsx
export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 560, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Live Avatars — Painel</h1>
      <p>Painel de controle. Configuração e conexão nas próximas tarefas.</p>
    </main>
  );
}
```

- [ ] **Step 6: Instalar deps e buildar**
```bash
cd admin && npm install && npm run build && cd ..
```
Expected: gera `admin/dist/index.html` + assets, com caminhos sob `/admin/`.

- [ ] **Step 7: `.gitignore`** — acrescentar:
```
admin/node_modules
```

- [ ] **Step 8: Verificar que o servidor serve o painel** — Run:
```bash
node src/server/index.js > /tmp/idle.log 2>&1 & SRV=$!; sleep 2
curl -s http://localhost:8737/admin/ | grep -o "<title>[^<]*</title>"
kill $SRV
```
Expected: `<title>Live Avatars — Painel</title>`.

- [ ] **Step 9: Commit** (versiona o dist; NÃO versiona node_modules)
```bash
git add admin/package.json admin/vite.config.js admin/index.html admin/src admin/dist .gitignore
git commit -m "feat: scaffold do painel React+Vite servido em /admin"
```

---

### Task 6: Config + Chave no painel

**Files:**
- Create: `admin/src/api.js`, `admin/src/ConfigForm.jsx`, `admin/src/KeyField.jsx`
- Modify: `admin/src/App.jsx`
- Rebuild: `admin/dist/`

- [ ] **Step 1: Criar `admin/src/api.js`**
```js
const j = (r) => r.json();
export const getConfig = () => fetch('/admin/api/config').then(j);
export const putConfig = (cfg) =>
  fetch('/admin/api/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cfg) }).then(j);
export const putKey = (signApiKey) =>
  fetch('/admin/api/key', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signApiKey }) }).then(j);
export const startConnection = () => fetch('/admin/api/start', { method: 'POST' }).then(j);
export const stopConnection = () => fetch('/admin/api/stop', { method: 'POST' }).then(j);
export function onStatus(cb) {
  const ws = new WebSocket(`ws://${location.host}`);
  ws.onmessage = (e) => { try { const f = JSON.parse(e.data); if (f.type === 'status') cb(f); } catch {} };
  return () => ws.close();
}
```

- [ ] **Step 2: Criar `admin/src/ConfigForm.jsx`**
```jsx
import { useState, useEffect } from 'react';
import { getConfig, putConfig } from './api.js';

export function ConfigForm({ onSaved }) {
  const [cfg, setCfg] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { getConfig().then(setCfg); }, []);
  if (!cfg) return <p>Carregando…</p>;
  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  const salvar = async (e) => {
    e.preventDefault();
    const r = await putConfig({ username: cfg.username, avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds, effectsVolume: cfg.effectsVolume, port: cfg.port });
    setMsg(r.ok ? 'Salvo!' : (r.error || 'Erro'));
    if (r.ok) onSaved?.();
  };
  return (
    <form onSubmit={salvar}>
      <h2>Configuração</h2>
      <label>@ do TikTok<input value={cfg.username} onChange={set('username')} placeholder="seu_usuario" /></label>
      <label>Limite de avatares<input type="number" min="1" max="60" value={cfg.avatarLimit} onChange={set('avatarLimit')} /></label>
      <label>Inatividade (s)<input type="number" min="10" max="3600" value={cfg.inactivitySeconds} onChange={set('inactivitySeconds')} /></label>
      <label>Volume dos efeitos<input type="number" min="0" max="1" step="0.1" value={cfg.effectsVolume} onChange={set('effectsVolume')} /></label>
      <label>Porta<input type="number" min="1024" max="65535" value={cfg.port} onChange={set('port')} /></label>
      <button type="submit">Salvar</button> <span>{msg}</span>
    </form>
  );
}
```

- [ ] **Step 3: Criar `admin/src/KeyField.jsx`**
```jsx
import { useState, useEffect } from 'react';
import { getConfig, putKey } from './api.js';

export function KeyField() {
  const [hasKey, setHasKey] = useState(false);
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { getConfig().then((c) => setHasKey(c.hasKey)); }, []);
  const salvar = async () => {
    const r = await putKey(value);
    setMsg(r.ok ? 'Chave salva!' : 'Erro');
    if (r.ok) { setHasKey(true); setValue(''); }
  };
  return (
    <section>
      <h2>Chave de API (Euler Stream)</h2>
      <p>Status: {hasKey ? '✅ definida' : '⚠️ não definida'}</p>
      <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="cole sua chave aqui" />
      <button onClick={salvar} disabled={!value}>Salvar chave</button> <span>{msg}</span>
    </section>
  );
}
```

- [ ] **Step 4: Atualizar `admin/src/App.jsx`**
```jsx
import { ConfigForm } from './ConfigForm.jsx';
import { KeyField } from './KeyField.jsx';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 560, margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1.5rem' }}>
      <h1>Live Avatars — Painel</h1>
      <ConfigForm />
      <KeyField />
    </main>
  );
}
```

- [ ] **Step 5: Rebuild + verificação manual**
```bash
cd admin && npm run build && cd ..
node src/server/index.js
```
Abrir `http://localhost:8737/admin`, editar a config e salvar (deve persistir no `config.json`), colar uma chave (status vira "definida"; grava `config.local.json`). Confirmar via:
```bash
grep usuarioTikTok config/config.json
```
Ctrl+C.

- [ ] **Step 6: Commit**
```bash
git add admin/src admin/dist
git commit -m "feat: painel edita config e cola a chave de API"
```

---

### Task 7: Controle (Iniciar/Parar) + status ao vivo

**Files:**
- Create: `admin/src/ControlPanel.jsx`
- Modify: `admin/src/App.jsx`
- Rebuild: `admin/dist/`

- [ ] **Step 1: Criar `admin/src/ControlPanel.jsx`**
```jsx
import { useState, useEffect } from 'react';
import { startConnection, stopConnection, onStatus } from './api.js';

const LABEL = {
  idle: '⏸️ parado', connecting: '⏳ conectando…', connected: '🟢 conectado',
  reconnecting: '🔄 reconectando…', offline: '🔴 offline (não está ao vivo)', error: '⚠️ erro',
};

export function ControlPanel() {
  const [status, setStatus] = useState({ state: 'idle' });
  const [msg, setMsg] = useState('');
  useEffect(() => onStatus(setStatus), []);
  const iniciar = async () => { const r = await startConnection(); if (!r.ok) setMsg(r.error || 'Erro'); else setMsg(''); };
  const parar = async () => { await stopConnection(); setMsg(''); };
  const ligado = status.state !== 'idle';
  return (
    <section>
      <h2>Conexão</h2>
      <p>Status: <strong>{LABEL[status.state] ?? status.state}</strong>
        {status.username ? ` — @${status.username}` : ''}{status.room ? ` (sala ${status.room})` : ''}</p>
      {status.reason ? <p style={{ color: '#a00' }}>{status.reason}</p> : null}
      <button onClick={iniciar} disabled={ligado}>Iniciar</button>{' '}
      <button onClick={parar} disabled={!ligado}>Parar</button> <span style={{ color: '#a00' }}>{msg}</span>
    </section>
  );
}
```

- [ ] **Step 2: Atualizar `admin/src/App.jsx`** — adicionar `ControlPanel` no topo:
```jsx
import { ConfigForm } from './ConfigForm.jsx';
import { KeyField } from './KeyField.jsx';
import { ControlPanel } from './ControlPanel.jsx';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 560, margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1.5rem' }}>
      <h1>Live Avatars — Painel</h1>
      <ControlPanel />
      <KeyField />
      <ConfigForm />
    </main>
  );
}
```

- [ ] **Step 3: Rebuild + verificação manual ponta a ponta**
```bash
cd admin && npm run build && cd ..
node src/server/index.js
```
No `/admin`: com @ + chave definidos, clicar **Iniciar** → status vai para "conectando" e depois "conectado" (ou "offline" se a conta não estiver ao vivo). **Parar** → volta pra "parado". Tentar Iniciar sem @/chave → mensagem de erro. Confirmar que o overlay (`/`) continua funcionando com `--sim` num segundo processo se quiser. Ctrl+C.

- [ ] **Step 4: Commit**
```bash
git add admin/src admin/dist
git commit -m "feat: painel controla iniciar/parar com status ao vivo"
```

---

## Self-review (cobertura do spec)

- **Lifecycle idle** (não conecta no boot): Task 4 (`index.js`). ✓
- **connection-manager** (start/stop/getStatus, estados, retry, broadcast): Task 2. ✓
- **API** config GET/PUT, key PUT, start/stop, status: Task 3. ✓
- **saveConfig/saveKey + @ vazio permitido**: Task 1. ✓
- **Roteamento HTTP** (/admin/api, /admin, overlay): Task 4 (`static-server.js`). ✓
- **Status via WS** (frames `type:'status'`, painel escuta): Task 2 (broadcast) + Task 3/index (onConnect envia status) + Task 7 (`onStatus`). ✓
- **Aplicar config** (save transmite config frame; iniciar aplica): Task 3 (broadcast no PUT) + Task 7. ✓
- **Frontend React+Vite + dist versionado**: Tasks 5–7; `.gitignore` node_modules Task 5. ✓
- **Sem auth / nunca retorna a chave**: Task 3 (GET remove signApiKey, hasKey). ✓
- **Testes** backend TDD + frontend manual: Tasks 1–3 (TDD), 4–7 (manual/curl). ✓
- **Consistência**: `createConnectionManager({bridge,createConnector,retryMs})→{start,stop,getStatus}`; `createAdminApi({manager,bridge,loadConfig,saveConfig,saveKey})→{handle}`; `createStaticServer({adminApi})`; status `{state,username,room,reason}`; frames `{type:'status'|'config'}` — usados de forma idêntica entre tasks. ✓
- Sem placeholders. ✓

**Nota de escopo:** a Peça 2b (gerenciador de sprites) fica num plano próprio.
