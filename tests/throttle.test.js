import { test, expect } from 'vitest';
import { createThrottle } from '../src/overlay/throttle.js';

test('permite o primeiro evento e bloqueia repetição dentro da janela', () => {
  let agora = 1000;
  const th = createThrottle(500, () => agora);
  expect(th.allow('fulano')).toBe(true);
  agora = 1100;
  expect(th.allow('fulano')).toBe(false);
  agora = 1600;
  expect(th.allow('fulano')).toBe(true);
});

test('usuários diferentes não interferem', () => {
  let agora = 0;
  const th = createThrottle(500, () => agora);
  expect(th.allow('a')).toBe(true);
  expect(th.allow('b')).toBe(true);
});

test('exatamente na janela é permitido (sliding window)', () => {
  let agora = 1000;
  const th = createThrottle(500, () => agora);
  expect(th.allow('x')).toBe(true);
  agora = 1500; // t - anterior === 500 === janela -> permitido
  expect(th.allow('x')).toBe(true);
});
