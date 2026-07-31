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
    scene.effectsLayer.addChild(g);
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
    if (banner.destroyed) { scene.app.ticker.remove(anim); return; }
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
