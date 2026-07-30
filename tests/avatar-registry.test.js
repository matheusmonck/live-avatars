import { test, expect } from 'vitest';
import { CriarRegistry, estiloDoUsuario } from '../src/overlay/avatar-registry.js';

test('estilo é determinístico por usuário (blob ou pixel)', () => {
  expect(estiloDoUsuario('fulano')).toBe(estiloDoUsuario('fulano'));
  expect(['blob', 'pixel']).toContain(estiloDoUsuario('fulano'));
});

test('registrar cria avatar novo com estilo e @', () => {
  const r = CriarRegistry({ limite: 5, inatividadeMs: 1000 });
  const res = r.registrar('fulano', 1000);
  expect(res.novo).toBe(true);
  expect(res.avatar.usuario).toBe('fulano');
  expect(['blob', 'pixel']).toContain(res.avatar.estilo);
  expect(res.removidos).toEqual([]);
});

test('registrar de novo não cria, só atualiza atividade', () => {
  const r = CriarRegistry({ limite: 5, inatividadeMs: 1000 });
  r.registrar('fulano', 1000);
  const res = r.registrar('fulano', 1500);
  expect(res.novo).toBe(false);
});

test('estoura o limite removendo o menos ativo', () => {
  const r = CriarRegistry({ limite: 2, inatividadeMs: 10000 });
  r.registrar('a', 100);
  r.registrar('b', 200);
  const res = r.registrar('c', 300); // estoura -> remove 'a'
  expect(res.novo).toBe(true);
  expect(res.removidos).toEqual(['a']);
  expect(r.tem('a')).toBe(false);
  expect(r.tem('c')).toBe(true);
});

test('expirarInativos remove quem passou do tempo', () => {
  const r = CriarRegistry({ limite: 5, inatividadeMs: 1000 });
  r.registrar('a', 1000);
  r.registrar('b', 1500);
  const removidos = r.expirarInativos(2200); // 'a' inativo há 1200ms
  expect(removidos).toEqual(['a']);
  expect(r.tem('b')).toBe(true);
});
