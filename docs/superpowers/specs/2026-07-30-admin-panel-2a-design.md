# Peça 2a — Painel /admin base + controle

Data: 2026-07-30
Status: aprovado (aguardando revisão do spec)
Épico: Painel /admin. Peça 1 = roster orientado a dados (feita). **Peça 2a = painel base + controle (este)**. Peça 2b = gerenciador de sprites. Peça 3 = terreno.

## Objetivo

Entregar a fundação do painel: um app React+Vite servido em `/admin` pelo próprio servidor
Node, com API para editar config, colar a chave, e **iniciar/parar** a conexão com o TikTok
vendo o **status ao vivo** — mais o refactor do ciclo de vida para o modelo **idle**
(o servidor não conecta sozinho; a conexão é iniciada pelo painel).

## Escopo

**Nesta peça (2a):**
- Refactor do ciclo de vida: servidor sobe **idle**; conexão controlada por `start`/`stop`.
- `connection-manager.js`: gerencia conectar/retry/desconectar + estado, controlável e testável.
- API `/admin/api/*`: config (GET/PUT), chave (PUT), start/stop (POST), status (GET).
- Frontend React+Vite em `admin/`, servido em `/admin` (com `dist/` versionado).
- Status ao vivo pelo WebSocket que já existe.

**Fora (peças seguintes / não-objetivos):**
- Gerenciador de sprites (Peça 2b).
- Terreno (Peça 3).
- Autenticação (bind localhost, usuário único local).
- Hot-reload mágico de config; estatísticas ao vivo (viewers/eventos por minuto).
- Testes de componente React a fundo (2a faz verificação manual + smoke; a fundo fica pra depois).

## Ciclo de vida (decisão: idle)

Ao ligar, o servidor serve overlay + painel + WebSocket, mas **não conecta** no TikTok.
O usuário abre `/admin`, confere @ e chave, e clica **Iniciar**. `--sim` continua ligando
o simulador (dev), sem passar pelo manager.

## `connection-manager.js` (novo)

`createConnectionManager({ bridge, createConnector })` retorna:
- `start(cfg)` — inicia a conexão (`cfg.username` + `cfg.signApiKey`); percorre os estados
  e reemite o status. Rejeita cedo se faltar `username` ou `signApiKey`.
- `stop()` — cancela o timer de retry, desconecta, estado → `idle`.
- `getStatus()` — `{ state, username?, room?, reason? }`.

Estados: `idle` | `connecting` | `connected` | `reconnecting` | `offline` | `error`.
- sucesso → `connected` (com `room`);
- `UserOfflineError` → `offline` (+ reason) e reintenta em 15s;
- outro erro → `error` (+ reason) e reintenta em 15s;
- evento `disconnected` → `reconnecting` e reintenta.

Cada mudança de estado é transmitida pelo bridge como `{ type: 'status', ...getStatus() }`.
A lógica de conectar/retry sai do `index.js` (hoje em `connectWithRetry`/`retryConnection`)
e passa a viver aqui, controlável.

## `admin-api.js` (novo) — rotas `/admin/api/*`

- `GET /admin/api/config` → `{ username, avatarLimit, inactivitySeconds, effectsVolume, port, hasKey }`.
  Usa `loadConfig()` (que já traduz as chaves PT do arquivo) **menos** o valor da chave;
  `hasKey` é booleano. **Nunca** retorna o `signApiKey`.
- `PUT /admin/api/config` → valida (reusa `validateConfig`) e grava via novo `saveConfig()`
  em `config.js` (mapeia os campos EN de volta para as chaves PT do `config.json`).
  `400` com mensagem em erro de validação. Ao salvar, transmite um frame de config atualizado
  pelo bridge (o overlay reaplica limite/inatividade sem recarregar).
- `PUT /admin/api/key` → grava `{ signApiKey }` no `config.local.json` (gitignored).
- `POST /admin/api/start` → `manager.start(loadConfig())`. `400` se faltar @ ou chave.
- `POST /admin/api/stop` → `manager.stop()`.
- `GET /admin/api/status` → `manager.getStatus()` (o mesmo estado também é empurrado via WS).

## Roteamento HTTP

