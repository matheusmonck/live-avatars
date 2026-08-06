import { test, expect } from 'vitest';
import { pickId, resolveEntry, visibleRoster } from '../src/overlay/characters.js';

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
  expect(resolveEntry({ id: 'custom-sprite', frames: 10, facing: 'left' }, 'assets/characters-local')).toEqual({
    id: 'custom-sprite', frames: 10, scale: 2, facing: 'left', base: 'assets/characters-local',
  });
});

test('pickId respeita override quando o alvo está no roster', () => {
  expect(pickId('dave', ['hero', 'ninja', 'cap'], { dave: 'ninja' })).toBe('ninja');
});
test('pickId ignora override quando o alvo não está no roster (cai no hash)', () => {
  const ids = ['hero', 'cap', 'dog'];
  expect(pickId('dave', ids, { dave: 'ninja' })).toBe(pickId('dave', ids));
  expect(ids).toContain(pickId('dave', ids, { dave: 'ninja' }));
});
test('sprite reservado por override é exclusivo: outros usuários nunca o recebem', () => {
  const ids = ['frog', 'girl', 'hood', 'kid', 'miner', 'oldwoman', 'sage', 'woman', 'ninja'];
  const overrides = { dave: 'ninja' };
  // ana.costa e dan caíam no sprite reservado pelo hash antes da correção (bug: "mais de um reservado").
  for (const u of ['ana.costa', 'dan', 'joao.p', 'bruninho', 'carla_m', 'fefa', 'gustavo_tk', 'isa']) {
    expect(pickId(u, ids, overrides)).not.toBe('ninja');
  }
  // ...mas o dono do override continua recebendo o sprite reservado.
  expect(pickId('dave', ids, overrides)).toBe('ninja');
});
test('visibleRoster remove ocultos', () => {
  const entries = [{ id: 'hero' }, { id: 'dog' }, { id: 'cap' }];
  expect(visibleRoster(entries, ['dog']).map((e) => e.id)).toEqual(['hero', 'cap']);
});
test('visibleRoster nunca esvazia (fallback)', () => {
  const entries = [{ id: 'hero' }, { id: 'dog' }];
  expect(visibleRoster(entries, ['hero', 'dog'])).toEqual(entries);
});
