# Efeitos mais vivos + toggle "Modo palco" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever os efeitos de reação (corações/estrelas/confete) com formas vetoriais de verdade, easing e mais volume, e adicionar um toggle `modoPalco` no /admin que faz presente/seguidor dispararem os efeitos no lugar do avatar (sem centralizar nem banner).

**Architecture:** `src/overlay/reactions.js` é reescrito mantendo a API pública (só `reactionFollow`/`reactionGift` ganham `opts.stage`). Um booleano `stageMode` (chave PT `modoPalco`, default `true`) percorre o mesmo encanamento de config do `avatarLimit`: `config.json` → `config.js` (validate/toRaw) → frame `{type:'config'}` (index.js + admin-api.js) → `overlay.js`/`avatar-manager.js` → repassado às reações. UI no admin ganha um checkbox.

**Tech Stack:** Node ESM, PixiJS v8 (global `PIXI` via CDN), Vitest, React + TypeScript (painel admin).

**Spec:** `docs/superpowers/specs/2026-07-31-effects-and-stage-mode-design.md`

---

### Task 1: Reescrever `reactions.js` (efeitos) + teste de easing

Formas via `GraphicsContext` compartilhado (criados **lazy** pra o módulo ser importável no Node), easing puro exportado, dois animadores (`floatUp`, `confettiBurst`), bloom aditivo, e as reações com `opts.stage` (default `true` → comportamento atual até o encanamento passar o flag).

**Files:**
- Create: `tests/reactions.test.js`
- Modify: `src/overlay/reactions.js` (reescrita completa)

- [ ] **Step 1: Escrever o teste de easing (falha)**

Create `tests/reactions.test.js`:

```js
import { test, expect } from 'vitest';
import { easeOutCubic, easeOutBack } from '../src/overlay/reactions.js';

test('easeOutCubic vai de 0 a 1 nas fronteiras', () => {
  expect(easeOutCubic(0)).toBeCloseTo(0);
  expect(easeOutCubic(1)).toBeCloseTo(1);
  expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // desacelera: passa de 0.5 antes da metade
});

test('easeOutBack faz overshoot e volta pra 1', () => {
  expect(easeOutBack(0)).toBeCloseTo(0);
  expect(easeOutBack(1)).toBeCloseTo(1);
  // pico com overshoot em algum ponto antes do fim
  const peak = Math.max(easeOutBack(0.6), easeOutBack(0.7), easeOutBack(0.8));
  expect(peak).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- reactions`
Expected: FAIL — `easeOutCubic`/`easeOutBack` não existem ainda (o `reactions.js` atual não os exporta).

- [ ] **Step 3: Reescrever `src/overlay/reactions.js` por completo**

Replace the ENTIRE content of `src/overlay/reactions.js` with:

