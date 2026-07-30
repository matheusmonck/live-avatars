import { test, expect } from 'vitest';
import { criarRegistry, estiloDoUsuario } from '../src/overlay/avatar-registry.js';

test('estilo é determinístico por usuário (blob ou pixel)', () => {
  expect(estiloDoUsuario('fulano')).toBe(estiloDoUsuario('fulano'));
  expect(['blob', 'pixel']).toContain(estiloDoUsuario('fulano'));
});

test('registrar cria avatar novo com estilo e @', () => {
  const r = criarRegistry({ limite: 5, inatividadeMs: 1000 });
  const res = r.registrar('fulano', 1000);
  expect(res.novo).toBe(true);
  expect(res.avatar.usuario).toBe('fulano');
  expect(['blob', 'pixel']).toContain(res.avatar.estilo);
  expect(res.removidos).toEqual([]);
});

test('registrar de novo não cria, só atualiza atividade', () => {
  const r = criarRegistry({ limite: 5, inatividadeMs: 1000 });
  r.registrar('fulano', 1000);
  const res = r.registrar('fulano', 1500);
  expect(res.novo).toBe(false);
});

test('estoura o limite removendo o menos ativo', () => {
  const r = criarRegistry({ limite: 2, inatividadeMs: 10000 });
  r.registrar('a', 100);
  r.registrar('b', 200);
  const res = r.registrar('c', 300); // estoura -> remove 'a'
  expect(res.novo).toBe(true);
  expect(res.removidos).toEqual(['a']);
  expect(r.tem('a')).toBe(false);
  expect(r.tem('c')).toBe(true);
});

test('expirarInativos remove quem passou do tempo', () => {
  const r = criarRegistry({ limite: 5, inatividadeMs: 1000 });
  r.registrar('a', 1000);
  r.registrar('b', 1500);
  const removidos = r.expirarInativos(2200); // 'a' inativo há 1200ms
  expect(removidos).toEqual(['a']);
  expect(r.tem('b')).toBe(true);
});

test('exatamente no limite de inatividade NÃO expira (grace de 1ms)', () => {
  const r = criarRegistry({ limite: 5, inatividadeMs: 1000 });
  r.registrar('a', 1000);
  expect(r.expirarInativos(2000)).toEqual([]);   // diff === 1000, não expira
  expect(r.expirarInativos(2001)).toEqual(['a']); // diff > 1000, expira
});

test('configurar altera limite e inatividade em tempo real', () => {
  const r = criarRegistry({ limite: 1, inatividadeMs: 1000 });
  r.registrar('a', 100);
  r.configurar({ limite: 2, inatividadeMs: 5000 });
  const res = r.registrar('b', 200); // agora cabe sem remover ninguém
  expect(res.removidos).toEqual([]);
  expect(r.tem('a')).toBe(true);
  expect(r.expirarInativos(2000)).toEqual([]); // 'a' inativo há 1900ms < 5000ms
});
