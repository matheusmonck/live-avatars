import { test, expect } from 'vitest';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateConfig, DEFAULT_CONFIG, saveConfig, toRawConfig, configFrame } from '../src/server/config.js';

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
  expect(toRawConfig({ username: 'ana', avatarLimit: 20, inactivitySeconds: 100, effectsVolume: 0.5, stageMode: false, port: 9000 }))
    .toEqual({ usuarioTikTok: 'ana', limiteAvatares: 20, inatividadeSegundos: 100, volumeEfeitos: 0.5, modoPalco: false, porta: 9000 });
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

test('stageMode default true quando falta; aceita false', () => {
  expect(validateConfig({ usuarioTikTok: 'x' }).stageMode).toBe(true);
  expect(validateConfig({ usuarioTikTok: 'x', modoPalco: false }).stageMode).toBe(false);
  expect(validateConfig({ usuarioTikTok: 'x', modoPalco: 'false' }).stageMode).toBe(false);
  expect(validateConfig({ usuarioTikTok: 'x', modoPalco: 'true' }).stageMode).toBe(true);
});

test('saveConfig persiste modoPalco: false no JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'la-'));
  const path = join(dir, 'config.json');
  saveConfig({ username: 'x', avatarLimit: 18, inactivitySeconds: 150, effectsVolume: 0.6, stageMode: false, port: 8737 }, path);
  const gravado = JSON.parse(readFileSync(path, 'utf8'));
  expect(gravado.modoPalco).toBe(false);
});

test('DEFAULT_CONFIG tem onlyInteractors true e likeThreshold 10', () => {
  expect(DEFAULT_CONFIG.onlyInteractors).toBe(true);
  expect(DEFAULT_CONFIG.likeThreshold).toBe(10);
});

test('validateConfig lê soQuemInterage e coracoesParaAparecer', () => {
  const cfg = validateConfig({ soQuemInterage: false, coracoesParaAparecer: 25 });
  expect(cfg.onlyInteractors).toBe(false);
  expect(cfg.likeThreshold).toBe(25);
});

test('validateConfig clampeia coracoesParaAparecer (max 1000, min 1)', () => {
  expect(validateConfig({ coracoesParaAparecer: 9999 }).likeThreshold).toBe(1000);
  expect(validateConfig({ coracoesParaAparecer: 0 }).likeThreshold).toBe(1);
});

test('validateConfig usa defaults quando campos estão ausentes', () => {
  const cfg = validateConfig({});
  expect(cfg.onlyInteractors).toBe(true);
  expect(cfg.likeThreshold).toBe(10);
});

test('toRawConfig inclui soQuemInterage e coracoesParaAparecer', () => {
  const raw = toRawConfig({ ...validateConfig({}) });
  expect(raw).toHaveProperty('soQuemInterage');
  expect(raw).toHaveProperty('coracoesParaAparecer');
});

test('avatarScale: default 2, lê escalaAvatares e clampa (0.2–6)', () => {
  expect(validateConfig({}).avatarScale).toBe(2);
  expect(validateConfig({ escalaAvatares: 3.5 }).avatarScale).toBe(3.5);
  expect(validateConfig({ escalaAvatares: 99 }).avatarScale).toBe(6);
  expect(validateConfig({ escalaAvatares: 0 }).avatarScale).toBe(0.2);
});

test('toRawConfig mapeia avatarScale para escalaAvatares', () => {
  expect(toRawConfig({ ...validateConfig({}), avatarScale: 2.5 }).escalaAvatares).toBe(2.5);
});

test('avatarOffsetY: default 0, lê ajusteVerticalAvatares, arredonda e clampa (-400..400)', () => {
  expect(validateConfig({}).avatarOffsetY).toBe(0);
  expect(validateConfig({ ajusteVerticalAvatares: 40 }).avatarOffsetY).toBe(40);
  expect(validateConfig({ ajusteVerticalAvatares: -30 }).avatarOffsetY).toBe(-30);
  expect(validateConfig({ ajusteVerticalAvatares: 12.6 }).avatarOffsetY).toBe(13);
  expect(validateConfig({ ajusteVerticalAvatares: 9999 }).avatarOffsetY).toBe(400);
  expect(validateConfig({ ajusteVerticalAvatares: -9999 }).avatarOffsetY).toBe(-400);
});

