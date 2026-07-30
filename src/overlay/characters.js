// Personagens CC0 (Ansimuz, "Top Down Adventure Assets") — 16x16, 2 quadros de caminhada.
export const PERSONAGENS = [
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

const ESCALA = 2; // escala padrão: 16px -> 64px
const VELOCIDADE_ANIM = 0.06; // troca de quadro por ms de ticker
const PADRAO_QUADROS = 2; // nº de quadros de um personagem quando não há override

// Overrides por personagem — liste só o que fugir do padrão:
//   QUADROS: quantos quadros de animação (arquivos <nome>/1.png ... <nome>/N.png).
//   ESCALAS: fator de ampliação; use se o PNG não for 16x16 (ex.: PNG 32x32 -> escala 2).
const QUADROS = { robo: 4, "link-minish-cap": 10 };
const ESCALAS = { "link-minish-cap": 2 };
// Para que lado a ARTE aponta (não a direção do movimento). O avatar espelha o
// sprite pra andar na direção certa; arte 'frente' (padrão) nunca é espelhada.
//   'frente'   -> personagem de frente/simétrico (ansimuz, robo): não vira
//   'esquerda' -> arte desenhada olhando pra esquerda (ex.: link-minish-cap)
//   'direita'  -> arte desenhada olhando pra direita
const OLHANDO = { "link-minish-cap": "esquerda" };

function quadrosDe(nome) {
  return QUADROS[nome] ?? PADRAO_QUADROS;
}
function escalaDe(nome) {
  return ESCALAS[nome] ?? ESCALA;
}
function olhandoDe(nome) {
  return OLHANDO[nome] ?? "frente";
}

// Cada personagem tem sua própria pasta: assets/characters/<nome>/1.png ... N.png
function urls(nome) {
  return Array.from(
    { length: quadrosDe(nome) },
    (_, i) => `assets/characters/${nome}/${i + 1}.png`,
  );
}

// Hash estável (djb2) -> personagem fixo por usuário.
export function personagemDoUsuario(usuario) {
  let h = 5381;
  for (let i = 0; i < usuario.length; i++)
    h = ((h << 5) + h + usuario.charCodeAt(i)) >>> 0;
  return PERSONAGENS[h % PERSONAGENS.length];
}

const cache = new Map(); // nome -> [Texture, Texture]

// Pré-carrega todas as texturas (chamar 1x antes de criar avatares).
export async function carregarPersonagens() {
  const todas = PERSONAGENS.flatMap(urls);
  const mapa = await PIXI.Assets.load(todas);
  for (const u of todas) {
    const t = mapa[u];
    if (t?.source) t.source.scaleMode = "nearest";
  } // pixel nítido
  for (const nome of PERSONAGENS)
    cache.set(
      nome,
      urls(nome).map((u) => mapa[u]),
    );
}

// Cria o AnimatedSprite do personagem do usuário (texturas já pré-carregadas).
export function criarSpritePersonagem(usuario) {
  const nome = personagemDoUsuario(usuario);
  const quadros = cache.get(nome);
  const sprite = new PIXI.AnimatedSprite(quadros);
  sprite.anchor.set(0.5, 1); // "pés" na origem (linha do chão)
  const escala = escalaDe(nome);
  sprite.scale.set(escala);
  sprite.animationSpeed = VELOCIDADE_ANIM;
  sprite.play();

  // Espelha o sprite pra olhar na direção do movimento (+1 direita, -1 esquerda).
  // Arte 'frente' não vira; 'esquerda'/'direita' viram conforme a convenção.
  const olhar = olhandoDe(nome);
  sprite.virarPara = (direcao) => {
    if (olhar === "frente") return;
    const olhaEsquerda = olhar === "esquerda";
    sprite.scale.x = escala * ((direcao === -1) === olhaEsquerda ? 1 : -1);
  };
  return sprite;
}
