import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const CONFIG_PADRAO = {
  usuarioTikTok: '',
  limiteAvatares: 18,
  inatividadeSegundos: 150,
  volumeEfeitos: 0.6,
  porta: 8737,
};

function limitar(valor, min, max, padrao) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

export function validarConfig(bruto) {
  const usuario = String(bruto?.usuarioTikTok ?? '').trim().replace(/^@/, '');
  if (!usuario) throw new Error('config: usuarioTikTok é obrigatório');
  return {
    usuarioTikTok: usuario,
    limiteAvatares: Math.round(limitar(bruto.limiteAvatares, 1, 60, CONFIG_PADRAO.limiteAvatares)),
    inatividadeSegundos: Math.round(limitar(bruto.inatividadeSegundos, 10, 3600, CONFIG_PADRAO.inatividadeSegundos)),
    volumeEfeitos: limitar(bruto.volumeEfeitos, 0, 1, CONFIG_PADRAO.volumeEfeitos),
    porta: Math.round(limitar(bruto.porta, 1024, 65535, CONFIG_PADRAO.porta)),
  };
}

export function carregarConfig() {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const caminho = resolve(aqui, '../../config/config.json');
  const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
  return validarConfig(bruto);
}
