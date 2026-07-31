import { test, expect } from 'vitest';
import { easeOutCubic, easeOutBack } from '../src/overlay/reactions.js';

test('easeOutCubic vai de 0 a 1 nas fronteiras', () => {
  expect(easeOutCubic(0)).toBeCloseTo(0);
  expect(easeOutCubic(1)).toBeCloseTo(1);
  expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // desacelera: passa de 0.5 antes da metade
});

test('easeOutBack faz overshoot e volta pra 1', () => {
  expect(easeOutBack(0)).toBeCloseTo(0);
  expect(easeOutBack(1)).toBeCloseTo(1);
  // pico com overshoot em algum ponto antes do fim
  const peak = Math.max(easeOutBack(0.6), easeOutBack(0.7), easeOutBack(0.8));
  expect(peak).toBeGreaterThan(1);
});
