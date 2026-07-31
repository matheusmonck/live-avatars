// Cria a aplicação PixiJS transparente e as camadas da cena.
// Layout: fundo/terreno no rodapé; chão dos avatares; efeitos; destaque.
export async function createScene(element) {
  const app = new PIXI.Application();
  await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: true });
  element.appendChild(app.canvas);

  const backgroundLayer = new PIXI.Container(); // terreno (atrás de tudo)
  const groundLayer = new PIXI.Container();     // avatares andando
  const effectsLayer = new PIXI.Container();    // corações, confete, estrelas
  const highlightLayer = new PIXI.Container();  // presente em destaque
  app.stage.addChild(backgroundLayer, groundLayer, effectsLayer, highlightLayer);

  let bgSprite = null;
  let bgOffset = 0;
  let currentActive = null;
  function layoutBackground() {
    if (!bgSprite) return;
    const scale = app.screen.width / bgSprite.texture.width;
    bgSprite.scale.set(scale);
    bgSprite.x = 0;
    bgSprite.y = app.screen.height - bgSprite.height + bgOffset; // rodapé + ajuste vertical
  }
  async function setBackground(url) {
    if (bgSprite) { bgSprite.destroy(); bgSprite = null; }
    if (!url) return;
    const tex = await PIXI.Assets.load(url);
    bgSprite = new PIXI.Sprite(tex);
    backgroundLayer.addChild(bgSprite);
    layoutBackground();
  }
  function setTerrainOffset(px) { bgOffset = Number(px) || 0; layoutBackground(); }
  async function applyTerrain({ active = null, offset = 0 } = {}) {
    if (active !== currentActive) {
      currentActive = active;
      await setBackground(active ? 'assets/terrain-local/' + active : null);
    }
    setTerrainOffset(offset);
  }
  app.renderer.on('resize', layoutBackground);

  function groundLine() { return app.screen.height - 90; }
  function highlightPoint() { return { x: app.screen.width / 2, y: app.screen.height * 0.28 }; }

  return { app, backgroundLayer, groundLayer, effectsLayer, highlightLayer, groundLine, highlightPoint, setBackground, setTerrainOffset, applyTerrain };
}