```js
import { giftScale } from './gift-scale.js';

// ---------------------------------------------------------------------------
// Tunables — ajuste o "feel" dos efeitos aqui.
// ---------------------------------------------------------------------------
const TUNE = {
  hearts:   { count: 8,  colors: [0xff5d8f, 0xff3d71, 0xff8fb3, 0xe63946, 0xff6b9d], size: [0.8, 1.4], life: [1100, 1500] },
  stars:    { count: 10, colors: [0xffd166, 0xffe08a, 0xffb703, 0xffca3a],           size: [0.7, 1.2], life: [1000, 1400] },
  confetti: { colors: [0xff6b9d, 0x4fd1c5, 0xffd166, 0x6c8cff, 0xe63946, 0x9b5de5], life: [2200, 2800] },
  followConfetti: 60,
  followFallback: 40, // confete no lugar quando o palco está desligado
};

// ---------------------------------------------------------------------------
// Easing (puro, testável sem browser).
// ---------------------------------------------------------------------------
export function easeOutCubic(t) { const u = 1 - t; return 1 - u * u * u; }
export function easeOutBack(t, s = 1.70158) { const u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; }

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// ---------------------------------------------------------------------------
// Formas — GraphicsContext compartilhado (tesselação 1x), cor por `tint`.
// Lazy: só cria ao primeiro uso, pra reactions.js ser importável no Node.
// ---------------------------------------------------------------------------
let _heartCtx = null, _starCtx = null, _confCtx = null;
function heartContext() {
  if (!_heartCtx) {
    _heartCtx = new PIXI.Graphics()
      .moveTo(0, -3)
      .bezierCurveTo(-1, -7, -7, -8, -8, -3)
      .bezierCurveTo(-9, 1, -4, 5, 0, 9)
      .bezierCurveTo(4, 5, 9, 1, 8, -3)
      .bezierCurveTo(7, -8, 1, -7, 0, -3)
      .fill(0xffffff).context;
  }
  return _heartCtx;
}
function starContext() {
  if (!_starCtx) _starCtx = new PIXI.Graphics().star(0, 0, 5, 9, 4).fill(0xffffff).context;
  return _starCtx;
}
function confettiContext() {
  if (!_confCtx) _confCtx = new PIXI.Graphics().rect(-4, -4, 8, 8).fill(0xffffff).context;
  return _confCtx;
}

// Nó com bloom: cópia maior aditiva atrás + núcleo sólido (sem filtro pesado).
function glowNode(context, color) {
  const node = new PIXI.Container();
  const glow = new PIXI.Graphics(context);
  glow.tint = color; glow.alpha = 0.35; glow.scale.set(1.7); glow.blendMode = 'add';
  const core = new PIXI.Graphics(context);
  core.tint = color;
  node.addChild(glow, core);
  return node;
}

// ---------------------------------------------------------------------------
// Animador 1: sobe flutuando (corações/estrelas) com pop-in, sway e fade.
// ---------------------------------------------------------------------------
function floatUp(scene, node, { life, size, rise, sway, spin, delay }) {
  scene.effectsLayer.addChild(node);
  node.alpha = 0;
  let t = -delay;
  const anim = (ticker) => {
    if (node.destroyed) { scene.app.ticker.remove(anim); return; }
    t += ticker.deltaMS;
    if (t < 0) return; // ainda no atraso de spawn escalonado
    const p = Math.min(1, t / life);
    const pop = easeOutBack(Math.min(1, t / (life * 0.18))); // pop nos primeiros 18%
    node.scale.set(size * pop);
    node.y = node._y0 - rise * easeOutCubic(p);
    node.x = node._x0 + Math.sin(t / 260 + node._phase) * sway;
    node.rotation = Math.sin(t / 320 + node._phase) * spin;
    node.alpha = p < 0.65 ? 1 : Math.max(0, 1 - (p - 0.65) / 0.35);
    if (p >= 1) { scene.app.ticker.remove(anim); node.destroy({ children: true }); }
  };
  scene.app.ticker.add(anim);
}

function emitFloaters(scene, x, y, kind, contextFn) {
  const cfg = TUNE[kind];
  for (let i = 0; i < cfg.count; i++) {
    const node = glowNode(contextFn(), pick(cfg.colors));
    node._x0 = x + rand(-18, 18);
    node._y0 = y;
    node._phase = Math.random() * Math.PI * 2;
    node.x = node._x0; node.y = node._y0;
    floatUp(scene, node, {
      life: rand(cfg.life[0], cfg.life[1]),
      size: rand(cfg.size[0], cfg.size[1]),
      rise: rand(70, 120),
      sway: rand(6, 16),
      spin: rand(0.1, 0.3),
      delay: i * 55,
    });
  }
}

export function reactionHearts(scene, avatar) {
  const { x, y } = avatar.position();
  emitFloaters(scene, x, y - 50, 'hearts', heartContext);
}

export function reactionStars(scene, avatar) {
  const { x, y } = avatar.position();
  emitFloaters(scene, x, y - 50, 'stars', starContext);
}

// ---------------------------------------------------------------------------
// Animador 2: confete (gravidade + flutter + rotação + fade).
// ---------------------------------------------------------------------------
export function confettiBurst(scene, x, y, count) {
  for (let i = 0; i < count; i++) {
    const g = new PIXI.Graphics(confettiContext());
    g.tint = pick(TUNE.confetti.colors);
    g.x = x; g.y = y;
    const ribbon = Math.random() < 0.5;
    g.scale.set(rand(0.5, 1.1) * (ribbon ? 0.5 : 1), rand(0.5, 1.1) * (ribbon ? 1.6 : 1));
    const baseSx = g.scale.x;
    let vx = rand(-0.45, 0.45);
    let vy = rand(-0.7, -0.2);
    const spin = rand(-0.02, 0.02);
    const flutter = rand(0.004, 0.01);
    const life = rand(TUNE.confetti.life[0], TUNE.confetti.life[1]);
    let t = 0;
    const anim = (ticker) => {
      if (g.destroyed) { scene.app.ticker.remove(anim); return; }
      t += ticker.deltaMS;
      vy += 0.0011 * ticker.deltaMS; // gravidade
      g.x += vx * ticker.deltaMS;
      g.y += vy * ticker.deltaMS;
      g.rotation += spin * ticker.deltaMS;
      g.scale.x = baseSx * Math.cos(t * flutter); // flutter: gira no ar
      g.alpha = Math.max(0, 1 - t / life);
      if (g.alpha <= 0) { scene.app.ticker.remove(anim); g.destroy(); }
    };
    scene.app.ticker.add(anim);
  }
}

// Pop de escala rápido no próprio boneco (presente no lugar), sem centralizar.
function popInPlace(scene, avatar, peak) {
  const target = Math.min(1.6, 1 + (peak - 1) * 0.35);
  let t = 0; const life = 500;
  const anim = (ticker) => {
    if (avatar.root.destroyed) { scene.app.ticker.remove(anim); return; }
    t += ticker.deltaMS;
    const p = Math.min(1, t / life);
    avatar.root.scale.set(1 + (target - 1) * Math.sin(p * Math.PI));
    if (p >= 1) { avatar.root.scale.set(1); scene.app.ticker.remove(anim); }
  };
  scene.app.ticker.add(anim);
}

// ---------------------------------------------------------------------------
// Seguir: palco (banner + confete no centro) ou no lugar (confete na cabeça).
// ---------------------------------------------------------------------------
export function reactionFollow(scene, avatar, name, opts = {}) {
  const stage = opts.stage !== false;
  if (!stage) {
    const { x, y } = avatar.position();
    confettiBurst(scene, x, y - 50, TUNE.followFallback);
    return;
  }
  const hp = scene.highlightPoint();
  confettiBurst(scene, hp.x, hp.y, TUNE.followConfetti);
  const banner = new PIXI.Text({
    text: `⭐ novo seguidor: @${name} 💖`,
    style: { fontFamily: 'system-ui', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 4 } },
  });
  banner.anchor.set(0.5);
  banner.x = scene.app.screen.width / 2;
  banner.y = scene.app.screen.height * 0.15;
  scene.effectsLayer.addChild(banner);
  let t = 0;
  const anim = (ticker) => {
    t += ticker.deltaMS;
    banner.scale.set(easeOutBack(Math.min(1, t / 260))); // pop de entrada
    if (t > 2500) banner.alpha = Math.max(0, 1 - (t - 2500) / 800);
    if (banner.alpha <= 0) { scene.app.ticker.remove(anim); banner.destroy(); }
  };
  scene.app.ticker.add(anim);
}

// ---------------------------------------------------------------------------
// Presente: palco (destaque + escala) ou no lugar (confete + pop).
// ---------------------------------------------------------------------------
export function reactionGift(scene, avatar, event, opts = {}) {
  const stage = opts.stage !== false;
  const fx = giftScale(event.coins);
  if (!stage) {
    const { x, y } = avatar.position();
    confettiBurst(scene, x, y - 50, fx.confetti);
    popInPlace(scene, avatar, fx.scale);
    return;
  }
  const target = scene.highlightPoint();
  const start = avatar.position();
  const base = scene.groundLine();
  avatar.pause(); // pausa o passeio enquanto está em destaque
  scene.highlightLayer.addChild(avatar.root); // sobe o avatar pra camada de destaque (na frente do confete)
  let t = 0;
  const riseMs = 700;
  const animate = (ticker) => {
    if (avatar.root.destroyed) { scene.app.ticker.remove(animate); return; }
    t += ticker.deltaMS;
    const p = Math.min(1, t / riseMs);
    avatar.root.x = start.x + (target.x - start.x) * p;
    avatar.root.y = start.y + (target.y - start.y) * p;
    avatar.root.scale.set(1 + (fx.scale - 1) * p);
    if (p >= 1) {
      scene.app.ticker.remove(animate);
      confettiBurst(scene, target.x, target.y, fx.confetti);
      setTimeout(() => { if (!avatar.root.destroyed) goBack(); }, fx.durationMs);
    }
  };
  function goBack() {
    if (avatar.root.destroyed) return;
    let t2 = 0;
    const from = { x: avatar.root.x, y: avatar.root.y, s: avatar.root.scale.x };
    const anim2 = (ticker) => {
      if (avatar.root.destroyed) { scene.app.ticker.remove(anim2); return; }
      t2 += ticker.deltaMS;
      const p = Math.min(1, t2 / 500);
      avatar.root.x = from.x + (start.x - from.x) * p;
      avatar.root.y = from.y + (base - from.y) * p;
      avatar.root.scale.set(from.s + (1 - from.s) * p);
      if (p >= 1) {
        scene.app.ticker.remove(anim2);
        if (!avatar.root.destroyed) scene.groundLayer.addChild(avatar.root); // volta pra camada do chão
        avatar.resume();
      }
    };
    scene.app.ticker.add(anim2);
  }
  scene.app.ticker.add(animate);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- reactions`
