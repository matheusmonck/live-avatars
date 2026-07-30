import { test, expect } from 'vitest';
import { pickId, resolveEntry } from '../src/overlay/characters.js';

const IDS = ['hero', 'cap', 'dog', 'frog', 'girl'];

test('pickId é determinístico por usuário', () => {
  expect(pickId('fulano', IDS)).toBe(pickId('fulano', IDS));
});

test('pickId sempre retorna um id do roster', () => {
  for (const u of ['ana', 'bruno', 'carla', 'xyz']) {
    expect(IDS).toContain(pickId(u, IDS));
  }
});

test('resolveEntry aplica defaults', () => {
  expect(resolveEntry({ id: 'hero' }, 'assets/characters')).toEqual({
    id: 'hero', frames: 2, scale: 2, facing: 'front', base: 'assets/characters',
  });
});

test('resolveEntry respeita overrides', () => {
  expect(resolveEntry({ id: 'link-minish-cap', frames: 10, facing: 'left' }, 'assets/characters-local')).toEqual({
    id: 'link-minish-cap', frames: 10, scale: 2, facing: 'left', base: 'assets/characters-local',
  });
});
