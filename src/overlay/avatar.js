import { createCharacterSprite, isVip } from './characters.js';

// Representa um avatar na tela: corpo + label @, com passeio pelo chão.
// Tudo dimensionado por scene.uiScale() (proporcional à altura do canvas).
export function createAvatarVisual({ username }, scene, avatarScale = 2) {
  const root = new PIXI.Container();
  const body = createCharacterSprite(username);
  root.addChild(body);

  const label = new PIXI.Text({
    text: '@' + username,
    style: { fontFamily: 'system-ui', fontSize: 12, fill: 0xffffff, stroke: { color: 0x000000, width: 3 } },
  });
  label.anchor.set(0.5, 0);
  root.addChild(label);

  let crown = null;
  function makeCrown() {
    crown = new PIXI.Text({ text: '👑', style: { fontFamily: 'system-ui', fontSize: 14 } });
    crown.anchor.set(0.5, 1);
    root.addChild(crown);
  }
  if (isVip(username)) makeCrown();

  let lastGlobal = avatarScale, lastUi = scene.uiScale();
  function applyScale(globalScale, ui) {
    lastGlobal = globalScale; lastUi = ui;
    body.applyScale(globalScale, ui);
    label.style.fontSize = Math.max(1, Math.round(12 * ui));
    label.y = 6 * ui;
    if (crown) { crown.style.fontSize = Math.max(1, Math.round(14 * ui)); crown.y = -body.height - 2; }
  }
  applyScale(avatarScale, scene.uiScale());

  // Entra caminhando por uma das bordas em direção ao centro.
  const ui0 = scene.uiScale();
  const screenWidth = scene.app.screen.width;
  root.x = Math.random() < 0.5 ? -30 * ui0 : screenWidth + 30 * ui0;
  root.y = scene.groundLine();
  scene.groundLayer.addChild(root);

  let direction = root.x < 0 ? 1 : -1;
  let speed = 0.02 + Math.random() * 0.02; // px por ms na referência (× uiScale ao andar)
  let leaving = false;
  let paused = false;
  body.faceTo(direction); // orienta a arte já na entrada

  function walk(dtMs) {
    if (paused) return;
    const ui = scene.uiScale();
    root.x += direction * speed * ui * dtMs;
    const w = scene.app.screen.width;
    const m = 30 * ui;
    if (!leaving) {
      if (root.x < m) direction = 1;
      if (root.x > w - m) direction = -1;
    }
    body.faceTo(direction); // vira ao inverter a direção nas bordas
  }

  function jump() {
    const base = scene.groundLine();
    let t = 0;
    const duration = 400, height = 34 * scene.uiScale();
    const anim = (ticker) => {
      if (root.destroyed) { scene.app.ticker.remove(anim); return; }
      t += ticker.deltaMS;
      const p = Math.min(1, t / duration);
      root.y = base - Math.sin(p * Math.PI) * height;
      if (p >= 1) { root.y = base; scene.app.ticker.remove(anim); }
    };
    scene.app.ticker.add(anim);
  }

  function leave(onDone) {
    leaving = true;
    paused = false; // um avatar em destaque/pausado ainda precisa andar pra fora
    body.play();
    direction = root.x < scene.app.screen.width / 2 ? -1 : 1;
    speed = 0.12;
    const anim = (ticker) => {
      walk(ticker.deltaMS);
      const off = 60 * scene.uiScale();
      if (root.x < -off || root.x > scene.app.screen.width + off) {
        scene.app.ticker.remove(anim);
        root.destroy({ children: true });
        onDone?.();
      }
    };
    scene.app.ticker.add(anim);
  }

  return {
    root, username, walk, jump, leave, applyScale,
    setVip: (on) => {
      if (on && !crown) { makeCrown(); applyScale(lastGlobal, lastUi); }
      else if (!on && crown) { crown.destroy(); crown = null; }
    },
    characterId: () => body.spriteId,
    pause: () => { paused = true; body.stop(); },
    resume: () => { paused = false; body.play(); },
    position: () => ({ x: root.x, y: root.y }),
  };
}
