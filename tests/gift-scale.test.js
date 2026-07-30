import { test, expect } from 'vitest';
import { giftScale } from '../src/overlay/gift-scale.js';

test('presente barato = efeito pequeno', () => {
  const e = giftScale(1);
  expect(e.level).toBe('small');
  expect(e.scale).toBeCloseTo(1.4);
  expect(e.confetti).toBeLessThanOrEqual(20);
});
test('presente médio', () => { expect(giftScale(50).level).toBe('medium'); });
test('presente caro = explosão', () => {
  const e = giftScale(500);
  expect(e.level).toBe('large');
  expect(e.confetti).toBeGreaterThanOrEqual(120);
  expect(e.durationMs).toBeGreaterThanOrEqual(4000);
});
test('valor inválido cai no pequeno', () => { expect(giftScale(undefined).level).toBe('small'); });
test('fronteiras exatas dos níveis', () => {
  expect(giftScale(5).level).toBe('small');
  expect(giftScale(6).level).toBe('medium');
  expect(giftScale(100).level).toBe('medium');
  expect(giftScale(101).level).toBe('large');
});
