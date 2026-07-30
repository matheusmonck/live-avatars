import { giftScale } from './gift-scale.js';

function particle(scene, x, y, color, shape = 'circle') {
  const g = new PIXI.Graphics();
  if (shape === 'circle') g.circle(0, 0, 5).fill(color);
  else if (shape === 'heart') g.circle(-3, 0, 3).fill(color).circle(3, 0, 3).fill(color).rect(-5, 0, 10, 6).fill(color);
  else g.star(0, 0, 5, 7).fill(color);
  g.x = x; g.y = y;
  scene.effectsLayer.addChild(g);
  return g;
}

function animateRising(scene, g, duration, driftX) {
  let t = 0;
  const anim = (ticker) => {
    t += ticker.deltaMS;
    const p = t / duration;
    g.y -= 0.05 * ticker.deltaMS;
    g.x += driftX * ticker.deltaMS;
    g.alpha = 1 - p;
    if (p >= 1) { scene.app.ticker.remove(anim); g.destroy(); }
  };
  scene.app.ticker.add(anim);
}

export function reactionHearts(scene, avatar) { // corações (curtida)
  const { x, y } = avatar.position();
  for (let i = 0; i < 4; i++) {
    const g = particle(scene, x + (Math.random() * 30 - 15), y - 50, 0xff5d8f, 'heart');
    animateRising(scene, g, 1200, (Math.random() - 0.5) * 0.02);
  }
}

export function reactionStars(scene, avatar) { // compartilhar
  const { x, y } = avatar.position();
  for (let i = 0; i < 6; i++) {
    const g = particle(scene, x + (Math.random() * 40 - 20), y - 50, 0xffd166, 'star');
    animateRising(scene, g, 1000, (Math.random() - 0.5) * 0.05);
  }
}

export function reactionFollow(scene, avatar, name) { // confete + faixa
  explodeConfetti(scene, avatar.position().x, avatar.position().y - 50, 40);
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
    if (t > 2500) banner.alpha = Math.max(0, 1 - (t - 2500) / 800);
    if (banner.alpha <= 0) { scene.app.ticker.remove(anim); banner.destroy(); }
  };
  scene.app.ticker.add(anim);
}

function explodeConfetti(scene, x, y, count) {
  const colors = [0xff6b9d, 0x4fd1c5, 0xffd166, 0x6c8cff, 0xe63946];
  for (let i = 0; i < count; i++) {
    const g = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(colors[i % colors.length]);
    g.x = x; g.y = y;
    scene.effectsLayer.addChild(g);
    let vx = (Math.random() - 0.5) * 0.4;
    let vy = -Math.random() * 0.5 - 0.2;
    let t = 0;
    const anim = (ticker) => {
      t += ticker.deltaMS;
      vy += 0.001 * ticker.deltaMS; // gravidade
      g.x += vx * ticker.deltaMS;
      g.y += vy * ticker.deltaMS;
      g.rotation += 0.01 * ticker.deltaMS;
      g.alpha = Math.max(0, 1 - t / 2500);
      if (g.alpha <= 0) { scene.app.ticker.remove(anim); g.destroy(); }
    };
    scene.app.ticker.add(anim);
  }
}

// Presente: leva o avatar pro destaque, aplica escala e confete proporcional.
export function reactionGift(scene, avatar, event) {
  const fx = giftScale(event.coins);
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
      explodeConfetti(scene, target.x, target.y, fx.confetti);
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
