# Admin — Fundação Tailwind + refresh visual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adotar Tailwind v4 como base de estilo do painel `/admin` e dar um refresh visual (escuro refinado) sem mudar comportamento, rotas ou API.

**Architecture:** Painel Vite + React + TS. Adiciona-se o plugin `@tailwindcss/vite` ao build e reescreve-se `admin/src/theme.css` como entrada Tailwind: `@import "tailwindcss"`, tokens em `@theme` (expondo `bg-panel`, `text-muted`, … como utilitários pras próximas frentes) e as classes semânticas existentes (`.card`, `.btn`, `.field`, `.tabs`, …) redefinidas com refinamentos (foco em ring, hover, elevação, transições) dentro de `@layer components`. **Nenhum componente `.tsx` ou aba é tocado** — a API/DOM não muda, então os testes existentes seguem verdes e o risco de regressão é mínimo. Componentes migram pra utilitários inline de forma incremental nas frentes futuras (quando cada tela for mexida).

**Tech Stack:** Vite 5, React 18, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Vitest + Testing Library.

**Nota sobre TDD:** esta frente é refactor de estilo e wiring de build — não há comportamento novo, logo não há teste unitário "vermelho→verde" a escrever. A verificação de cada task é: `typecheck` + suíte existente verde + `build` sem erro + inspeção visual. Isso está explícito nos steps.

---

## Estrutura de arquivos

- **Modify:** `admin/package.json` — devDeps `tailwindcss` + `@tailwindcss/vite`.
- **Modify:** `admin/vite.config.ts` — registrar o plugin `tailwindcss()`.
- **Rewrite:** `admin/src/theme.css` — de CSS puro pra entrada Tailwind (import + `@theme` + `@layer base` + `@layer components`).
- **Regenerate + commit:** `admin/dist/**` — rebuild do bundle versionado servido em `/admin`.

Sem arquivos novos de código-fonte. Sem mudança em `admin/src/**/*.tsx`.

---

## Task 1: Adicionar Tailwind v4 ao build do Vite

**Files:**
- Modify: `admin/package.json` (devDependencies)
- Modify: `admin/vite.config.ts`

- [ ] **Step 1: Instalar as dependências do Tailwind v4**

Run:
```bash
npm --prefix admin install -D tailwindcss @tailwindcss/vite
```
Expected: instala sem erro; `admin/package.json` passa a listar `tailwindcss` e `@tailwindcss/vite` em `devDependencies`; `admin/package-lock.json` atualizado.

- [ ] **Step 2: Registrar o plugin no `vite.config.ts`**

Editar `admin/vite.config.ts` para importar e adicionar o plugin `tailwindcss()` ao lado do `react()`. Conteúdo final do arquivo:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts' },
});
```

- [ ] **Step 3: Verificar que o build ainda passa (theme.css ainda é CSS puro, plugin no-op)**

Run:
```bash
npm --prefix admin run build
```
Expected: `tsc --noEmit && vite build` termina sem erro e regenera `admin/dist/`. (Nesta etapa o Tailwind ainda não produz utilitários porque `theme.css` não tem `@import "tailwindcss"` — isso é intencional; só confirmamos que o wiring não quebrou o build.)

- [ ] **Step 4: Commit**

```bash
git add admin/package.json admin/package-lock.json admin/vite.config.ts
git commit -m "build(admin): adicionar plugin @tailwindcss/vite (Tailwind v4)"
```

---

## Task 2: Reescrever `theme.css` como entrada Tailwind (tokens + refresh)

**Files:**
- Rewrite: `admin/src/theme.css`

Esta task troca todo o conteúdo de `admin/src/theme.css`. Todas as classes hoje em uso permanecem definidas (`app, header, badge, dot, tabs, tab, card, grid, row, list, field, input, btn, btn-primary, btn-ghost(base), btn-danger, muted, err, pixel, thumb`), agora com tokens em `@theme` e refinamentos. `main.tsx` continua importando `./theme.css` (sem mudança).

- [ ] **Step 1: Substituir o conteúdo de `admin/src/theme.css` por:**

```css
@import "tailwindcss";

/* Tokens do tema (escuro) — expostos como cores utilitárias do Tailwind:
   bg-bg, bg-panel, text-muted, border-border, text-accent, etc.
   Ficam disponíveis pras telas novas das próximas frentes. */
@theme {
  --color-bg: #0a0a0c;
  --color-panel: #121317;
  --color-panel-2: #181a1f;
  --color-border: #23262d;
  --color-text: #e8eaef;
  --color-muted: #8a909b;
  --color-accent: #22d3ee;
  --color-accent-contrast: #04252b;
  --color-ok: #22c55e;
  --color-warn: #f59e0b;
  --color-err: #ef4444;
  --color-idle: #6b7280;
}

@layer base {
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}

