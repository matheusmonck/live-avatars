import { test, expect } from 'vitest';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateConfig, DEFAULT_CONFIG, saveConfig, toRawConfig } from '../src/server/config.js';

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

test('usuário vazio é permitido (modo idle) e vira string vazia', () => {
  expect(validateConfig({ usuarioTikTok: '' }).username).toBe('');
});

test('força limites numéricos sãos', () => {
  const cfg = validateConfig({ usuarioTikTok: 'x', limiteAvatares: 0, volumeEfeitos: 5 });
  expect(cfg.avatarLimit).toBeGreaterThanOrEqual(1);
  expect(cfg.effectsVolume).toBeLessThanOrEqual(1);
});

test('toRawConfig mapeia campos EN de volta para chaves PT', () => {
  expect(toRawConfig({ username: 'ana', avatarLimit: 20, inactivitySeconds: 100, effectsVolume: 0.5, port: 9000 }))
    .toEqual({ usuarioTikTok: 'ana', limiteAvatares: 20, inatividadeSegundos: 100, volumeEfeitos: 0.5, porta: 9000 });
});

test('saveConfig grava JSON com chaves PT e devolve config EN', () => {
  const dir = mkdtempSync(join(tmpdir(), 'la-'));
  const path = join(dir, 'config.json');
  writeFileSync(path, JSON.stringify({ usuarioTikTok: 'old', limiteAvatares: 18, inatividadeSegundos: 150, volumeEfeitos: 0.6, porta: 8737 }));
  const cfg = saveConfig({ username: 'nova', avatarLimit: 30, inactivitySeconds: 90, effectsVolume: 0.4, port: 8000 }, path);
  expect(cfg.username).toBe('nova');
  const gravado = JSON.parse(readFileSync(path, 'utf8'));
  expect(gravado.usuarioTikTok).toBe('nova');
  expect(gravado.limiteAvatares).toBe(30);
});

test('saveConfig grava valores SANEADOS, não os crus fora de faixa', () => {
  const dir = mkdtempSync(join(tmpdir(), 'la-'));
  const path = join(dir, 'config.json');
  saveConfig({ username: '@ana', avatarLimit: 999, inactivitySeconds: 150, effectsVolume: 0.6, port: 99 }, path);
  const gravado = JSON.parse(readFileSync(path, 'utf8'));
  expect(gravado.porta).toBe(1024);        // clampado (min 1024), não 99
  expect(gravado.limiteAvatares).toBe(60);  // clampado (max 60), não 999
  expect(gravado.usuarioTikTok).toBe('ana'); // @ removido
});