Expected: PASS (2 testes de easing).

- [ ] **Step 5: Commit**

```bash
git add tests/reactions.test.js src/overlay/reactions.js
git commit -m "feat(overlay): efeitos mais vivos (formas vetoriais, easing, bloom) + opts.stage"
```

---

### Task 2: `config.js` — campo booleano `stageMode` / `modoPalco`

**Files:**
- Modify: `src/server/config.js`
- Modify: `tests/config.test.js`

- [ ] **Step 1: Adicionar/ajustar testes (falham)**

Em `tests/config.test.js`, adicione ao final:

```js
test('stageMode default true quando falta; aceita false', () => {
  expect(validateConfig({ usuarioTikTok: 'x' }).stageMode).toBe(true);
  expect(validateConfig({ usuarioTikTok: 'x', modoPalco: false }).stageMode).toBe(false);
  expect(validateConfig({ usuarioTikTok: 'x', modoPalco: 'false' }).stageMode).toBe(false);
});
```

E **substitua** o teste existente `'toRawConfig mapeia campos EN de volta para chaves PT'` (para incluir `stageMode`/`modoPalco`):

```js
test('toRawConfig mapeia campos EN de volta para chaves PT', () => {
  expect(toRawConfig({ username: 'ana', avatarLimit: 20, inactivitySeconds: 100, effectsVolume: 0.5, stageMode: false, port: 9000 }))
    .toEqual({ usuarioTikTok: 'ana', limiteAvatares: 20, inatividadeSegundos: 100, volumeEfeitos: 0.5, modoPalco: false, porta: 9000 });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test -- config`
