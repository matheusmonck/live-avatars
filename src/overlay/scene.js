// Cria a aplicação PixiJS transparente e as camadas da cena.
// Layout: chão no rodapé; zona de destaque no centro-alto.
export async function createScene(element) {
  const app = new PIXI.Application();
  await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: true });
  element.appendChild(app.canvas);

  const groundLayer = new PIXI.Container();       // avatares andando
  const effectsLayer = new PIXI.Container();    // corações, confete, estrelas
  const highlightLayer = new PIXI.Container();   // presente em destaque
  app.stage.addChild(groundLayer, effectsLayer, highlightLayer);

  function groundLine() { return app.screen.height - 90; }
  function highlightPoint() { return { x: app.screen.width / 2, y: app.screen.height * 0.28 }; }

  return { app, groundLayer, effectsLayer, highlightLayer, groundLine, highlightPoint };
}