@layer components {
  /* Layout */
  .app { max-width: 680px; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
  .header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
  .header h1 { margin: 0; font-size: 1.25rem; letter-spacing: -0.01em; }

  /* Badge de status */
  .badge { display: inline-flex; align-items: center; gap: .5rem; background: var(--color-panel); border: 1px solid var(--color-border); border-radius: 999px; padding: .35rem .8rem; font-size: .85rem; color: var(--color-muted); }
  .badge .dot { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }

  /* Abas */
  .tabs { display: flex; gap: .25rem; border-bottom: 1px solid var(--color-border); margin-bottom: 1.25rem; }
  .tab { background: none; border: none; color: var(--color-muted); padding: .6rem .9rem; font-size: .95rem; cursor: pointer; border-bottom: 2px solid transparent; transition: color .15s ease; }
  .tab:hover { color: var(--color-text); }
  .tab.active { color: var(--color-text); border-bottom-color: var(--color-accent); }

  /* Cards */
  .card { background: var(--color-panel); border: 1px solid var(--color-border); border-radius: 10px; padding: 1.15rem 1.2rem; margin-bottom: 1.25rem; box-shadow: 0 1px 2px rgb(0 0 0 / .25); }
  .card h2 { margin: 0 0 .9rem; font-size: 1.05rem; }
  .card h3 { margin: 1rem 0 .5rem; font-size: .95rem; color: var(--color-muted); }

  /* Grupos */
  .grid { display: grid; gap: .75rem; }
  .row { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
  .list { list-style: none; margin: 0 0 1rem; padding: 0; display: grid; gap: .5rem; }

  /* Campos e inputs */
  .field { display: grid; gap: .3rem; font-size: .9rem; }
  .field > span { color: var(--color-muted); }
  .field input, .field select, .input { background: var(--color-panel-2); border: 1px solid var(--color-border); color: var(--color-text); border-radius: 8px; padding: .5rem .6rem; font: inherit; transition: border-color .15s ease, box-shadow .15s ease; }
  .field input:focus, .field select:focus, .input:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-accent) 30%, transparent); }

  /* Botões */
  .btn { border: 1px solid var(--color-border); background: var(--color-panel-2); color: var(--color-text); border-radius: 8px; padding: .5rem .9rem; font: inherit; cursor: pointer; transition: background .15s ease, border-color .15s ease, filter .15s ease; }
  .btn:hover:not(:disabled) { border-color: var(--color-muted); }
  .btn:active:not(:disabled) { transform: translateY(1px); }
  .btn:disabled { opacity: .45; cursor: not-allowed; }
  .btn-primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-accent-contrast); font-weight: 600; }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
  .btn-danger { border-color: #5b2330; color: #ff9db0; }
  .btn-danger:hover:not(:disabled) { background: #2a151a; border-color: #7a2f3f; }

  /* Diversos */
  .muted { color: var(--color-muted); font-size: .85rem; }
  .err { color: #ff9db0; font-size: .85rem; }
  .pixel { image-rendering: pixelated; background: var(--color-panel-2); border-radius: 6px; }
  .thumb { border: 1px solid var(--color-border); border-radius: 6px; }
}
```

- [ ] **Step 2: `typecheck` do admin (garante que nada de TS quebrou)**

Run:
```bash
npm --prefix admin run typecheck
```
Expected: `tsc --noEmit` sem erro.

- [ ] **Step 3: Suíte de testes do admin verde**

Run:
```bash
npm --prefix admin test
```
Expected: todos os testes passam (Badge, Tabs, api). Eles checam texto/comportamento, não estilo, então continuam verdes.

- [ ] **Step 4: Build gera o CSS do Tailwind sem erro**

Run:
```bash
npm --prefix admin run build
```
Expected: build sem erro; `admin/dist/assets/*.css` regenerado incluindo o reset/base do Tailwind + as classes do `@layer components` (arquivo notavelmente maior que antes por causa do preflight do Tailwind).

- [ ] **Step 5: Inspeção visual (manual)**

Run:
```bash
npm --prefix admin run dev
```
Abrir `http://localhost:5173/admin/` e conferir as 4 abas (Conexão, Configuração, Sprites, Terreno): layout centralizado, badge de status, cards com leve elevação, inputs com ring de foco ciano, botões primário/ghost/danger com hover, abas com indicador ativo ciano. Encerrar o dev server (Ctrl+C) ao terminar.

Se algo visual precisar de ajuste (cor/espaço), ajustar os valores no `@layer components` e repetir os steps 3–5 antes de commitar.

- [ ] **Step 6: Commit do fonte**

```bash
git add admin/src/theme.css
git commit -m "style(admin): reescrever theme.css com Tailwind v4 (tokens + refresh escuro)"
```

---

## Task 3: Rebuild e commit do `admin/dist` versionado

**Files:**
- Regenerate + commit: `admin/dist/**`

O painel é servido do `admin/dist` versionado (streamer não builda). Após as mudanças de fonte, o `dist` precisa ser regenerado e commitado.

- [ ] **Step 1: Rebuild final**

Run:
```bash
npm --prefix admin run build
```
Expected: `admin/dist/` regenerado (HTML + JS + o novo CSS do Tailwind).

- [ ] **Step 2: Conferir o diff do dist**

Run:
```bash
git status --short admin/dist
```
Expected: aparecem arquivos modificados em `admin/dist/assets/` (novo hash de CSS, e index.html apontando pro novo asset).

- [ ] **Step 3: Commit do dist**

```bash
git add admin/dist
git commit -m "build(admin): rebuild dist com o painel repaginado (Tailwind)"
```

---

## Verificação final (após todas as tasks)

- [ ] `npm --prefix admin run typecheck` — sem erro.
- [ ] `npm --prefix admin test` — verde.
- [ ] `npm --prefix admin run build` — sem erro, `dist` regenerado e commitado.
- [ ] `git status --short` — só `config/config.json` (pré-existente) segue sem commit; nada do admin pendente.
- [ ] Painel inspecionado nas 4 abas — visual novo, funcionalidade idêntica.
