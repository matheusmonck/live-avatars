import { test, expect } from 'vitest';
import { criarThrottle } from '../src/overlay/throttle.js';

test('permite o primeiro evento e bloqueia repetição dentro da janela', () => {
  let agora = 1000;
  const th = criarThrottle(500, () => agora);
  expect(th.permitir('fulano')).toBe(true);
  agora = 1100;
  expect(th.permitir('fulano')).toBe(false);
  agora = 1600;
  expect(th.permitir('fulano')).toBe(true);
});

test('usuários diferentes não interferem', () => {
  let agora = 0;
  const th = criarThrottle(500, () => agora);
  expect(th.permitir('a')).toBe(true);
  expect(th.permitir('b')).toBe(true);
});

test('exatamente na janela é permitido (sliding window)', () => {
  let agora = 1000;
  const th = criarThrottle(500, () => agora);
  expect(th.permitir('x')).toBe(true);
  agora = 1500; // t - anterior === 500 === janela -> permitido
  expect(th.permitir('x')).toBe(true);
});
