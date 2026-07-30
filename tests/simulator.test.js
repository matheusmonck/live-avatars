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
