import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_CONFIG = {
  username: "",
  avatarLimit: 18,
  inactivitySeconds: 150,
  effectsVolume: 0.6,
  stageMode: true,
  port: 8737,
  onlyInteractors: true,
  likeThreshold: 10,
  avatarScale: 2,
  avatarOffsetY: 0,
  nameScale: 1,
  bubbleScale: 1,
  bubblesEnabled: true,
  bubbleMax: 5,
  bubbleBadWords: [],
};

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(value, fallback) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

// Lista de strings saneada: aparadas, minúsculas, sem vazios. Não-array vira [].
function strList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? "").trim().toLowerCase()).filter(Boolean);
}

// Lê o config.json (chaves em PT — contrato do usuário) e devolve objeto EN.
// Username vazio é permitido: conexão TikTok só é exigida pelo gerenciador de conexão.
export function validateConfig(raw) {
  const username = String(raw?.usuarioTikTok ?? "").trim().replace(/^@/, "");
  return {
    username,
    avatarLimit: Math.round(clamp(raw.limiteAvatares, 1, 60, DEFAULT_CONFIG.avatarLimit)),
    inactivitySeconds: Math.round(clamp(raw.inatividadeSegundos, 10, 3600, DEFAULT_CONFIG.inactivitySeconds)),
    effectsVolume: clamp(raw.volumeEfeitos, 0, 1, DEFAULT_CONFIG.effectsVolume),
    stageMode: bool(raw.modoPalco, DEFAULT_CONFIG.stageMode),
    port: Math.round(clamp(raw.porta, 1024, 65535, DEFAULT_CONFIG.port)),
    onlyInteractors: bool(raw.soQuemInterage, DEFAULT_CONFIG.onlyInteractors),
    likeThreshold: Math.round(clamp(raw.coracoesParaAparecer, 1, 1000, DEFAULT_CONFIG.likeThreshold)),
    avatarScale: clamp(raw.escalaAvatares, 0.2, 6, DEFAULT_CONFIG.avatarScale),
    // Deslocamento vertical dos avatares (px de referência 1920). Positivo = sobe.
    avatarOffsetY: Math.round(clamp(raw.ajusteVerticalAvatares, -400, 400, DEFAULT_CONFIG.avatarOffsetY)),
    // Multiplicadores de tamanho do nome (@) e do texto do balão (aplicam ao vivo).
    nameScale: clamp(raw.escalaNomes, 0.3, 3, DEFAULT_CONFIG.nameScale),
    bubbleScale: clamp(raw.escalaBaloes, 0.3, 3, DEFAULT_CONFIG.bubbleScale),
    bubblesEnabled: bool(raw.baloesAtivos, DEFAULT_CONFIG.bubblesEnabled),
    bubbleMax: Math.round(clamp(raw.baloesMax, 0, 20, DEFAULT_CONFIG.bubbleMax)),
    bubbleBadWords: strList(raw.palavroesBloqueados),
  };
}

// Mapeia campos EN de volta para as chaves PT do contrato do usuário.
export function toRawConfig(en) {
  return {
    usuarioTikTok: en.username,
    limiteAvatares: en.avatarLimit,
    inatividadeSegundos: en.inactivitySeconds,
    volumeEfeitos: en.effectsVolume,
    modoPalco: en.stageMode,
    porta: en.port,
    soQuemInterage: en.onlyInteractors,
    coracoesParaAparecer: en.likeThreshold,
    escalaAvatares: en.avatarScale,
    ajusteVerticalAvatares: en.avatarOffsetY,
    escalaNomes: en.nameScale,
    escalaBaloes: en.bubbleScale,
    baloesAtivos: en.bubblesEnabled,
    baloesMax: en.bubbleMax,
    palavroesBloqueados: en.bubbleBadWords,
  };
}

// Frame 'config' enviado ao overlay via WS. Centralizado aqui pra não divergir
// entre o envio inicial (index.js) e o broadcast ao salvar (admin-api.js).
export function configFrame(cfg) {
  return {
    type: "config",
    avatarLimit: cfg.avatarLimit,
    inactivitySeconds: cfg.inactivitySeconds,
    stageMode: cfg.stageMode,
    onlyInteractors: cfg.onlyInteractors,
    likeThreshold: cfg.likeThreshold,
    effectsVolume: cfg.effectsVolume,
    avatarScale: cfg.avatarScale,
    avatarOffsetY: cfg.avatarOffsetY,
    nameScale: cfg.nameScale,
    bubbleScale: cfg.bubbleScale,
    bubblesEnabled: cfg.bubblesEnabled,
    bubbleMax: cfg.bubbleMax,
    bubbleBadWords: cfg.bubbleBadWords,
  };
}

function caminhoConfig() {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../config/config.json");
}

// Grava a config (chaves PT, valores já saneados) e devolve o objeto EN validado.
// Faz merge com o que já está no disco: só sobrescreve as chaves que vieram
// definidas no payload, preservando o resto (ex.: campos que o painel /admin não
// reenvia, como a lista de palavrões dos balões).
export function saveConfig(en, configPath = caminhoConfig()) {
  let existing = {};
  try { existing = JSON.parse(readFileSync(configPath, "utf8")); } catch {}
  const merged = { ...existing };
  for (const [k, v] of Object.entries(toRawConfig(en))) if (v !== undefined) merged[k] = v;
  const cfg = validateConfig(merged);
  writeFileSync(configPath, JSON.stringify(toRawConfig(cfg), null, 2) + "\n", "utf8");
  return cfg;
}

// Grava a chave de API no arquivo local (não versionado).
export function saveKey(signApiKey, keyPath) {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = keyPath ?? resolve(here, "../../config/config.local.json");
  writeFileSync(path, JSON.stringify({ signApiKey: String(signApiKey ?? "").trim() }, null, 2) + "\n", "utf8");
}

function readApiKey(here) {
  const fromEnv = String(process.env.SIGN_API_KEY ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const localPath = resolve(here, "../../config/config.local.json");
    const local = JSON.parse(readFileSync(localPath, "utf8"));
    return String(local?.signApiKey ?? "").trim() || undefined;
  } catch {
    return undefined;
  }
}

export function loadConfig() {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = JSON.parse(readFileSync(caminhoConfig(), "utf8"));
  const cfg = validateConfig(raw);
  cfg.signApiKey = readApiKey(here);
  return cfg;
}