Expected: FAIL — `stageMode` é `undefined` e `toRawConfig` não emite `modoPalco`.

- [ ] **Step 3: Implementar em `src/server/config.js`**

Adicione `stageMode: true` ao `DEFAULT_CONFIG` (antes de `port`):

```js
export const DEFAULT_CONFIG = {
  username: "",
  avatarLimit: 18,
  inactivitySeconds: 150,
  effectsVolume: 0.6,
  stageMode: true,
  port: 8737,
};
```

Adicione o helper `bool` logo depois de `clamp`:

```js
function bool(value, fallback) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}
```

Em `validateConfig`, adicione o campo `stageMode` (antes de `port`):

```js
    effectsVolume: clamp(raw.volumeEfeitos, 0, 1, DEFAULT_CONFIG.effectsVolume),
    stageMode: bool(raw.modoPalco, DEFAULT_CONFIG.stageMode),
    port: Math.round(clamp(raw.porta, 1024, 65535, DEFAULT_CONFIG.port)),
```

Em `toRawConfig`, adicione o mapeamento (antes de `porta`):

```js
    volumeEfeitos: en.effectsVolume,
    modoPalco: en.stageMode,
    porta: en.port,
```

- [ ] **Step 4: Rodar e confirmar passagem**

Run: `npm test -- config`
Expected: PASS (todos os testes de config, incluindo os novos).

