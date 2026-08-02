import { test, expect } from 'vitest';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listTerrains, saveTerrain, setActiveTerrain, deleteTerrain, setTerrainOffset, setTerrainScale } from '../src/server/terrains.js';

const overlayTmp = () => mkdtempSync(join(tmpdir(), 'ov-'));
const IMG = 'data:image/png;base64,iVBORw0KGgo=';

test('vazio: nenhum ativo, lista vazia', () => {
  expect(listTerrains({ overlayDir: overlayTmp() })).toEqual({ active: null, items: [] });
});

test('saveTerrain grava arquivo e vira ativo', () => {
  const dir = overlayTmp();
  const { file } = saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  expect(file).toBe('grama.png');
  expect(existsSync(join(dir, 'assets/terrain-local/grama.png'))).toBe(true);
  const list = listTerrains({ overlayDir: dir });
  expect(list.active).toBe('grama.png');
  expect(list.items).toContainEqual({ file: 'grama.png', offset: 0, scale: 1 });
});

test('saveTerrain rejeita nome inválido', () => {
  expect(() => saveTerrain({ name: '../x', image: IMG }, { overlayDir: overlayTmp() })).toThrow();
});

test('setActiveTerrain null = nenhum', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setActiveTerrain(null, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).active).toBe(null);
});

test('deleteTerrain apaga e zera ativo se era o ativo', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  deleteTerrain('grama.png', { overlayDir: dir });
  expect(existsSync(join(dir, 'assets/terrain-local/grama.png'))).toBe(false);
  expect(listTerrains({ overlayDir: dir }).active).toBe(null);
});

test('setTerrainOffset grava, atualiza e clampa/arredonda', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setTerrainOffset('grama.png', -30.7, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: -31, scale: 1 });
  setTerrainOffset('grama.png', 99999, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 400, scale: 1 });
});

test('setTerrainOffset preserva o ativo', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setTerrainOffset('grama.png', 10, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).active).toBe('grama.png');
});

test('deleteTerrain remove o offset do arquivo', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setTerrainOffset('grama.png', 20, { overlayDir: dir });
  deleteTerrain('grama.png', { overlayDir: dir });
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir }); // recria com o mesmo nome
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 0, scale: 1 });
});

test('setTerrainScale grava, atualiza e clampa (0.2–4)', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setTerrainScale('grama.png', 2.5, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 0, scale: 2.5 });
  setTerrainScale('grama.png', 99, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 0, scale: 4 });
  setTerrainScale('grama.png', 0, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 0, scale: 0.2 });
});

test('setTerrainScale preserva offset; deleteTerrain remove a escala', () => {
  const dir = overlayTmp();
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir });
  setTerrainOffset('grama.png', 30, { overlayDir: dir });
  setTerrainScale('grama.png', 3, { overlayDir: dir });
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 30, scale: 3 });
  deleteTerrain('grama.png', { overlayDir: dir });
  saveTerrain({ name: 'grama', image: IMG }, { overlayDir: dir }); // recria
  expect(listTerrains({ overlayDir: dir }).items).toContainEqual({ file: 'grama.png', offset: 0, scale: 1 });
});
