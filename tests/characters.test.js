import { test, expect } from 'vitest';
import { personagemDoUsuario, PERSONAGENS } from '../src/overlay/characters.js';

test('personagem é determinístico por usuário', () => {
  expect(personagemDoUsuario('fulano')).toBe(personagemDoUsuario('fulano'));
});
test('sempre retorna um personagem válido do roster', () => {
  for (const u of ['a','bruno','carla123','xyz','zzz']) {
    expect(PERSONAGENS).toContain(personagemDoUsuario(u));
  }
});
