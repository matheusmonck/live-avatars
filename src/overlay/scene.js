// Cria a aplicação PixiJS transparente e as camadas da cena.
// Layout: chão no rodapé; zona de destaque no centro-alto.
export async function criarCena(elemento) {
  const app = new PIXI.Application();
  await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: true });
  elemento.appendChild(app.canvas);

  const camadaChao = new PIXI.Container();       // avatares andando
  const camadaEfeitos = new PIXI.Container();    // corações, confete, estrelas
  const camadaDestaque = new PIXI.Container();   // presente em destaque
  app.stage.addChild(camadaChao, camadaEfeitos, camadaDestaque);

  function linhaChao() { return app.screen.height - 90; }
  function pontoDestaque() { return { x: app.screen.width / 2, y: app.screen.height * 0.28 }; }

  return { app, camadaChao, camadaEfeitos, camadaDestaque, linhaChao, pontoDestaque };
}
