import { test, expect } from 'vitest';
import { gerarEventoAleatorio, TIPOS_SIMULAVEIS } from '../src/server/simulator.js';

test('gera evento com formato normalizado válido', () => {
  for (let i = 0; i < 50; i++) {
    const e = gerarEventoAleatorio(() => 0.5);
    expect(TIPOS_SIMULAVEIS).toContain(e.tipo);
    expect(typeof e.usuario).toBe('string');
    expect(e.usuario.length).toBeGreaterThan(0);
    if (e.tipo === 'presente') expect(typeof e.valorMoedas).toBe('number');
  }
});

test('evento de presente traz valorMoedas numérico', () => {
  const e = gerarEventoAleatorio(() => 0.7); // índice 4 -> 'presente'
  expect(e.tipo).toBe('presente');
  expect(typeof e.valorMoedas).toBe('number');
  expect(e.valorMoedas).toBeGreaterThan(0);
});

test('evento de curtida traz quantidade', () => {
  const e = gerarEventoAleatorio(() => 0.4); // índice 2 -> 'curtida'
  expect(e.tipo).toBe('curtida');
  expect(e.quantidade).toBeGreaterThanOrEqual(1);
});
