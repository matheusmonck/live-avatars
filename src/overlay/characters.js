// Personagens CC0 (Ansimuz, "Top Down Adventure Assets") — 16x16, 2 quadros de caminhada.
export const PERSONAGENS = ['hero','cap','dog','frog','girl','hood','kid','miner','oldwoman','sage','woman'];

const ESCALA = 4;             // 16px -> 64px
const VELOCIDADE_ANIM = 0.06; // troca de quadro por ms de ticker

function urls(nome) { return [`assets/characters/${nome}-1.png`, `assets/characters/${nome}-2.png`]; }

// Hash estável (djb2) -> personagem fixo por usuário.
export function personagemDoUsuario(usuario) {
  let h = 5381;
  for (let i = 0; i < usuario.length; i++) h = ((h << 5) + h + usuario.charCodeAt(i)) >>> 0;
  return PERSONAGENS[h % PERSONAGENS.length];
}

const cache = new Map(); // nome -> [Texture, Texture]

// Pré-carrega todas as texturas (chamar 1x antes de criar avatares).
export async function carregarPersonagens() {
  const todas = PERSONAGENS.flatMap(urls);
  const mapa = await PIXI.Assets.load(todas);
  for (const u of todas) { const t = mapa[u]; if (t?.source) t.source.scaleMode = 'nearest'; } // pixel nítido
  for (const nome of PERSONAGENS) cache.set(nome, urls(nome).map(u => mapa[u]));
}

// Cria o AnimatedSprite do personagem do usuário (texturas já pré-carregadas).
export function criarSpritePersonagem(usuario) {
  const nome = personagemDoUsuario(usuario);
  const quadros = cache.get(nome);
  const sprite = new PIXI.AnimatedSprite(quadros);
  sprite.anchor.set(0.5, 1);      // "pés" na origem (linha do chão)
  sprite.scale.set(ESCALA);
  sprite.animationSpeed = VELOCIDADE_ANIM;
  sprite.play();
  return sprite;
}
