import { test, expect } from 'vitest';
import { validarConfig, CONFIG_PADRAO } from '../src/server/config.js';

test('preenche valores padrão quando faltam campos', () => {
  const cfg = validarConfig({ usuarioTikTok: 'fulano' });
  expect(cfg.usuarioTikTok).toBe('fulano');
  expect(cfg.limiteAvatares).toBe(CONFIG_PADRAO.limiteAvatares);
  expect(cfg.inatividadeSegundos).toBe(CONFIG_PADRAO.inatividadeSegundos);
  expect(cfg.volumeEfeitos).toBe(CONFIG_PADRAO.volumeEfeitos);
  expect(cfg.porta).toBe(CONFIG_PADRAO.porta);
});

test('remove @ do usuário', () => {
  expect(validarConfig({ usuarioTikTok: '@fulano' }).usuarioTikTok).toBe('fulano');
});

test('lança erro se usuário estiver vazio', () => {
  expect(() => validarConfig({ usuarioTikTok: '' })).toThrow(/usuarioTikTok/);
});

test('força limites numéricos sãos', () => {
  const cfg = validarConfig({ usuarioTikTok: 'x', limiteAvatares: 0, volumeEfeitos: 5 });
  expect(cfg.limiteAvatares).toBeGreaterThanOrEqual(1);
  expect(cfg.volumeEfeitos).toBeLessThanOrEqual(1);
});
