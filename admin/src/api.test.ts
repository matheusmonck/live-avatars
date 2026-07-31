import { test, expect, vi, beforeEach } from 'vitest';
import { getConfig, putKey, saveSprite, putConfig, setTerrainOffset, setSpriteHidden } from './api';

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

test('setTerrainOffset manda PUT com file e offset', async () => {
  await setTerrainOffset('grama.png', -30);
  expect(fetch).toHaveBeenCalledWith('/admin/api/terrain/offset', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ file: 'grama.png', offset: -30 }),
  }));
});

test('setSpriteHidden manda PUT com id e hidden', async () => {
  await setSpriteHidden('hero', true);
  expect(fetch).toHaveBeenCalledWith('/admin/api/sprites/hidden', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ id: 'hero', hidden: true }),
  }));
});
