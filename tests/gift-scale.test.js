import { test, expect } from 'vitest';
import { escalaPresente } from '../src/overlay/gift-scale.js';

test('presente barato = efeito pequeno', () => {
  const e = escalaPresente(1);
  expect(e.nivel).toBe('pequeno');
  expect(e.escala).toBeCloseTo(1.4);
  expect(e.confetes).toBeLessThanOrEqual(20);
});

test('presente médio', () => {
  expect(escalaPresente(50).nivel).toBe('medio');
});

test('presente caro = explosão', () => {
  const e = escalaPresente(500);
  expect(e.nivel).toBe('grande');
  expect(e.confetes).toBeGreaterThanOrEqual(120);
  expect(e.duracaoMs).toBeGreaterThanOrEqual(4000);
});

test('valor inválido cai no pequeno', () => {
  expect(escalaPresente(undefined).nivel).toBe('pequeno');
});
