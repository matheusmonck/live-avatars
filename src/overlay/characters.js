// Personagens CC0 (Ansimuz, "Top Down Adventure Assets") — 16x16, 2 quadros de caminhada.
export const CHARACTERS = [
  "hero",
  "cap",
  "dog",
  "frog",
  "girl",
  "hood",
  "kid",
  "miner",
  "oldwoman",
  "sage",
  "woman",
  "robo",
  "link-minish-cap",
];

const SCALE = 2; // escala padrão: 16px -> 64px
const ANIM_SPEED = 0.06; // troca de quadro por ms de ticker
const DEFAULT_FRAMES = 2; // nº de quadros de um personagem quando não há override

// Overrides por personagem — liste só o que fugir do padrão:
//   FRAMES: quantos quadros de animação (arquivos <nome>/1.png ... <nome>/N.png).
//   SCALES: fator de ampliação; use se o PNG não for 16x16 (ex.: PNG 32x32 -> escala 2).
const FRAMES = { robo: 4, "link-minish-cap": 10 };
const SCALES = { "link-minish-cap": 2 };
// Para que lado a ARTE aponta (não a direção do movimento). O avatar espelha o
// sprite pra andar na direção certa; arte 'frente' (padrão) nunca é espelhada.
//   'frente'   -> personagem de frente/simétrico (ansimuz, robo): não vira
//   'esquerda' -> arte desenhada olhando pra esquerda (ex.: link-minish-cap)
//   'direita'  -> arte desenhada olhando pra direita
const FACING = { "link-minish-cap": "left" };

function framesOf(name) {
  return FRAMES[name] ?? DEFAULT_FRAMES;
}
function scaleOf(name) {
  return SCALES[name] ?? SCALE;
}
function facingOf(name) {
  return FACING[name] ?? "front";
}

// Cada personagem tem sua própria pasta: assets/characters/<nome>/1.png ... N.png
function urls(name) {
  return Array.from(
    { length: framesOf(name) },
    (_, i) => `assets/characters/${name}/${i + 1}.png`,
  );
}

// Hash estável (djb2) -> personagem fixo por usuário.
export function characterForUser(username) {
  let h = 5381;
  for (let i = 0; i < username.length; i++)
    h = ((h << 5) + h + username.charCodeAt(i)) >>> 0;
  return CHARACTERS[h % CHARACTERS.length];
}

const cache = new Map(); // nome -> [Texture, Texture]

// Pré-carrega todas as texturas (chamar 1x antes de criar avatares).
export async function loadCharacters() {
  const all = CHARACTERS.flatMap(urls);
  const map = await PIXI.Assets.load(all);
  for (const u of all) {
    const t = map[u];
    if (t?.source) t.source.scaleMode = "nearest";
  } // pixel nítido
  for (const name of CHARACTERS)
    cache.set(
      name,
      urls(name).map((u) => map[u]),
    );
}

// Cria o AnimatedSprite do personagem do usuário (texturas já pré-carregadas).
export function createCharacterSprite(username) {
  const name = characterForUser(username);
  const frames = cache.get(name);
  const sprite = new PIXI.AnimatedSprite(frames);
  sprite.anchor.set(0.5, 1); // "pés" na origem (linha do chão)
  const scale = scaleOf(name);
  sprite.scale.set(scale);
  sprite.animationSpeed = ANIM_SPEED;
  sprite.play();

  // Espelha o sprite pra olhar na direção do movimento (+1 direita, -1 esquerda).
  // Arte 'frente' não vira; 'esquerda'/'direita' viram conforme a convenção.
  const facing = facingOf(name);
  sprite.faceTo = (direction) => {
    if (facing === "front") return;
    const facesLeft = facing === "left";
    sprite.scale.x = scale * ((direction === -1) === facesLeft ? 1 : -1);
  };
  return sprite;
}
