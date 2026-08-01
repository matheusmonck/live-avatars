# Aba Usuários — sprite por @ + VIP

Data: 2026-08-01
Status: aprovado.
Contexto: hoje o override `@ → sprite` só existe editando JSON na mão, e não há conceito de VIP.
Esta frente adiciona uma aba **Usuários** no painel `/admin` pra, por @, definir o sprite e marcar
VIP (coroa 👑 + sempre visível). **Backend de conexão/config não muda.**

## Objetivo

Gerenciar pelo painel, por usuário: (1) qual sprite ele usa (override) e (2) se é VIP (destaque de
coroa na tela + aparece sempre, mesmo sem interagir). Persistência local (gitignored).

## Modelo de dados (`src/overlay/characters.local.json`)

Duas chaves novas no arquivo local:
```json
{
  "characters": [...],
  "hidden": [...],
  "overrides": { "matheusmonck": "luffy" },
  "vip": ["matheusmonck"]
}
```
- `overrides` (username → spriteId): já é mesclado pelo `loadCharacters` com o do `characters.json`
  (`{ ...defData.overrides, ...locData.overrides }`, local vence). **O painel só lê/escreve o local**;
  o `characters.json` é a base imutável que continua mesclando — assim o override do PC da live (no
  `characters.json` versionado) não quebra e o painel não precisa mexer em arquivo versionado.
- `vip` (lista de usernames): conceito novo, só no local.

Sprite efetivo de um @ = override local, senão override do `characters.json`, senão hash automático
(via `pickId`, que já reserva sprites de override — ver frente do fix de Luffy).

## Servidor — `src/server/users.js` (módulo novo, isolado do `sprites.js`)

Mesmo padrão de I/O do `sprites.js` (lê/escreve `characters.local.json` com read-modify-write; a
API é single-threaded, então é seguro). Injeta `overlayDir` pros testes.

- `listUsers({ overlayDir })` → array `{ username, sprite: string|null, source: 'default'|'local', vip: boolean }`,
  unindo as chaves de `overrides` (default do `characters.json` + local) e de `vip`.
- `setUser({ username, sprite, vip }, { overlayDir })`:
  - valida `username` não-vazio (mesma normalização do overlay: sem `@` na frente);
  - se `sprite` informado, valida que é um id existente no roster (default+local); grava/atualiza
    `overrides[username]` no local; se `sprite` vazio/null, remove a chave do override local;
  - `vip` boolean: adiciona/remove `username` de `vip`.
- `removeUser(username, { overlayDir })` → remove `username` do `overrides` local e do `vip`.
- Validação de sprite reusa a lista do `sprites.js` (`listSprites`) pra saber os ids válidos.

## Servidor — rotas em `src/server/admin-api.js`

- `GET /admin/api/users` → `listUsers()`.
- `PUT /admin/api/users` → body `{ username, sprite, vip }` → `setUser(...)`; 400 com `{ error }` em validação.
- `DELETE /admin/api/users/<username>` → `removeUser(...)`.

Seguem o estilo dos `if (path === ... && req.method === ...)` já existentes.

## Painel — aba **Usuários** (`admin/src/tabs/UsersTab.tsx`)

- `App.tsx`: adiciona `'Usuários'` ao `TABS` e roteia `<UsersTab />`.
- `api.ts`: tipos `UserEntry = { username; sprite: string|null; source: 'default'|'local'; vip: boolean }`
  e funções `getUsers()`, `putUser(u)`, `deleteUser(username)`.
- UI (reusa `Card`/`Field`/`Button`, já no visual Tailwind):
  - Lista de @s: para cada um, **dropdown de sprite** (opções vindas do `GET /admin/api/sprites`,
    mais a opção "— automático") + **checkbox VIP** + botão remover (com confirmação simples).
    Entradas com `source: 'default'` mostram o sprite como informação, mas editar grava um override
    **local** (que vence) — comportamento uniforme.
  - Linha "adicionar @": input de @ + dropdown de sprite + checkbox VIP + salvar.
  - Feedback inline "Salvo ✓" / erro 400.

## Overlay

- `src/overlay/characters.js`:
  - `loadCharacters` lê `locData.vip` e guarda num `Set`; exporta `isVip(username)` e `vipUsers()`.
- `src/overlay/avatar.js`:
  - em `createAvatarVisual`, se `isVip(username)`, adiciona uma **coroa** (`new PIXI.Text({ text: '👑' })`,
    `anchor(0.5, 1)`) posicionada acima da cabeça (`y = -body.height - 2`).
- `src/overlay/avatar-manager.js`:
  - **VIP sempre aparece**: ao iniciar (após `loadCharacters`), dá `ensure()` em cada `vipUsers()`;
    e no intervalo de 5s existente (o da expiração), antes de expirar, dá `ensure()` em cada VIP
    (recria se saiu, atualiza `lastInteraction` → nunca expira). Como o heartbeat chama `ensure`
    direto (fora do gate de tipo de evento), o VIP continua spawnando mesmo quando a frente 3
    ("só quem interage") restringir o spawn por evento.

## Testes

- `tests/users.test.js`: `listUsers/setUser/removeUser` sobre `characters.local.json` temporário
  (padrão do `tests/sprites.test.js` com `overlayDir`). Cobre: setar sprite, limpar sprite, marcar/desmarcar
  VIP, remover, validação de sprite inexistente, união default+local no list.
- `tests/admin-api.test.js`: as 3 rotas novas (GET/PUT/DELETE users), sucesso e erro 400.
- Coroa (avatar.js) e heartbeat VIP (avatar-manager.js) dependem de PIXI → verificação via `npm run sim`.

## Build / serve / escopo

- Aba nova ⇒ rebuild + commit do `admin/dist`.
- **Fora:** mudanças no backend de conexão, no overlay reload ao vivo (VIP/override aplicam no load do
  overlay — reload do browser-source, igual já é pra sprites/hidden), e a regra "só quem interage"
  (é a frente 3).

## Riscos

- Dois módulos (`sprites.js` e `users.js`) escrevem o mesmo `characters.local.json`: mitigado por
  read-modify-write do arquivo inteiro a cada operação e API single-threaded.
- Emoji 👑 depende da fonte do sistema no ambiente do overlay; fallback aceitável (some/quadrado) — se
  virar problema, troca por um sprite de coroa (fora de escopo agora).
