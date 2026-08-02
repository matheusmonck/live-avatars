import { uiScale as computeUiScale } from './scale.js';

// Cria a aplicação PixiJS transparente e as camadas da cena.
// Layout: fundo/terreno no rodapé; chão dos avatares; efeitos; destaque.
// Tudo agnóstico de formato: posições usam o canvas real; tamanhos = base × uiScale.
const GROUND_MARGIN = 90; // px acima do rodapé onde os avatares andam (na referência 1920)

export async function createScene(element) {
  const app = new PIXI.Application();
  await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: true });
  element.appendChild(app.canvas);

  const backgroundLayer = new PIXI.Container(); // terreno (atrás de tudo)
  const groundLayer = new PIXI.Container();     // avatares andando
  const effectsLayer = new PIXI.Container();    // corações, confete, estrelas
  const highlightLayer = new PIXI.Container();  // presente em destaque
  app.stage.addChild(backgroundLayer, groundLayer, effectsLayer, highlightLayer);

  const uiScale = () => computeUiScale(app.screen.height);

  let bgSprite = null;
  let bgOffset = 0;
  let bgScale = 1;
  let currentActive = null;
  function layoutBackground() {
    if (!bgSprite) return;
    const fit = app.screen.width / bgSprite.texture.width; // sempre preenche a largura
    bgSprite.scale.set(fit * bgScale);                      // × escala do terreno (ao vivo)
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
  function setTerrainScale(s) { bgScale = Number(s) || 1; layoutBackground(); }
  async function applyTerrain({ active = null, offset = 0, scale = 1 } = {}) {
    if (active !== currentActive) {
      currentActive = active;
      await setBackground(active ? 'assets/terrain-local/' + active : null);
    }
    bgOffset = Number(offset) || 0;
    bgScale = Number(scale) || 1;
    layoutBackground();
  }
  app.renderer.on('resize', layoutBackground);

  function groundLine() { return app.screen.height - GROUND_MARGIN * uiScale(); }
  function highlightPoint() { return { x: app.screen.width / 2, y: app.screen.height * 0.28 }; }

  return { app, backgroundLayer, groundLayer, effectsLayer, highlightLayer, uiScale, groundLine, highlightPoint, setBackground, setTerrainOffset, setTerrainScale, applyTerrain };
}
