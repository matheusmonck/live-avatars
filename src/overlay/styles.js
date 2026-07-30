const CORES = [0xff6b9d, 0x4fd1c5, 0xffd166, 0x6c8cff, 0xe63946, 0x2a9d8f];

function corDe(usuario) {
  let h = 0;
  for (let i = 0; i < usuario.length; i++) h = (h + usuario.charCodeAt(i)) % CORES.length;
  return CORES[h];
}

// Desenha um blob fofo dentro de um Container.
function desenharBlob(usuario) {
  const c = new PIXI.Container();
  const cor = corDe(usuario);
  const corpo = new PIXI.Graphics().roundRect(-26, -60, 52, 60, 22).fill(cor);
  const olhoE = new PIXI.Graphics().circle(-10, -34, 5).fill(0xffffff);
  const olhoD = new PIXI.Graphics().circle(10, -34, 5).fill(0xffffff);
  const pupE = new PIXI.Graphics().circle(-9, -33, 2).fill(0x111111);
  const pupD = new PIXI.Graphics().circle(11, -33, 2).fill(0x111111);
  c.addChild(corpo, olhoE, olhoD, pupE, pupD);
  return c;
}

// Desenha um personagem pixel art simples dentro de um Container.
function desenharPixel(usuario) {
  const c = new PIXI.Container();
  const cor = corDe(usuario);
  const cabeca = new PIXI.Graphics().rect(-16, -60, 32, 26).fill(0xf4c28a);
  const cabelo = new PIXI.Graphics().rect(-16, -60, 32, 8).fill(0x5b3a2e);
  const olhoE = new PIXI.Graphics().rect(-10, -48, 5, 5).fill(0x111111);
  const olhoD = new PIXI.Graphics().rect(6, -48, 5, 5).fill(0x111111);
  const corpo = new PIXI.Graphics().rect(-20, -34, 40, 26).fill(cor);
  const pernaE = new PIXI.Graphics().rect(-16, -8, 12, 8).fill(0x3a3f52);
  const pernaD = new PIXI.Graphics().rect(4, -8, 12, 8).fill(0x3a3f52);
  c.addChild(cabeca, cabelo, olhoE, olhoD, corpo, pernaE, pernaD);
  return c;
}

export function desenharAvatar(estilo, usuario) {
  return estilo === 'pixel' ? desenharPixel(usuario) : desenharBlob(usuario);
}
