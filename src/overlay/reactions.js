import { escalaPresente } from './gift-scale.js';

function particula(cena, x, y, cor, forma = 'circulo') {
  const g = new PIXI.Graphics();
  if (forma === 'circulo') g.circle(0, 0, 5).fill(cor);
  else if (forma === 'coracao') g.circle(-3, 0, 3).fill(cor).circle(3, 0, 3).fill(cor).rect(-5, 0, 10, 6).fill(cor);
  else g.star(0, 0, 5, 7).fill(cor);
  g.x = x; g.y = y;
  cena.camadaEfeitos.addChild(g);
  return g;
}

function animarSubindo(cena, g, dur, driftX) {
  let t = 0;
  const anim = (ticker) => {
    t += ticker.deltaMS;
    const p = t / dur;
    g.y -= 0.05 * ticker.deltaMS;
    g.x += driftX * ticker.deltaMS;
    g.alpha = 1 - p;
    if (p >= 1) { cena.app.ticker.remove(anim); g.destroy(); }
  };
  cena.app.ticker.add(anim);
}

export function reacaoCuracao(cena, avatar) { // corações (curtida)
  const { x, y } = avatar.posicao();
  for (let i = 0; i < 4; i++) {
    const g = particula(cena, x + (Math.random() * 30 - 15), y - 50, 0xff5d8f, 'coracao');
    animarSubindo(cena, g, 1200, (Math.random() - 0.5) * 0.02);
  }
}

export function reacaoEstrelas(cena, avatar) { // compartilhar
  const { x, y } = avatar.posicao();
  for (let i = 0; i < 6; i++) {
    const g = particula(cena, x + (Math.random() * 40 - 20), y - 50, 0xffd166, 'estrela');
    animarSubindo(cena, g, 1000, (Math.random() - 0.5) * 0.05);
  }
}

export function reacaoSeguir(cena, avatar, nome) { // confete + faixa
  explodirConfete(cena, avatar.posicao().x, avatar.posicao().y - 50, 40);
  const faixa = new PIXI.Text({
    text: `⭐ novo seguidor: @${nome} 💖`,
    style: { fontFamily: 'system-ui', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 4 } },
  });
  faixa.anchor.set(0.5);
  faixa.x = cena.app.screen.width / 2;
  faixa.y = cena.app.screen.height * 0.15;
  cena.camadaEfeitos.addChild(faixa);
  let t = 0;
  const anim = (ticker) => {
    t += ticker.deltaMS;
    if (t > 2500) faixa.alpha = Math.max(0, 1 - (t - 2500) / 800);
    if (faixa.alpha <= 0) { cena.app.ticker.remove(anim); faixa.destroy(); }
  };
  cena.app.ticker.add(anim);
}

function explodirConfete(cena, x, y, quantidade) {
  const cores = [0xff6b9d, 0x4fd1c5, 0xffd166, 0x6c8cff, 0xe63946];
  for (let i = 0; i < quantidade; i++) {
    const g = new PIXI.Graphics().rect(-3, -3, 6, 6).fill(cores[i % cores.length]);
    g.x = x; g.y = y;
    cena.camadaEfeitos.addChild(g);
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
      if (g.alpha <= 0) { cena.app.ticker.remove(anim); g.destroy(); }
    };
    cena.app.ticker.add(anim);
  }
}

// Presente: leva o avatar pro destaque, aplica escala e confete proporcional.
export function reacaoPresente(cena, avatar, evento) {
  const e = escalaPresente(evento.valorMoedas);
  const alvo = cena.pontoDestaque();
  const inicio = avatar.posicao();
  const base = cena.linhaChao();
  avatar.pausar(); // pausa o passeio enquanto está em destaque
  let t = 0;
  const subir = 700;
  const animar = (ticker) => {
    if (avatar.raiz.destroyed) { cena.app.ticker.remove(animar); return; }
    t += ticker.deltaMS;
    const p = Math.min(1, t / subir);
    avatar.raiz.x = inicio.x + (alvo.x - inicio.x) * p;
    avatar.raiz.y = inicio.y + (alvo.y - inicio.y) * p;
    avatar.raiz.scale.set(1 + (e.escala - 1) * p);
    if (p >= 1) {
      cena.app.ticker.remove(animar);
      explodirConfete(cena, alvo.x, alvo.y, e.confetes);
      setTimeout(() => { if (!avatar.raiz.destroyed) voltar(); }, e.duracaoMs);
    }
  };
  function voltar() {
    if (avatar.raiz.destroyed) return;
    let t2 = 0;
    const de = { x: avatar.raiz.x, y: avatar.raiz.y, s: avatar.raiz.scale.x };
    const anim2 = (ticker) => {
      if (avatar.raiz.destroyed) { cena.app.ticker.remove(anim2); return; }
      t2 += ticker.deltaMS;
      const p = Math.min(1, t2 / 500);
      avatar.raiz.x = de.x + (inicio.x - de.x) * p;
      avatar.raiz.y = de.y + (base - de.y) * p;
      avatar.raiz.scale.set(de.s + (1 - de.s) * p);
      if (p >= 1) { cena.app.ticker.remove(anim2); avatar.retomar(); }
    };
    cena.app.ticker.add(anim2);
  }
  cena.app.ticker.add(animar);
}
