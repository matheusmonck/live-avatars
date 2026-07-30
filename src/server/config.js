import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_CONFIG = {
  username: "",
  avatarLimit: 18,
  inactivitySeconds: 150,
  effectsVolume: 0.6,
  port: 8737,
};

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
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
    port: Math.round(clamp(raw.porta, 1024, 65535, DEFAULT_CONFIG.port)),
  };
}

// Mapeia campos EN de volta para as chaves PT do contrato do usuário.
export function toRawConfig(en) {
  return {
    usuarioTikTok: en.username,
    limiteAvatares: en.avatarLimit,
    inatividadeSegundos: en.inactivitySeconds,
    volumeEfeitos: en.effectsVolume,
    porta: en.port,
  };
}

function caminhoConfig() {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../config/config.json");
}

// Grava a config (chaves PT, valores já saneados) e devolve o objeto EN validado.
export function saveConfig(en, configPath = caminhoConfig()) {
  const cfg = validateConfig(toRawConfig(en));
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