- [ ] **Step 5: Commit**

```bash
git add src/server/config.js tests/config.test.js
git commit -m "feat(config): campo booleano modoPalco/stageMode (default ligado)"
```

---

### Task 3: `config.json` + frame `config` inclui `stageMode`

**Files:**
- Modify: `config/config.json`
- Modify: `src/server/admin-api.js:42`
- Modify: `src/server/index.js:18`
- Modify: `tests/admin-api.test.js`

- [ ] **Step 1: Escrever o teste do broadcast (falha)**

Em `tests/admin-api.test.js`, adicione (por exemplo após o teste `GET /admin/api/config`):

```js
test('PUT /admin/api/config faz broadcast do frame config com stageMode', async () => {
  const deps = depsBase();
  await comServidor(deps, async (base) => {
    const body = { username: 'ana', avatarLimit: 18, inactivitySeconds: 150, effectsVolume: 0.6, stageMode: false, port: 8737 };
    const r = await fetch(`${base}/admin/api/config`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect(r.status).toBe(200);
    expect(deps.bridge.broadcast).toHaveBeenCalledWith(expect.objectContaining({ type: 'config', stageMode: false }));
  });
});
```

(O mock `saveConfig: vi.fn((en) => en)` devolve o corpo, então `cfg.stageMode` reflete o enviado.)

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test -- admin-api`
Expected: FAIL — o broadcast atual não inclui `stageMode`.

- [ ] **Step 3: Incluir `stageMode` no broadcast do PUT**

Em `src/server/admin-api.js`, linha do broadcast dentro do PUT `/admin/api/config`:

```js
        bridge.broadcast({ type: 'config', avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds, stageMode: cfg.stageMode });
```

- [ ] **Step 4: Incluir `stageMode` no frame enviado na conexão WS**

Em `src/server/index.js`, dentro de `createBridge(http, (ws) => { ... })`:

```js
    ws.send(JSON.stringify({ type: 'config', avatarLimit: c.avatarLimit, inactivitySeconds: c.inactivitySeconds, stageMode: c.stageMode }));
