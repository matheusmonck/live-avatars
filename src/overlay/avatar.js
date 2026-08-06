import { createCharacterSprite, isVip } from './characters.js';

// Representa um avatar na tela: corpo + label @, com passeio pelo chão.
// Tudo dimensionado por scene.uiScale() (proporcional à altura do canvas).
export function createAvatarVisual({ username }, scene, avatarScale = 2) {
  const root = new PIXI.Container();
  const body = createCharacterSprite(username);
  root.addChild(body);

  const label = new PIXI.Text({
    text: '@' + username,
    style: { fontFamily: 'system-ui', fontSize: 18, fill: 0xffffff, stroke: { color: 0x000000, width: 4 } },
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

  // Balão de fala (comentário). Filho do root: acompanha o passeio e escala junto.
  let bubble = null; // { root, bg, txt }
  function layoutBubble(ui) {
    if (!bubble) return;
    const { bg, txt } = bubble;
    const bs = ui * scene.bubbleScale(); // escala do balão = responsivo × multiplicador do painel
    txt.style.fontSize = Math.max(1, Math.round(14 * bs));
    txt.style.wordWrapWidth = 150 * bs;
    const pad = 8 * bs;
    const w = txt.width + pad * 2;
    const h = txt.height + pad * 2;
    const r = Math.min(10 * bs, h / 2);
    const tail = 7 * bs;
    bg.clear();
    bg.roundRect(-w / 2, -h, w, h, r).fill({ color: 0x1b1b1f, alpha: 0.82 });
    bg.poly([-tail, -1, tail, -1, 0, tail]).fill({ color: 0x1b1b1f, alpha: 0.82 });
    txt.x = 0; txt.y = -h / 2;
    bubble.root.x = 0;
    bubble.root.y = -body.height - (crown ? 16 * ui : 6 * ui);
  }

  let lastGlobal = avatarScale, lastUi = scene.uiScale();
  function applyScale(globalScale, ui) {
    lastGlobal = globalScale; lastUi = ui;
    body.applyScale(globalScale, ui);
    // Nome (@) e coroa proporcionais à altura real do avatar (reflete escala
    // por-sprite × global × responsiva) × multiplicador de nome do painel.
    const ns = scene.nameScale();
    const nameSize = Math.max(8, Math.round(body.height * 0.16 * ns));
    label.style.fontSize = nameSize;
    label.style.stroke = { color: 0x000000, width: Math.max(2, Math.round(nameSize / 6)) };
    label.y = 6 * ui;
    if (crown) { crown.style.fontSize = Math.max(8, Math.round(body.height * 0.15 * ns)); crown.y = -body.height - 2; }
    layoutBubble(ui);
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
  let jumping = false;
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
    jumping = true;
    const duration = 400, height = 34 * scene.uiScale();
    const anim = (ticker) => {
      if (root.destroyed) { scene.app.ticker.remove(anim); return; }
      t += ticker.deltaMS;
      const p = Math.min(1, t / duration);
      root.y = base - Math.sin(p * Math.PI) * height;
      if (p >= 1) { root.y = base; jumping = false; scene.app.ticker.remove(anim); }
    };
    scene.app.ticker.add(anim);
  }

  // Reassenta o avatar na linha do chão atual (após mudar o offset Y ao vivo).
  // Ignora quem está pulando ou saindo pra não brigar com essas animações.
  function snapToGround() { if (!leaving && !jumping) root.y = scene.groundLine(); }

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

  function showBubble(text) {
    if (!bubble) {
      const root2 = new PIXI.Container();
      const bg = new PIXI.Graphics();
      const txt = new PIXI.Text({
        text: '',
        style: { fontFamily: 'system-ui', fontSize: 14, fill: 0xffffff, align: 'center', wordWrap: true, wordWrapWidth: 150, breakWords: true },
      });
      txt.anchor.set(0.5);
      root2.addChild(bg, txt);
      bubble = { root: root2, bg, txt };
      root.addChild(root2);
    }
    bubble.txt.text = text;
    layoutBubble(scene.uiScale());
  }
  function clearBubble() {
    if (bubble) { bubble.root.destroy({ children: true }); bubble = null; }
  }

  return {
    root, username, walk, jump, leave, applyScale, snapToGround, showBubble, clearBubble,
    hasBubble: () => bubble !== null,
    setVip: (on) => {
      if (on && !crown) { makeCrown(); applyScale(lastGlobal, lastUi); }
      else if (!on && crown) { crown.destroy(); crown = null; }
    },
    characterId: () => body.spriteId,
    pause: () => { paused = true; body.stop(); },
    resume: () => { paused = false; body.play(); },
    position: () => ({ x: root.x, y: root.y }),
    // Topo da cabeça em coordenadas do mundo: pé (root.y) − altura real do corpo
    // (já reflete escala global + por-sprite + uiScale). É de onde saem os efeitos.
    headPoint: () => ({ x: root.x, y: root.y - body.height }),
  };
}
