import { test, expect } from 'vitest';
import { validateConfig, DEFAULT_CONFIG } from '../src/server/config.js';

test('preenche valores padrão quando faltam campos', () => {
  const cfg = validateConfig({ usuarioTikTok: 'fulano' });
  expect(cfg.username).toBe('fulano');
  expect(cfg.avatarLimit).toBe(DEFAULT_CONFIG.avatarLimit);
  expect(cfg.inactivitySeconds).toBe(DEFAULT_CONFIG.inactivitySeconds);
  expect(cfg.effectsVolume).toBe(DEFAULT_CONFIG.effectsVolume);
  expect(cfg.port).toBe(DEFAULT_CONFIG.port);
});

test('remove @ do usuário', () => {
  expect(validateConfig({ usuarioTikTok: '@fulano' }).username).toBe('fulano');
});

test('lança erro se usuário estiver vazio', () => {
  expect(() => validateConfig({ usuarioTikTok: '' })).toThrow(/usuarioTikTok/);
});

test('força limites numéricos sãos', () => {
  const cfg = validateConfig({ usuarioTikTok: 'x', limiteAvatares: 0, volumeEfeitos: 5 });
  expect(cfg.avatarLimit).toBeGreaterThanOrEqual(1);
  expect(cfg.effectsVolume).toBeLessThanOrEqual(1);
});