test('avatarOffsetY: round-trip PT e presença no configFrame', () => {
  expect(toRawConfig({ ...validateConfig({}), avatarOffsetY: 25 }).ajusteVerticalAvatares).toBe(25);
  expect(configFrame(validateConfig({ ajusteVerticalAvatares: 25 })).avatarOffsetY).toBe(25);
});

test('nameScale/bubbleScale: default 1, leem chaves PT e clampam (0.3–3)', () => {
  const d = validateConfig({});
  expect(d.nameScale).toBe(1);
  expect(d.bubbleScale).toBe(1);
  expect(validateConfig({ escalaNomes: 1.5 }).nameScale).toBe(1.5);
  expect(validateConfig({ escalaNomes: 99 }).nameScale).toBe(3);
  expect(validateConfig({ escalaNomes: 0 }).nameScale).toBe(0.3);
  expect(validateConfig({ escalaBaloes: 2.2 }).bubbleScale).toBe(2.2);
  expect(validateConfig({ escalaBaloes: 99 }).bubbleScale).toBe(3);
});

test('nameScale/bubbleScale: round-trip PT e presença no configFrame', () => {
  const raw = toRawConfig({ ...validateConfig({}), nameScale: 1.2, bubbleScale: 0.8 });
  expect(raw.escalaNomes).toBe(1.2);
  expect(raw.escalaBaloes).toBe(0.8);
  const frame = configFrame(validateConfig({ escalaNomes: 1.2, escalaBaloes: 0.8 }));
  expect(frame.nameScale).toBe(1.2);
  expect(frame.bubbleScale).toBe(0.8);
});

test('balões: defaults (ativo, max 5, lista vazia)', () => {
  const cfg = validateConfig({});
  expect(cfg.bubblesEnabled).toBe(true);
  expect(cfg.bubbleMax).toBe(5);
  expect(cfg.bubbleBadWords).toEqual([]);
});

test('balões: lê chaves PT e clampa/saneia', () => {
  const cfg = validateConfig({ baloesAtivos: false, baloesMax: 99, palavroesBloqueados: [' Merda ', 'PORRA', ''] });
  expect(cfg.bubblesEnabled).toBe(false);
  expect(cfg.bubbleMax).toBe(20); // clamp max 20
  expect(cfg.bubbleBadWords).toEqual(['merda', 'porra']); // trim + lowercase + remove vazios
});

test('balões: palavroesBloqueados não-array vira []', () => {
  expect(validateConfig({ palavroesBloqueados: 'merda' }).bubbleBadWords).toEqual([]);
});

test('toRawConfig mapeia campos de balão de volta pras chaves PT', () => {
  const raw = toRawConfig({ ...validateConfig({}), bubblesEnabled: false, bubbleMax: 3, bubbleBadWords: ['x'] });
  expect(raw.baloesAtivos).toBe(false);
  expect(raw.baloesMax).toBe(3);
  expect(raw.palavroesBloqueados).toEqual(['x']);
});

test('saveConfig preserva chaves do disco que o payload não envia (ex.: lista de palavrões)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'la-'));
  const path = join(dir, 'config.json');
  writeFileSync(path, JSON.stringify({ usuarioTikTok: 'x', palavroesBloqueados: ['merda'], baloesMax: 3 }));
  // Payload do painel: sem os campos de balão.
  saveConfig({ username: 'x', avatarLimit: 20, inactivitySeconds: 150, effectsVolume: 0.6, stageMode: true, port: 8737 }, path);
  const gravado = JSON.parse(readFileSync(path, 'utf8'));
  expect(gravado.palavroesBloqueados).toEqual(['merda']); // preservado, não resetado pra []
  expect(gravado.baloesMax).toBe(3);
});

test('configFrame carrega os campos de balão pro overlay', () => {
  const frame = configFrame(validateConfig({ baloesMax: 4 }));
  expect(frame.type).toBe('config');
  expect(frame.bubblesEnabled).toBe(true);
  expect(frame.bubbleMax).toBe(4);
  expect(frame.bubbleBadWords).toEqual([]);
});