O servidor HTTP (hoje `static-server.js`) vira um roteador simples:
- `/admin/api/*` → `admin-api`;
- `/admin` e `/admin/*` → estático do painel (`admin/dist/`, removendo o prefixo `/admin`);
- resto → estático do overlay (`src/overlay/`).
O WebSocket (bridge) continua anexado ao mesmo servidor.

## `index.js`

Boot: `loadConfig` → roteador (overlay + painel + admin-api) → bridge → `connection-manager`
**idle** → wiring do admin-api ao manager → listen. **Não** conecta no boot. `--sim` liga o
simulador como hoje. O `onConnect` do bridge passa a enviar, ao novo cliente WS, o frame de
config **e** o frame de status atual (pra o painel já abrir sabendo o estado).

## Status ao vivo (reusa o WebSocket)

O manager emite `{ type: 'status', state, username?, room?, reason? }` pelo bridge a cada
mudança. O painel conecta em `ws://${location.host}` e escuta só os frames `type === 'status'`
(o overlay ignora esses; o painel ignora os de evento/config do overlay). Zero infra nova.

## Aplicar config

Modelo idle: edita a config parada e o **Iniciar** aplica. Se já estiver conectado e a config
mudar, o painel oferece **Reiniciar** (parar+iniciar) para aplicar `username`/`porta`. Mudanças
de `avatarLimit`/`inactivitySeconds` são reaplicadas ao overlay na hora (frame de config no save).

## Frontend (React + Vite) em `admin/`

- Projeto Vite próprio: `admin/package.json`, `admin/vite.config.js` (`base: '/admin/'`),
  `admin/index.html`, `admin/src/**`.
- Componentes: `App`, `ConfigForm` (@, limite, inatividade, volume, porta), `KeyField`
  (colar chave; mostra "definida/não definida", sem exibir o valor), `ControlPanel`
  (Iniciar/Parar + indicador de status + @/sala conectada).
- Chamadas a `/admin/api/*` (mesma origem) + WS para status.
- **Build/serve**: `vite build` → `admin/dist/` **versionado** (o streamer nunca roda
  `npm`/`vite`; o servidor serve o `dist/` pronto). `admin/node_modules` fica gitignored.
  Rebuild do `dist/` é passo de dev.

## Fluxo de dados

Painel abre → `GET /admin/api/config` + `GET /admin/api/status` (e recebe status via WS).
Editar config → `PUT /admin/api/config`. Colar chave → `PUT /admin/api/key`. Iniciar →
`POST /admin/api/start` → manager conecta → status via WS → painel atualiza. Parar →
`POST /admin/api/stop` → idle.

## Tratamento de erro

- Validação de config → `400` com mensagem → painel mostra inline.
- Iniciar sem @/chave → `400` "configure @ e chave primeiro" → painel mostra.
- Erros de conexão (offline / sign error) → estado `offline`/`error` com `reason`, exibido no painel.

## Testes

- **Backend (TDD, roda em Node):**
  - `connection-manager.test.js`: transições `start`/`stop`/status com um connector fake
    injetado (como o `fakeConexao` do `connector.test`); confirma os frames de status transmitidos.
  - `admin-api.test.js`: dispatch das rotas, ler/gravar config (arquivos temporários ou fs
    injetado), gravar chave, erros de validação, `start`/`stop` chamando um manager fake.
  - `config.test.js`: novo `saveConfig()` (mapeamento EN→PT + validação).
- **Frontend:** verificação manual (abrir `/admin`, editar config, colar chave, iniciar/parar,
  ver status mudar) + um smoke test leve opcional.

## Riscos e mitigação

- **`dist/` versionado**: artefato de build no git — aceito para preservar o zero-build do
  streamer; rebuild é passo de dev.
- **Mudança de comportamento no boot** (não conecta sozinho): é o modelo idle escolhido; documentar no README.
- **`/admin` sem `dist/`**: mitigado por versionar o `dist/` (sempre existe).
- **Vazamento da chave**: a API nunca retorna o `signApiKey`; só `hasKey`.

## Não-objetivos

- Sem gerenciador de sprites, sem terreno, sem auth, sem estatísticas ao vivo, sem hot-reload de `username`/`porta`.
