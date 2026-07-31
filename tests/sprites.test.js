import { test, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSprites, saveSprite, deleteSprite, setSpriteHidden } from '../src/server/sprites.js';

function overlayTmp() {
  const dir = mkdtempSync(join(tmpdir(), 'ov-'));
  writeFileSync(join(dir, 'characters.json'), JSON.stringify({ characters: [{ id: 'hero' }] }));
  return dir;
}
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

test('listSprites mescla default + local com source', () => {
  const dir = overlayTmp();
  writeFileSync(join(dir, 'characters.local.json'), JSON.stringify({ characters: [{ id: 'robo', frames: 4 }] }));
  const list = listSprites({ overlayDir: dir });
  expect(list).toContainEqual({ id: 'hero', frames: 2, scale: 2, facing: 'front', source: 'default', hidden: false });
  expect(list).toContainEqual({ id: 'robo', frames: 4, scale: 2, facing: 'front', source: 'local', hidden: false });
});

test('saveSprite grava PNGs, conta frames e upserta o json', () => {
  const dir = overlayTmp();
  saveSprite({ id: 'novo', facing: 'left', frames: [PNG, PNG, PNG] }, { overlayDir: dir });
  expect(existsSync(join(dir, 'assets/characters-local/novo/1.png'))).toBe(true);
  expect(existsSync(join(dir, 'assets/characters-local/novo/3.png'))).toBe(true);
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.characters).toContainEqual({ id: 'novo', frames: 3, facing: 'left' });
});

test('saveSprite rejeita id inválido e frames vazio', () => {
  const dir = overlayTmp();
  expect(() => saveSprite({ id: '../x', frames: [PNG] }, { overlayDir: dir })).toThrow();
  expect(() => saveSprite({ id: 'ok', frames: [] }, { overlayDir: dir })).toThrow();
});

test('setSpriteHidden oculta e restaura', () => {
  const dir = overlayTmp();
  setSpriteHidden('hero', true, { overlayDir: dir });
  expect(listSprites({ overlayDir: dir }).find((s) => s.id === 'hero').hidden).toBe(true);
  setSpriteHidden('hero', false, { overlayDir: dir });
  expect(listSprites({ overlayDir: dir }).find((s) => s.id === 'hero').hidden).toBe(false);
});
test('setSpriteHidden preserva os characters locais', () => {
  const dir = overlayTmp();
  saveSprite({ id: 'novo', frames: [PNG] }, { overlayDir: dir });
  setSpriteHidden('hero', true, { overlayDir: dir });
  const local = JSON.parse(readFileSync(join(dir, 'characters.local.json'), 'utf8'));
  expect(local.characters.some((c) => c.id === 'novo')).toBe(true);
  expect(local.hidden).toContain('hero');
});

test('deleteSprite remove só local; recusa padrão', () => {
  const dir = overlayTmp();
  saveSprite({ id: 'novo', frames: [PNG] }, { overlayDir: dir });
  deleteSprite('novo', { overlayDir: dir });
  expect(existsSync(join(dir, 'assets/characters-local/novo'))).toBe(false);
  expect(() => deleteSprite('hero', { overlayDir: dir })).toThrow();
});
