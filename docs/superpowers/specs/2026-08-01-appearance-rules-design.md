# Regras de aparição — só quem interage + limite de corações

Data: 2026-08-01
Status: aprovado.
Contexto: hoje **qualquer** evento (join/like/follow/share/comment/gift) cria um avatar. Queremos que,
por padrão, **só apareça quem interage** — comentar, mandar presente, ou **acumular N corações**
(padrão 10) — e que isso seja um ajuste no painel. VIP (frente 2) é exceção: sempre aparece.

## Decisões

- **Toggle "só quem interage"** (não checkboxes por evento — YAGNI). Ligado por padrão.
  - Ligado: `comment` e `gift` criam avatar na hora; `like` cria quando a **soma de corações** do usuário
    atingir o limite; `join`/`follow`/`share` **não criam** (só reagem se o avatar já existe).
  - Desligado: comportamento antigo (qualquer evento cria).
- **Limite de corações configurável** (`likeThreshold`, padrão 10, 1–1000).
- **Corações somam sempre** (mesmo eventos throttled), pro limiar; o throttle passa a limitar **só a
  repetição da reação** (coração/estrela/follow), não a criação/contagem.
- **VIP** (frente 2) já spawna via heartbeat com `canSpawn=true`, então é exceção automática à regra.

## Config (`src/server/config.js`)

Dois campos novos (EN interno ⇄ PT no `config.json`):
- `onlyInteractors: boolean` ⇄ `soQuemInterage` (default `true`).
- `likeThreshold: number` ⇄ `coracoesParaAparecer` (default `10`, `clamp(1,1000)`, arredondado).

Alterar `DEFAULT_CONFIG`, `validateConfig` (ler PT→EN com `bool`/`clamp`) e `toRawConfig` (EN→PT).

## Propagação da config ao overlay

- `src/server/index.js`: o frame `config` enviado no connect do WS passa a incluir `onlyInteractors` e `likeThreshold`.
- `src/server/admin-api.js`: o `bridge.broadcast({ type:'config', ... })` do `PUT /config` inclui os dois.
- `GET /config` já devolve tudo do `validateConfig` (ConfigTab recebe os campos automaticamente).
- `src/overlay/overlay.js`: `DEFAULT_CONFIG` (fallback) ganha `onlyInteractors: true, likeThreshold: 10`.

## Overlay (`src/overlay/avatar-manager.js`)

- `settings` ganha `onlyInteractors` e `likeThreshold` (lidos de `cfg`, atualizados em `configure`).
- `ensure(event, canSpawn)`: só cria avatar novo se `canSpawn`; senão, só retorna o existente
  (`registry.has`). (VIP e reações reusam.) `ensureVips` chama `ensure(ev, true)`.
- `shouldSpawn(event)`:
  - `!onlyInteractors` → `true` (modo todos);
  - `comment`/`gift` → `true`;
  - `like` → soma de corações do usuário `>= likeThreshold`;
  - senão (`join`/`follow`/`share`) → `false`.
- `handle(event)`:
  1. se `like`, **soma** `event.count` em `likeCounts[username]` (antes de tudo);
  2. `const v = ensure(event, shouldSpawn(event)); if (!v) return;`
  3. throttle (`like`/`follow`/`share`) limita **só a reação**: `if (throttled) return;`
  4. `switch` das reações (igual hoje).

## Painel (`admin/src/tabs/ConfigTab.tsx` + `admin/src/api.ts`)

- `api.ts`: `Config` ganha `onlyInteractors: boolean; likeThreshold: number`; `putConfig` já envia `Omit<Config,'hasKey'>`.
- `ConfigTab`: dois controles novos no form — checkbox **"Só quem interage (comentário, coração, presente)"**
  (`onlyInteractors`) e number **"Corações para aparecer"** (`likeThreshold`, min 1, max 1000). Incluir os
  dois no objeto do `putConfig`.

## Testes

- `tests/config.test.js`: defaults dos novos campos; `validateConfig` lê `soQuemInterage`/`coracoesParaAparecer`;
  `clamp` do threshold; round-trip `toRawConfig`.
- Lógica de spawn/limiar do `avatar-manager` (PIXI) → verificação via `npm run sim` (o simulador gera
  like com `count`, join, follow, share — dá pra ver que só interatores aparecem).

## Build / escopo

- Rebuild + commit do `admin/dist` (ConfigTab mudou).
- **Fora:** checkboxes por evento individual, reset de contagem de corações por janela de tempo
  (a soma é acumulada na sessão do overlay; reload zera — aceitável).

## Riscos

- Mudar o ponto do throttle (de "antes do ensure" pra "só na reação") altera sutilmente o comportamento:
  agora um like/follow throttled ainda mantém o avatar vivo (atualiza `lastInteraction`) — melhoria, não regressão.
