import { createCharacterSprite } from './characters.js';

// Representa um avatar na tela: corpo + label @, com passeio pelo chão.
export function createAvatarVisual({ username }, scene) {
  const root = new PIXI.Container();
  const body = createCharacterSprite(username);
  root.addChild(body);

  const label = new PIXI.Text({
    text: '@' + username,
    style: { fontFamily: 'system-ui', fontSize: 12, fill: 0xffffff, stroke: { color: 0x000000, width: 3 } },
  });
  label.anchor.set(0.5, 0);
  label.y = 6;
  root.addChild(label);

  // Entra caminhando por uma das bordas em direção ao centro.
  const screenWidth = scene.app.screen.width;
  root.x = Math.random() < 0.5 ? -30 : screenWidth + 30;
  root.y = scene.groundLine();
  scene.groundLayer.addChild(root);

  let direction = root.x < 0 ? 1 : -1;
  let speed = 0.02 + Math.random() * 0.02; // px por ms
  let leaving = false;
  let paused = false;
  body.faceTo(direction); // orienta a arte já na entrada

  function walk(dtMs) {
    if (paused) return;
    root.x += direction * speed * dtMs;
    const w = scene.app.screen.width;
    if (!leaving) {
      if (root.x < 30) direction = 1;
      if (root.x > w - 30) direction = -1;
    }
    body.faceTo(direction); // vira ao inverter a direção nas bordas
  }

  function jump() {
    const base = scene.groundLine();
    let t = 0;
    const duration = 400, height = 34;
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
      if (root.x < -60 || root.x > scene.app.screen.width + 60) {
        scene.app.ticker.remove(anim);
        root.destroy({ children: true });
        onDone?.();
      }
    };
    scene.app.ticker.add(anim);
  }

  return {
    root, username, walk, jump, leave,
    pause: () => { paused = true; body.stop(); },
    resume: () => { paused = false; body.play(); },
    position: () => ({ x: root.x, y: root.y }),
  };
}