```

- [ ] **Step 5: Adicionar a chave PT ao `config/config.json`**

Edite `config/config.json` para incluir `"modoPalco": true` (antes de `"porta"`):

```json
{
  "usuarioTikTok": "coloque_o_@_aqui",
  "limiteAvatares": 18,
  "inatividadeSegundos": 150,
  "volumeEfeitos": 0.6,
  "modoPalco": true,
  "porta": 8737
}
```

- [ ] **Step 6: Rodar e confirmar passagem**

Run: `npm test -- admin-api`
Expected: PASS (incluindo o novo teste do broadcast).

- [ ] **Step 7: Commit**

```bash
git add config/config.json src/server/admin-api.js src/server/index.js tests/admin-api.test.js
git commit -m "feat(server): propaga stageMode no frame config + chave modoPalco no config.json"
```

---

### Task 4: Overlay recebe e repassa `stageMode`

**Files:**
- Modify: `src/overlay/overlay.js:8`
- Modify: `src/overlay/avatar-manager.js`

- [ ] **Step 1: Default do overlay**

Em `src/overlay/overlay.js`, ajuste o `DEFAULT_CONFIG`:

```js
const DEFAULT_CONFIG = { avatarLimit: 18, inactivitySeconds: 150, stageMode: true };
```

- [ ] **Step 2: Guardar o flag no manager e repassar às reações**

Em `src/overlay/avatar-manager.js`, dentro de `createManager(scene, cfg)`, adicione um `settings` mutável logo após criar o `registry`:

```js
  const settings = { stageMode: cfg.stageMode !== false };
```

Na função `handle`, troque os casos `follow` e `gift` do switch para passar `{ stage }`:

```js
      case 'follow': R.reactionFollow(scene, v, event.name || event.username, { stage: settings.stageMode }); break;
      case 'share': R.reactionStars(scene, v); break;
      case 'gift': R.reactionGift(scene, v, event, { stage: settings.stageMode }); break;
```

Na função `configure`, atualize também o `stageMode`:

```js
  function configure(newCfg) {
    registry.configure({
      limit: newCfg.avatarLimit,
      inactivityMs: newCfg.inactivitySeconds * 1000,
    });
    if (typeof newCfg.stageMode === 'boolean') settings.stageMode = newCfg.stageMode;
  }
```

- [ ] **Step 3: Sanidade — a suíte do root continua verde**

Run: `npm test`
Expected: PASS (nada quebrou; overlay/manager não têm teste unitário direto — verificação visual na Task 6).

- [ ] **Step 4: Commit**

```bash
git add src/overlay/overlay.js src/overlay/avatar-manager.js
git commit -m "feat(overlay): repassa stageMode do config para reactionFollow/reactionGift"
```

---

### Task 5: Admin — tipo `Config.stageMode` + checkbox "Modo palco"

**Files:**
- Modify: `admin/src/api.ts:3`
- Modify: `admin/src/api.test.ts`
- Modify: `admin/src/tabs/ConfigTab.tsx`

- [ ] **Step 1: Escrever o teste de `putConfig` (falha de tipo)**

Em `admin/src/api.test.ts`, ajuste o import e adicione o teste:

```ts
import { getConfig, putKey, saveSprite, putConfig } from './api';
```

```ts
test('putConfig manda PUT com stageMode no corpo', async () => {
  await putConfig({ username: 'x', avatarLimit: 18, inactivitySeconds: 150, effectsVolume: 0.6, stageMode: false, port: 8737 });
  expect(fetch).toHaveBeenCalledWith('/admin/api/config', expect.objectContaining({
    method: 'PUT',
    body: expect.stringContaining('"stageMode":false'),
  }));
});
```

- [ ] **Step 2: Rodar typecheck e confirmar falha**

Run: `npm --prefix admin run typecheck`
Expected: FAIL — `Config` (e portanto `Omit<Config,'hasKey'>`) não tem `stageMode`, então o objeto do teste é inválido.

- [ ] **Step 3: Adicionar `stageMode` ao tipo `Config`**

Em `admin/src/api.ts`, na interface `Config`:

```ts
export interface Config { username: string; avatarLimit: number; inactivitySeconds: number; effectsVolume: number; stageMode: boolean; port: number; hasKey: boolean }
```

- [ ] **Step 4: Incluir `stageMode` no payload e adicionar o checkbox em `ConfigTab.tsx`**

Em `admin/src/tabs/ConfigTab.tsx`, no `salvar`, inclua `stageMode` no objeto do `putConfig`:

```tsx
    const r = await putConfig({ username: cfg.username, avatarLimit: cfg.avatarLimit, inactivitySeconds: cfg.inactivitySeconds, effectsVolume: cfg.effectsVolume, stageMode: cfg.stageMode, port: cfg.port });
