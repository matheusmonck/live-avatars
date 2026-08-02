import { test, expect } from 'vitest';
import { uiScale, effectiveScale, REFERENCE_HEIGHT } from '../src/overlay/scale.js';

test('REFERENCE_HEIGHT é 1920 (vertical 9:16)', () => {
  expect(REFERENCE_HEIGHT).toBe(1920);
});

test('uiScale = altura / referência', () => {
  expect(uiScale(1920)).toBe(1);            // live vertical 1080×1920
  expect(uiScale(1080)).toBeCloseTo(0.5625); // horizontal 1920×1080
  expect(uiScale(960)).toBe(0.5);            // simulador menor, mesma proporção
});

test('uiScale protege contra valores inválidos (fallback 1)', () => {
  expect(uiScale(NaN)).toBe(1);
  expect(uiScale(100, 0)).toBe(1);
});

test('effectiveScale = entry × global × ui', () => {
  expect(effectiveScale(2, 2, 1)).toBe(4);   // sprite padrão na live (~64px)
  expect(effectiveScale(2, 2, 0.5)).toBe(2); // metade da resolução → metade do tamanho
  expect(effectiveScale(3, 1, 1)).toBe(3);
});
