import { effectiveScale } from './scale.js';

// Roster de personagens orientado a dados: characters.json (repo, CC0 padrão) +
// characters.local.json (gitignored, sprites do usuário). Sprites de 16x16, N quadros.
const ANIM_SPEED = 0.09;          // troca de quadro por ms de ticker (0.06 = mais lento)
const DEFAULTS = { frames: 2, scale: 2, facing: 'front' };

// Seleção determinística (djb2) — pura e testável, sem PIXI/fetch.
export function pickId(username, ids, overrides = {}) {
  const forced = overrides[username];
  if (forced && ids.includes(forced)) return forced;
  // Sprites reservados por override (fixados a um usuário) não entram no
  // sorteio dos demais — senão outros viewers "virariam" o mesmo personagem.
  // Trava: se sobrar vazio (tudo reservado), volta ao roster completo.
  const reserved = new Set(Object.values(overrides));
  const pool = ids.filter((id) => !reserved.has(id));
  const usable = pool.length ? pool : ids;
  let h = 5381;
  for (let i = 0; i < username.length; i++)
    h = ((h << 5) + h + username.charCodeAt(i)) >>> 0;
  return usable[h % usable.length];
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
let vipSet = new Set();           // usernames VIP (characters.local.json vip:[...])
const cache = new Map();          // id -> [Texture, ...]

async function fetchJson(url, bust = false) {
  try {
    const res = await fetch(bust ? `${url}?t=${Date.now()}` : url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Override de escala por id (mapa `scales` do characters.local.json) sobre a entrada crua.
function withScale(entry, scales) {
  return scales?.[entry.id] != null ? { ...entry, scale: scales[entry.id] } : entry;
}

// Reconstrói o roster + overrides + vip e (re)carrega as texturas. `bust` fura o
// cache do fetch pra refletir edições ao vivo do /admin.
async function buildAndLoad(bust) {
  const defData = (await fetchJson('characters.json', bust)) ?? {};
  const locData = (await fetchJson('characters.local.json', bust)) ?? {};
  const scales = locData.scales ?? {};
  const defaults = (defData.characters ?? []).map((e) => resolveEntry(withScale(e, scales), 'assets/characters'));
  if (!defaults.length) throw new Error('characters.json ausente ou vazio');
  const locals = (locData.characters ?? []).map((e) => resolveEntry(withScale(e, scales), 'assets/characters-local'));
  overrides = { ...(defData.overrides ?? {}), ...(locData.overrides ?? {}) };
  vipSet = new Set(locData.vip ?? []);

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
  cache.clear();
  for (const e of roster) cache.set(e.id, urlsFor(e).map((u) => map[u]));
}

// Pré-carrega todas as texturas (chamar 1x antes de criar avatares).
export async function loadCharacters() { await buildAndLoad(false); }
// Recarrega ao vivo (evento WS `sprites`/`users`): reflete escala, ocultar, upload, override, VIP.
export async function reloadCharacters() { await buildAndLoad(true); }

export function isVip(username) { return vipSet.has(username); }
export function vipUsers() { return [...vipSet]; }
export function rosterIds() { return roster.map((e) => e.id); }
export function entryScale(id) { return roster.find((e) => e.id === id)?.scale ?? DEFAULTS.scale; }

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
  sprite.animationSpeed = ANIM_SPEED;
  sprite.play();
  sprite.spriteId = id;

  const facing = entry.facing;
  let abs = entry.scale;   // escala efetiva atual (px), atualizada por applyScale
  sprite._dir = 1;

  // Espelha pra olhar na direção do movimento (+1 direita, -1 esquerda).
  // Arte 'front' não vira; 'left'/'right' viram conforme a convenção.
  sprite.faceTo = (direction) => {
    sprite._dir = direction;
    if (facing === 'front') { sprite.scale.set(abs); return; }
    const facesLeft = facing === 'left';
    sprite.scale.x = abs * ((direction === -1) === facesLeft ? 1 : -1);
    sprite.scale.y = abs;
  };
  // Recalcula a escala efetiva (entry × global × uiScale) e reaplica o facing.
  // Lê a escala por sprite do roster VIVO — reflete edição ao vivo após reload.
  sprite.applyScale = (globalScale, ui) => {
    abs = effectiveScale(entryScale(sprite.spriteId), globalScale, ui);
    sprite.faceTo(sprite._dir);
  };
  sprite.faceTo(1); // escala inicial
  return sprite;
}
