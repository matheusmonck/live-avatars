import { giftScale } from './gift-scale.js';

function particula(scene, x, y, cor, forma = 'circulo') {
  const g = new PIXI.Graphics();
  if (forma === 'circulo') g.circle(0, 0, 5).fill(cor);
  else if (forma === 'coracao') g.circle(-3, 0, 3).fill(cor).circle(3, 0, 3).fill(cor).rect(-5, 0, 10, 6).fill(cor);
  else g.star(0, 0, 5, 7).fill(cor);
  g.x = x; g.y = y;
  scene.effectsLayer.addChild(g);
  return g;
}

function animarSubindo(scene, g, dur, driftX) {
  let t = 0;
  const anim = (ticker) => {
    t += ticker.deltaMS;
    const p = t / dur;
    g.y -= 0.05 * ticker.deltaMS;
    g.x += driftX * ticker.deltaMS;
    g.alpha = 1 - p;
    if (p >= 1) { scene.app.ticker.remove(anim); g.destroy(); }
  };
  scene.app.ticker.add(anim);
}

export function reacaoCuracao(scene, avatar) { // corações (curtida)
  const { x, y } = avatar.position();
  for (let i = 0; i < 4; i++) {
    const g = particula(scene, x + (Math.random() * 30 - 15), y - 50, 0xff5d8f, 'coracao');
    animarSubindo(scene, g, 1200, (Math.random() - 0.5) * 0.02);
  }
}

export function reacaoEstrelas(scene, avatar) { // compartilhar
  const { x, y } = avatar.position();
  for (let i = 0; i < 6; i++) {
    const g = particula(scene, x + (Math.random() * 40 - 20), y - 50, 0xffd166, 'estrela');
    animarSubindo(scene, g, 1000, (Math.random() - 0.5) * 0.05);
  }
}

export function reacaoSeguir(scene, avatar, nome) { // confete + faixa
  explodirConfete(scene, avatar.position().x, avatar.position().y - 50, 40);
  const faixa = new PIXI.Text({
    text: `⭐ novo seguidor: @${nome} 💖`,
    style: { fontFamily: 'system-ui', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 4 } },
  });
  faixa.anchor.set(0.5);
  faixa.x = scene.app.screen.width / 2;
  faixa.y = scene.app.screen.height * 0.15;
  scene.effectsLayer.addChild(faixa);
  let t = 0;
  const anim = (ticker) => {
    t += ticker.deltaMS;
    if (t > 2500) faixa.alpha = Math.max(0, 1 - (t - 2500) / 800);
    if (faixa.alpha <= 0) { scene.app.ticker.remove(anim); faixa.destroy(); }
  };
  scene.app.ticker.add(anim);
}

function explodirConfete(scene, x, y, quantidade) {
  const cores = [0xff6b9d, 0x4fd1c5, 0xffd166, 0x6c8cff, 0xe63946];
  for (let i = 0; i < quantidade; i++) {
    const g = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(cores[i % cores.length]);
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
export function reacaoPresente(scene, avatar, evento) {
  const fx = giftScale(evento.valorMoedas);
  const alvo = scene.highlightPoint();
  const inicio = avatar.position();
  const base = scene.groundLine();
  avatar.pause(); // pausa o passeio enquanto está em destaque
  scene.highlightLayer.addChild(avatar.root); // sobe o avatar pra camada de destaque (na frente do confete)
  let t = 0;
  const subir = 700;
  const animar = (ticker) => {
    if (avatar.root.destroyed) { scene.app.ticker.remove(animar); return; }
    t += ticker.deltaMS;
    const p = Math.min(1, t / subir);
    avatar.root.x = inicio.x + (alvo.x - inicio.x) * p;
    avatar.root.y = inicio.y + (alvo.y - inicio.y) * p;
    avatar.root.scale.set(1 + (fx.scale - 1) * p);
    if (p >= 1) {
      scene.app.ticker.remove(animar);
      explodirConfete(scene, alvo.x, alvo.y, fx.confetti);
      setTimeout(() => { if (!avatar.root.destroyed) voltar(); }, fx.durationMs);
    }
  };
  function voltar() {
    if (avatar.root.destroyed) return;
    let t2 = 0;
    const de = { x: avatar.root.x, y: avatar.root.y, s: avatar.root.scale.x };
    const anim2 = (ticker) => {
      if (avatar.root.destroyed) { scene.app.ticker.remove(anim2); return; }
      t2 += ticker.deltaMS;
      const p = Math.min(1, t2 / 500);
      avatar.root.x = de.x + (inicio.x - de.x) * p;
      avatar.root.y = de.y + (base - de.y) * p;
      avatar.root.scale.set(de.s + (1 - de.s) * p);
      if (p >= 1) {
        scene.app.ticker.remove(anim2);
        if (!avatar.root.destroyed) scene.groundLayer.addChild(avatar.root); // volta pra camada do chão
        avatar.resume();
      }
    };
    scene.app.ticker.add(anim2);
  }
  scene.app.ticker.add(animar);
}
