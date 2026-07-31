# Admin v2 — TypeScript + redesign (console escuro com abas)

Data: 2026-07-30
Status: aprovado (paleta mais escura).
Contexto: reescrever o frontend do painel `/admin` em **TypeScript**, com melhores práticas e uma
UI escura, com abas, mais usável. **Backend/API não muda.**

## Objetivo

Deixar o painel de controle apresentável e fácil de usar durante a live: tema escuro com abas,
status sempre visível, feedback claro, e o código do frontend em TypeScript bem estruturado.

## Escopo

**Reescreve:** todo o `admin/src/**` (JS→TS) + estilos + estrutura + testes leves. Rebuild do `admin/dist`.

**Não muda:** o backend (`admin-api`, `connection-manager`, `sprites`, `terrains`, `config`), as rotas
`/admin/api/*`, o modelo de serviço (`dist/` versionado, servido em `/admin`, streamer não builda).

**Fora:** som, novas features de overlay, mudanças de API.

## Design visual

Tema **escuro profundo**. Tokens (CSS variables em `theme.css`):
- `--bg: #0a0a0c` (fundo quase-preto) · `--panel: #121317` (superfície) · `--panel-2: #181a1f` (inputs/hover)
- `--border: #23262d` · `--text: #e8eaef` · `--muted: #8a909b`
- `--accent: #22d3ee` (ciano — abas ativas, botão primário) · `--accent-contrast: #04252b`
- Status: `--ok:#22c55e` (conectado) · `--warn:#f59e0b` (conectando/reconectando) · `--err:#ef4444` (offline/erro) · `--idle:#6b7280` (parado)
- Tipografia: system-ui; radius 10px; espaçamento base 8px.

## Layout

- **Header fixo**: título "Live Avatars" + **badge de status** sempre visível (bolinha na cor do estado
  + texto + `@usuario` / `sala` quando conectado).
- **Barra de abas**: `Conexão` · `Configuração` · `Sprites` · `Terreno` (aba ativa com sublinhado/realce ciano).
- **Conteúdo** da aba ativa, centralizado, largura ~640px.

### Abas
- **Conexão**: botões **Iniciar / Parar / Reiniciar**, detalhe do status e `reason` (quando houver).
- **Configuração**: form de config (@, limite, inatividade, volume, porta) + a **chave de API** agrupada.
- **Sprites**: lista com preview animado + adicionar (upload PNGs) + remover (com confirmação).
- **Terreno**: ativo + lista + enviar/usar/remover (com confirmação).

## Usabilidade

- **Reiniciar** (Parar+Iniciar) pra aplicar @/porta sem fazer na mão.
- **Loading states** + botões desabilitados durante ações (evita clique duplo).
- **Feedback**: "Salvo ✓" inline, erros de API (400) exibidos inline, toast rápido pra ações.
- **Confirmar** antes de remover sprite/terreno.
- **Estados vazios** com dica.
- Chave: status "definida/não definida", nunca exibe o valor.

## Arquitetura do frontend (TypeScript, boas práticas)

- Tooling: adicionar `typescript`, `@types/react`, `@types/react-dom`, `tsconfig.json` (strict). Vite já suporta `.tsx`.
- Arquivos:
  - `src/main.tsx`, `src/App.tsx` (header + status + abas + roteamento local de aba via estado).
  - `src/api.ts` — cliente **tipado**: tipos `Config`, `Status`, `SpriteItem`, `TerrainState` e funções `getConfig/putConfig/putKey/start/stop/restart/getSprites/saveSprite/deleteSprite/getTerrain/saveTerrain/setActiveTerrain/deleteTerrain`.
  - `src/hooks/useStatus.ts` — assina o WS (`type:'status'`) e devolve o `Status` atual.
  - `src/ui/` — primitivos reutilizáveis: `Button`, `Field` (label+input), `Card`, `Badge`, `Tabs`, `Confirm`.
  - `src/tabs/` — `ConnectionTab`, `ConfigTab`, `SpritesTab`, `TerrainTab`.
  - `src/theme.css` — tokens + estilos base (dark).
- **CSS à mão com variables** (sem Tailwind/MUI) — `dist` leve, visual próprio.
- Tipos das respostas espelham a API: `Status = { state: 'idle'|'connecting'|'connected'|'reconnecting'|'offline'|'error'; username?: string; room?: string; reason?: string }`, `Config = { username; avatarLimit; inactivitySeconds; effectsVolume; port; hasKey }`, `SpriteItem = { id; frames; scale; facing; source: 'default'|'local' }`, `TerrainState = { active: string|null; items: {file:string}[] }`.

### "Reiniciar"
Frontend-only por ora: `restart()` = `POST /admin/api/stop` seguido de `POST /admin/api/start` (a API já existe; não precisa de rota nova).

## Testes

Setup leve no `admin/`: `vitest` + `@testing-library/react` + `jsdom` (devDeps). Alguns testes:
- `api.ts` — funções montam URL/método certos (fetch mockado).
- `Tabs`/`Badge` — renderiza e troca de aba; badge mostra a cor/texto do estado.
- `useStatus` — atualiza ao receber frame `type:'status'` (WS mockado).
Não é cobertura total — é rede mínima. Script `npm test` no `admin/` (`vitest run`).

## Build / serve

Igual: `vite build` → `admin/dist/` versionado, servido em `/admin`. TS/testes são dev-time; o streamer só recebe o `dist/`. `admin/node_modules` gitignored.

## Riscos
- **Visual não verificável por mim** (sem browser): entrego e você revisa; ajusto cores/espaços conforme ver.
- Migração JS→TS de todos os componentes: mecânica, mas ampla — feita de uma vez (o frontend é pequeno).

## Não-objetivos
- Sem mudança de backend/API, sem novas features, sem lib de componentes, sem responsividade mobile (uso local desktop).
