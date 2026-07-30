import { test, expect } from 'vitest';
import { randomEvent, SIMULATABLE_TYPES } from '../src/server/simulator.js';

test('gera evento com formato normalizado válido', () => {
  for (let i = 0; i < 50; i++) {
    const e = randomEvent(() => 0.5);
    expect(SIMULATABLE_TYPES).toContain(e.type);
    expect(typeof e.username).toBe('string');
    expect(e.username.length).toBeGreaterThan(0);
    if (e.type === 'gift') expect(typeof e.coins).toBe('number');
  }
});

test('evento de presente traz coins numérico', () => {
  const e = randomEvent(() => 0.95); // cai na faixa ponderada de 'gift'
  expect(e.type).toBe('gift');
  expect(typeof e.coins).toBe('number');
  expect(e.coins).toBeGreaterThan(0);
});

test('evento de curtida traz count', () => {
  const e = randomEvent(() => 0.4); // faixa ponderada de 'like'
  expect(e.type).toBe('like');
  expect(e.count).toBeGreaterThanOrEqual(1);
});
