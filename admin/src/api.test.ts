import { test, expect, vi, beforeEach } from 'vitest';
import { getConfig, putKey, saveSprite, putConfig } from './api';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ ok: true }) } as Response)));
});

test('getConfig faz GET em /admin/api/config', async () => {
  await getConfig();
  expect(fetch).toHaveBeenCalledWith('/admin/api/config');
});

test('putKey manda PUT com o corpo da chave', async () => {
  await putKey('minha-chave');
  expect(fetch).toHaveBeenCalledWith('/admin/api/key', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ signApiKey: 'minha-chave' }),
  }));
});

test('saveSprite manda POST em /admin/api/sprites', async () => {
  await saveSprite({ id: 'x', scale: 2, facing: 'front', frames: ['a'] });
  expect(fetch).toHaveBeenCalledWith('/admin/api/sprites', expect.objectContaining({ method: 'POST' }));
});

test('putConfig manda PUT com stageMode no corpo', async () => {
  await putConfig({ username: 'x', avatarLimit: 18, inactivitySeconds: 150, effectsVolume: 0.6, stageMode: false, port: 8737 });
  expect(fetch).toHaveBeenCalledWith('/admin/api/config', expect.objectContaining({
    method: 'PUT',
    body: expect.stringContaining('"stageMode":false'),
  }));
});
