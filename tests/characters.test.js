import { test, expect } from 'vitest';
import { characterForUser, CHARACTERS } from '../src/overlay/characters.js';

test('personagem é determinístico por usuário', () => {
  expect(characterForUser('fulano')).toBe(characterForUser('fulano'));
});
test('sempre retorna um personagem válido do roster', () => {
  for (const u of ['a','bruno','carla123','xyz','zzz']) {
    expect(CHARACTERS).toContain(characterForUser(u));
  }
});
