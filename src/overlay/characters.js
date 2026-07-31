// Roster de personagens orientado a dados: characters.json (repo, CC0 padrão) +
// characters.local.json (gitignored, sprites do usuário). Sprites de 16x16, N quadros.
const ANIM_SPEED = 0.06;          // troca de quadro por ms de ticker
const DEFAULTS = { frames: 2, scale: 2, facing: 'front' };

// Seleção determinística (djb2) — pura e testável, sem PIXI/fetch.
export function pickId(username, ids, overrides = {}) {
  const forced = overrides[username];
  if (forced && ids.includes(forced)) return forced;
  let h = 5381;
  for (let i = 0; i < username.length; i++)
    h = ((h << 5) + h + username.charCodeAt(i)) >>> 0;
  return ids[h % ids.length];
}

// Remove ids ocultos do roster; nunca deixa vazio (trava de segurança).
export function visibleRoster(entries, hiddenIds) {
  const hidden = new Set(hiddenIds ?? []);
  const visible = entries.filter((e) => !hidden.has(e.id));
  return visible.length ? visible : entries;
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
let overrides = {};               // mapa usuario -> spriteId (characters.json + local)
const cache = new Map();          // id -> [Texture, ...]

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Pré-carrega todas as texturas (chamar 1x antes de criar avatares).
export async function loadCharacters() {
  const defData = (await fetchJson('characters.json')) ?? {};
  const locData = (await fetchJson('characters.local.json')) ?? {};
  const defaults = (defData.characters ?? []).map((e) => resolveEntry(e, 'assets/characters'));
  if (!defaults.length) throw new Error('characters.json ausente ou vazio');
  const locals = (locData.characters ?? []).map((e) => resolveEntry(e, 'assets/characters-local'));
  overrides = { ...(defData.overrides ?? {}), ...(locData.overrides ?? {}) };

  const byId = new Map();
  for (const e of defaults) byId.set(e.id, e);
  for (const e of locals) byId.set(e.id, e); // id local vence colisão
  roster = visibleRoster([...byId.values()], locData.hidden);

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
  return pickId(username, roster.map((e) => e.id), overrides);
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
