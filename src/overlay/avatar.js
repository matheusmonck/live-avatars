import { desenharAvatar } from './styles.js';

// Representa um avatar na tela: corpo + label @, com passeio pelo chão.
export function criarAvatarVisual({ usuario, estilo }, cena) {
  const raiz = new PIXI.Container();
  const corpo = desenharAvatar(estilo, usuario);
  raiz.addChild(corpo);

  const label = new PIXI.Text({
    text: '@' + usuario,
    style: { fontFamily: 'system-ui', fontSize: 12, fill: 0xffffff, stroke: { color: 0x000000, width: 3 } },
  });
  label.anchor.set(0.5, 0);
  label.y = 6;
  raiz.addChild(label);

  // Entra caminhando por uma das bordas em direção ao centro.
  const larguraTela = cena.app.screen.width;
  raiz.x = Math.random() < 0.5 ? -30 : larguraTela + 30;
  raiz.y = cena.linhaChao();
  cena.camadaChao.addChild(raiz);

  let direcao = raiz.x < 0 ? 1 : -1;
  let velocidade = 0.02 + Math.random() * 0.02; // px por ms
  let saindo = false;
  let pausado = false;

  function andar(dtMs) {
    if (pausado) return;
    raiz.x += direcao * velocidade * dtMs;
    corpo.scale.x = direcao; // "olha" pra onde anda
    const larg = cena.app.screen.width;
    if (!saindo) {
      if (raiz.x < 30) direcao = 1;
      if (raiz.x > larg - 30) direcao = -1;
    }
  }

  function pular() {
    const base = cena.linhaChao();
    let t = 0;
    const dur = 400, altura = 34;
    const anim = (ticker) => {
      if (raiz.destroyed) { cena.app.ticker.remove(anim); return; }
      t += ticker.deltaMS;
      const p = Math.min(1, t / dur);
      raiz.y = base - Math.sin(p * Math.PI) * altura;
      if (p >= 1) { raiz.y = base; cena.app.ticker.remove(anim); }
    };
    cena.app.ticker.add(anim);
  }

  function sair(aoFim) {
    saindo = true;
    pausado = false; // um avatar em destaque/pausado ainda precisa andar pra fora
    direcao = raiz.x < cena.app.screen.width / 2 ? -1 : 1;
    velocidade = 0.12;
    const anim = (ticker) => {
      andar(ticker.deltaMS);
      if (raiz.x < -60 || raiz.x > cena.app.screen.width + 60) {
        cena.app.ticker.remove(anim);
        raiz.destroy({ children: true });
        aoFim?.();
      }
    };
    cena.app.ticker.add(anim);
  }

  return {
    raiz, usuario, andar, pular, sair,
    pausar: () => { pausado = true; },
    retomar: () => { pausado = false; },
    posicao: () => ({ x: raiz.x, y: raiz.y }),
  };
}
