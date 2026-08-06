import { test, expect, vi, beforeEach } from 'vitest';
import { getConfig, putKey, saveSprite, putConfig, setTerrainOffset, setTerrainScale, setSpriteScale, setSpriteHidden } from './api';

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

test('putConfig manda PUT com stageMode e avatarScale no corpo', async () => {
  await putConfig({ username: 'x', avatarLimit: 18, inactivitySeconds: 150, effectsVolume: 0.6, stageMode: false, onlyInteractors: false, likeThreshold: 1, avatarScale: 3, avatarOffsetY: 0, nameScale: 1, bubbleScale: 1, port: 8737 });
  expect(fetch).toHaveBeenCalledWith('/admin/api/config', expect.objectContaining({
    method: 'PUT',
    body: expect.stringContaining('"stageMode":false'),
  }));
  expect(fetch).toHaveBeenCalledWith('/admin/api/config', expect.objectContaining({
    body: expect.stringContaining('"avatarScale":3'),
  }));
});

test('setSpriteScale manda PUT com id e scale', async () => {
  await setSpriteScale('hero', 4);
  expect(fetch).toHaveBeenCalledWith('/admin/api/sprites/scale', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ id: 'hero', scale: 4 }),
  }));
});

test('setTerrainScale manda PUT com file e scale', async () => {
  await setTerrainScale('grama.png', 2.5);
  expect(fetch).toHaveBeenCalledWith('/admin/api/terrain/scale', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ file: 'grama.png', scale: 2.5 }),
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