```

Adicione um handler de checkbox logo após o `num`:

```tsx
  const check = (k: keyof Config) => (e: ChangeEvent<HTMLInputElement>) => setCfg({ ...cfg, [k]: e.target.checked });
```

E adicione o campo dentro do `<form>` (por exemplo após "Volume dos efeitos"):

```tsx
          <Field label="Modo palco (destaque de presente + banner)" type="checkbox" checked={cfg.stageMode} onChange={check('stageMode')} />
```

- [ ] **Step 5: Rodar typecheck e testes do admin**

Run: `npm --prefix admin run typecheck`
Expected: PASS.

Run: `npm --prefix admin test`
Expected: PASS (incluindo o novo `putConfig`).

- [ ] **Step 6: Commit**

```bash
git add admin/src/api.ts admin/src/api.test.ts admin/src/tabs/ConfigTab.tsx
git commit -m "feat(admin): checkbox Modo palco (stageMode) na aba Configuração"
```

---

### Task 6: Verificação final (suítes + QA manual no simulador)

**Files:** nenhum (verificação).

- [ ] **Step 1: Suíte do root**

Run: `npm test`
Expected: PASS — inclui `reactions` (easing), `config` (stageMode), `admin-api` (broadcast).

- [ ] **Step 2: Typecheck + testes do admin**

Run: `npm --prefix admin run typecheck`
Expected: PASS.

Run: `npm --prefix admin test`
Expected: PASS.

- [ ] **Step 3: QA visual — Modo palco LIGADO (default)**

Confirme que `config/config.json` tem `"modoPalco": true`. Rode o simulador:

Run: `npm run sim`

Abra `http://localhost:8737`. Observe (curtidas são frequentes; seguir/presente são raros — aguarde alguns segundos):
- **Corações (like):** leem como coração de verdade, sobem com pop de entrada, balanço lateral, brilho sutil, cores/tamanhos variados, somem no topo.
- **Estrelas (share):** estrela pontuda dourada, giro leve.
- **Confete (follow/gift):** mistura de quadrados e fitas, cores variadas, "gira no ar" (flutter) ao cair.
- **Presente (gift):** boneco vai ao centro, cresce proporcional às moedas, solta confete, e volta.
- **Seguir (follow):** banner com pop de entrada + confete no centro.

- [ ] **Step 4: QA visual — Modo palco DESLIGADO**

Pare o simulador (Ctrl+C). Edite `config/config.json` e troque para `"modoPalco": false`. Rode `npm run sim` de novo e **recarregue** a página do overlay (o frame `config` é enviado na conexão WS).

Observe:
- **Presente (gift):** NÃO centraliza o boneco — ele continua andando e dá um pop rápido de escala no lugar, com confete na cabeça.
- **Seguir (follow):** SEM banner — apenas confete na cabeça do avatar.
- Corações/estrelas/comentário (pulo) seguem iguais.

Restaure `"modoPalco": true` ao terminar (ou deixe conforme a preferência do usuário).

- [ ] **Step 5: Concluir a branch**

Use a skill `superpowers:finishing-a-development-branch` para decidir merge/PR/limpeza.

---

## Notas de implementação

- **PixiJS v8:** `new PIXI.Graphics(ctx)` reaproveita a geometria do contexto; `.tint` recolore por partícula; `blendMode = 'add'` faz o bloom. Contextos são criados **lazy** (nunca no top-level) pra `reactions.js` importar no Node sem `PIXI`. Ao destruir um `Graphics` que recebeu contexto no construtor, `destroy()` **preserva** o contexto compartilhado (não recriar/descartar geometria por partícula).
- **Retrocompat:** `reactionFollow`/`reactionGift` tratam `opts` ausente como `stage: true`, então tudo funciona antes da Task 4 ligar o flag.
- **Sem dependências novas.** Tunables no topo de `reactions.js` pra ajuste fino posterior.
