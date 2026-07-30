# Refactor: identificadores PT → EN (mantendo JS)

Data: 2026-07-30
Status: aprovado (aguardando revisão do spec)

## Objetivo

Alinhar o código às boas práticas de nomenclatura em inglês, sem mudar comportamento.
Funções, variáveis e o protocolo interno passam a inglês; o que é lido/visto pelo
usuário final brasileiro (chaves do `config.json` e textos de UI) permanece em português.

Migração para TypeScript **não** faz parte deste refactor — fica como fase futura
separada (o custo real lá é introduzir um bundler no overlay, que hoje roda sem build).

## Escopo

**Vira inglês:**
- Identificadores internos: nomes de função, variáveis, constantes, helpers.
- Protocolo WebSocket servidor↔overlay: o campo `tipo` e todos os campos dos eventos.
- Strings de estado internas (níveis de presente, direção do sprite, estado de conexão).
- Testes: atualizados junto de cada camada (asserções nos nomes/strings renomeados).

**Permanece em português (decisão explícita):**
- Chaves do `config/config.json` (`usuarioTikTok`, `limiteAvatares`, `inatividadeSegundos`,
  `volumeEfeitos`, `porta`) — contrato editado pelo usuário final BR.
- Texto de UI: mensagens de console e o overlay (`"conectando…"`, `"reconectando…"`, etc.).

**Fora de escopo:**
- TypeScript (fase futura).
- Renomear arquivos — já estão todos em inglês.
- Auditoria de assets (rastreada em memória à parte).

## Decisão de design: `config.js` como fronteira de tradução

O `config.json` mantém chaves em PT, mas o resto do código é inglês. Para evitar
identificadores PT vazando para dentro do código, `validateConfig` faz a tradução
num único ponto:

- Lê as chaves PT do arquivo (`raw.usuarioTikTok`, `raw.limiteAvatares`, …).
- Retorna um objeto de config **em inglês**: `{ username, avatarLimit, inactivitySeconds, effectsVolume, port, signApiKey }`.

Assim `config.js` é o único lugar onde nomes PT (as chaves do arquivo) aparecem,
como strings de leitura — todo o resto do código consome nomes em inglês.

## Glossário — Protocolo WebSocket (APROVADO)

O campo `tipo` passa a `type`. Valores de `type`:

| PT            | EN        |
|---------------|-----------|
| `comentario`  | `comment` |
| `entrar`      | `join`    |
| `curtida`     | `like`    |
| `seguir`      | `follow`  |
| `compartilhar`| `share`   |
| `presente`    | `gift`    |
| `config`      | `config`  |

Campos dos eventos:

| PT                            | EN                  |
|-------------------------------|---------------------|
| `usuario`                     | `username`          |
| `nome`                        | `name`              |
| `fotoUrl`                     | `avatarUrl`         |
| `quantidade`                  | `count`             |
| `valorMoedas`                 | `coins`             |
| `presente` (nome do presente) | `giftName`          |
| `limiteAvatares` (frame config)| `avatarLimit`      |
| `inatividadeSegundos` (frame config)| `inactivitySeconds` |

## Glossário — convenções internas

Padrão de tradução de funções (aplicar consistentemente):

| PT (exemplos)        | EN                |
|----------------------|-------------------|
| `criarX` / `criar…`  | `createX`         |
| `carregarX`          | `loadX`           |
| `conectarX`          | `connectX`        |
| `normalizarX`        | `normalizeX`      |
| `iniciarX`           | `startX`          |
| `aoEvento`/`aoStatus`| `onEvent`/`onStatus` |
| `tratar`/`configurar`| `handle`/`configure` |

Renames notáveis por arquivo (não exaustivo — o plano detalha o resto):
- `config.js`: `CONFIG_PADRAO`→`DEFAULT_CONFIG`, `validarConfig`→`validateConfig`, `carregarConfig`→`loadConfig`, `lerChaveApi`→`readApiKey`, `limitar`→`clamp`.
- `static-server.js`: `criarServidorEstatico`→`createStaticServer`, `TIPOS`→`CONTENT_TYPES`.
- `bridge.js`: `criarBridge`→`createBridge`, método `fechar`→`close`.
- `connector.js`: `criarConnector`→`createConnector`, `conexaoReal`→`realConnection`, `conectar`→`connect`, `desconectar`→`disconnect`, `encaminhar`→`forward`.
- `normalize.js`: `normalizar*`→`normalize*` (Comment/Join/Like/Follow/Share/Gift), `dadosUsuario`→`userData`.
- `simulator.js`: `iniciarSimulador`→`startSimulator` (emite os eventos no novo protocolo EN).
- `index.js`: `conectarComRetry`→`connectWithRetry`, `tentarReconectar`→`retryConnection`.
- `overlay.js`/`scene.js`: `criarCena`→`createScene`, `criarGerenciador`→`createManager`, `carregarPersonagens`→`loadCharacters`, `conectarWS`→`connectWS`, `palco`→`stage` (id HTML `#palco`→`#stage`).
- `avatar-manager.js`: métodos `configurar`→`configure`, `tratar`→`handle`.
- `characters.js`: `carregarPersonagens`→`loadCharacters`, `quadrosDe`→`framesOf`, `QUADROS`→`FRAMES`, `ESCALAS`→`SCALES`, `OLHANDO`→`FACING`.
- `gift-scale.js`: `escalaPresente`→`giftScale`; saída `{nivel,escala,confetes,duracaoMs}`→`{level,scale,confetti,durationMs}`.

Strings de estado internas:
- Níveis de presente: `pequeno`/`medio`/`grande` → `small`/`medium`/`large`.
- Direção do sprite (`FACING`): `frente`/`esquerda` → `front`/`left`.
- Estado da conexão (connector/ws-client): `conectado`/`desconectado`/`erro`/`reconectando` → `connected`/`disconnected`/`error`/`reconnecting`. (O texto exibido ao usuário continua PT; só o valor de estado é EN.)

## Abordagem de execução

Mudança que preserva comportamento, com 35 testes de rede de segurança. Em camadas,
cada uma um commit, com a suíte verde entre elas:

1. **Identificadores internos** — funções/variáveis/constantes por arquivo, atualizando
   os testes correspondentes. Comportamento idêntico; testes seguem verdes.
2. **Protocolo WebSocket** — `type` + campos dos eventos, mudando as duas pontas
   (servidor: `normalize.js`, `simulator.js`, `index.js`; overlay: `overlay.js`,
   `avatar-manager.js`, `reactions.js`) e os testes juntos, no mesmo commit.
3. **Fronteira `config.js`** — `validateConfig` passa a retornar objeto EN; ajustar
   `index.js` (frame de config) e o overlay.

Para o protocolo e as strings internas, seguir o ciclo do TDD: atualizar o teste
para o nome novo (RED), renomear a implementação (GREEN).

## Testes

- A suíte (`npm test`, 35 testes) deve ficar verde ao final de cada camada.
- Verificação manual pós-refactor: `npm run sim` (overlay reage a eventos falsos) e
  boot do modo real (sobe sem erro de import).

## Riscos e mitigação

- **Dessincronizar as duas pontas do protocolo WS**: mitigado renomeando servidor +
  overlay + testes no mesmo commit (camada 2).
- **Esquecer alguma string de contrato**: os testes cobrem `type`/campos/valores;
  `git grep` das strings PT antigas ao final confirma que nada sobrou.
- **Textos de UI traduzidos por engano**: manter PT em mensagens de console e no overlay.

## Não-objetivos

- Nenhuma mudança de comportamento, lógica ou dependência.
- Sem TypeScript, sem bundler, sem refactor de arquitetura.
