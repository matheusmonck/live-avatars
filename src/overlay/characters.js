// Roster de personagens orientado a dados: characters.json (repo, CC0 padrão) +
// characters.local.json (gitignored, sprites do usuário). Sprites de 16x16, N quadros.
const ANIM_SPEED = 0.06;          // troca de quadro por ms de ticker
const DEFAULTS = { frames: 2, scale: 2, facing: 'front' };

// Seleção determinística (djb2) — pura e testável, sem PIXI/fetch.
export function pickId(username, ids) {
  let h = 5381;
  for (let i = 0; i < username.length; i++)
    h = ((h << 5) + h + username.charCodeAt(i)) >>> 0;
  return ids[h % ids.length];
}

// Aplica defaults a uma entrada bruta do roster e fixa a pasta base.
export function resolveEntry(entry, base) {
  return {
    id: entry.id,
    frames: entry.frames ?? DEFAULTS.frames,
    scale: entry.scale ?? DEFAULTS.scale,
    facing: entry.facing ?? DEFAULTS.facing,
    base,
  };
}

function urlsFor(entry) {
  return Array.from({ length: entry.frames }, (_, i) => `${entry.base}/${entry.id}/${i + 1}.png`);
}

let roster = [];                  // entradas resolvidas, populado no load
const cache = new Map();          // id -> [Texture, ...]

async function fetchRoster(url, base) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.characters ?? []).map((e) => resolveEntry(e, base));
  } catch {
    return [];
  }
}

// Pré-carrega todas as texturas (chamar 1x antes de criar avatares).
export async function loadCharacters() {
  const defaults = await fetchRoster('characters.json', 'assets/characters');
  if (!defaults.length) throw new Error('characters.json ausente ou vazio');
  const locals = await fetchRoster('characters.local.json', 'assets/characters-local');

  const byId = new Map();
  for (const e of defaults) byId.set(e.id, e);
  for (const e of locals) byId.set(e.id, e); // id local vence colisão
  roster = [...byId.values()];

  const all = roster.flatMap(urlsFor);
  const map = await PIXI.Assets.load(all);
  for (const u of all) {
    const t = map[u];
    if (t?.source) t.source.scaleMode = 'nearest'; // pixel nítido
  }
  for (const e of roster) cache.set(e.id, urlsFor(e).map((u) => map[u]));
}

// Personagem fixo por usuário (hash estável sobre o roster carregado).
export function characterForUser(username) {
  return pickId(username, roster.map((e) => e.id));
}

// Cria o AnimatedSprite do personagem do usuário (texturas já pré-carregadas).
export function createCharacterSprite(username) {
  const id = characterForUser(username);
  const entry = roster.find((e) => e.id === id);
  const sprite = new PIXI.AnimatedSprite(cache.get(id));
  sprite.anchor.set(0.5, 1); // "pés" na origem (linha do chão)
  sprite.scale.set(entry.scale);
  sprite.animationSpeed = ANIM_SPEED;
  sprite.play();

  // Espelha o sprite pra olhar na direção do movimento (+1 direita, -1 esquerda).
  // Arte 'front' não vira; 'left'/'right' viram conforme a convenção.
  const facing = entry.facing;
  sprite.faceTo = (direction) => {
    if (facing === 'front') return;
    const facesLeft = facing === 'left';
    sprite.scale.x = entry.scale * ((direction === -1) === facesLeft ? 1 : -1);
  };
  return sprite;
}
