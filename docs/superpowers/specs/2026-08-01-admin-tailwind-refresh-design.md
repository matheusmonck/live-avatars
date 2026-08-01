# Admin — fundação Tailwind + refresh visual (escuro refinado)

Data: 2026-08-01
Status: aprovado.
Contexto: o painel `/admin` (Vite + React + TS) usa hoje um `theme.css` escrito à mão. Queremos
adotar **Tailwind** como base de estilo e dar um **refresh visual** (mantendo as abas), estabelecendo
um design system pras próximas frentes (aba Usuários, regras de aparição). **Backend/API não muda.**

> Supersede a decisão do spec `2026-07-30-admin-v2-ts-redesign` ("CSS à mão, sem Tailwind"): a partir
> daqui o estilo do painel passa a ser Tailwind. Motivo: as próximas frentes adicionam telas novas, e
> um design system em utilitários deixa isso consistente e rápido.

## Objetivo

Modernizar o visual do painel e criar a fundação de estilo (Tailwind + tokens) que as telas futuras
vão reusar — sem mudar comportamento, rotas ou API. Tema escuro, refinado.

## Escopo

**Muda:** camada de estilo do `admin/src/**` — adiciona Tailwind ao build do Vite, converte
`theme.css` pra Tailwind (tokens em `@theme` + camada fina de helpers/base) e restiliza os
componentes `ui/` (Badge, Button, Card, Field, Tabs) e o layout (header/container). Rebuild do `admin/dist`.

**Não muda:** o backend (`admin-api`, `connection-manager`, `sprites`, `terrains`, `config`), as rotas
`/admin/api/*`, a **API dos componentes** (`Button` variant, `Card` title, `Field` label, `Tabs`), a
lógica das abas, o modelo de serviço (`dist/` versionado, servido em `/admin`, streamer não builda).

**Fora:** abas novas (Usuários, regras de aparição, ranking), mudanças de comportamento do overlay,
responsividade mobile (uso local desktop), lib de componentes (shadcn/MUI).

## Abordagem técnica

- **Tailwind v4** com o plugin oficial `@tailwindcss/vite` — config **CSS-first**, sem `tailwind.config.js`.
  - `admin/package.json`: devDeps `tailwindcss` + `@tailwindcss/vite`.
  - `admin/vite.config.ts`: adicionar o plugin `tailwindcss()` (junto do `react()`; `base: '/admin/'` e o bloco `test` permanecem).
- **`theme.css` reescrito** como entrada Tailwind:
  - `@import "tailwindcss";`
  - `@theme { … }` portando os tokens atuais (refinados) como cores/raios do Tailwind — ver Tema.
  - Camada fina de **helpers semânticos** reusados cru nas abas (`.muted`, `.row`, `.grid`, `.list`, `.err`, `.pixel`, `.thumb`) e estilos base (`body`, `image-rendering` pixel). Isso mantém o JSX das abas quase intocado.
  - `main.tsx` continua importando `./theme.css` (sem mudança).
- **Componentes `ui/` restilizados** com utilitários Tailwind, **mantendo a mesma API/props**. Como
  as abas consomem os componentes, elas praticamente não mudam.

*Por que v4 e não v3/PostCSS ou uma lib de componentes:* menos boilerplate; tokens CSS-first casam
direto com as CSS vars atuais; evita peso desnecessário num painel interno pequeno.

## Tema (escuro refinado)

Mantém a **identidade escura + acento ciano**. Tokens portados pro `@theme` (base nos atuais):
- `--color-bg: #0a0a0c` · `--color-panel: #121317` · `--color-panel-2: #181a1f`
- `--color-border: #23262d` · `--color-text: #e8eaef` · `--color-muted: #8a909b`
- `--color-accent: #22d3ee` · `--color-accent-contrast: #04252b`
- `--color-ok: #22c55e` · `--color-warn: #f59e0b` · `--color-err: #ef4444` · `--color-idle: #6b7280`
- `--radius: 10px` (raio unificado).

Refinos (o "mais moderno", sem trocar a identidade):
- Contraste de texto/`muted` e espaçamento com **escala consistente** (base 8px do Tailwind).
- **Estados de foco/hover** mais claros (ring de foco no acento; hover perceptível em botões/abas).
- **Elevação sutil** nos cards (borda + leve sombra), bordas mais suaves.
- Indicador de aba ativa mais nítido.

## Componentes que ganham repaginada

Mesma API, visual novo:
- **Layout**: `app` (container centralizado) + `header` (título + `Badge`).
- **Tabs**: aba ativa com realce ciano mais nítido; hover no inativo.
- **Card**: título/padding/elevação.
- **Field**: label + input/select/checkbox com foco em ring.
- **Button**: `primary` / `ghost` / `danger` com hover/active/disabled.
- **Badge**: dot de status na cor do estado + texto.

## Testes

Rede mínima existente segue verde (não testam CSS exato, e sim render/comportamento):
- `admin/src/ui/Badge.test.tsx`, `admin/src/ui/Tabs.test.tsx`, `admin/src/api.test.ts`.

Como é refactor de estilo (sem nova lógica), não há novo teste de comportamento a criar. A verificação
é typecheck + testes verdes + build + inspeção visual das 4 abas.

## Build / serve

Igual ao fluxo atual: Tailwind compila **no build** (`vite build`) direto pro CSS do `admin/dist/`.
Passos ao final: `npm --prefix admin run build` (roda `tsc --noEmit && vite build`) e **commitar o
`admin/dist` regenerado**. O streamer continua recebendo só o `dist/`; `admin/node_modules` gitignored.

## Verificação

1. `npm --prefix admin run typecheck` — sem erro.
2. `npm --prefix admin test` — verde.
3. `npm --prefix admin run build` — sem erro; `admin/dist` regenerado.
4. Rodar o painel e conferir as 4 abas (Conexão/Configuração/Sprites/Terreno): visual novo + funcional.

## Riscos

- **Visual não verificável por mim** (sem browser): entrego e você revisa; ajusto cores/espaços conforme ver.
- Migração ampla mas mecânica (o frontend é pequeno); a API estável dos componentes limita o risco de regressão.

## Não-objetivos

- Sem mudança de backend/API, sem abas/features novas, sem lib de componentes, sem responsividade mobile.
