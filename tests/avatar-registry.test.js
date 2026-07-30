import { test, expect } from 'vitest';
import { createRegistry } from '../src/overlay/avatar-registry.js';

test('registrar cria avatar novo', () => {
  const r = createRegistry({ limit: 5, inactivityMs: 1000 });
  const res = r.register('fulano', 1000);
  expect(res.isNew).toBe(true);
  expect(res.avatar.usuario).toBe('fulano');
  expect(res.removed).toEqual([]);
});

test('registrar de novo não cria, só atualiza atividade', () => {
  const r = createRegistry({ limit: 5, inactivityMs: 1000 });
  r.register('fulano', 1000);
  const res = r.register('fulano', 1500);
  expect(res.isNew).toBe(false);
});

test('estoura o limite removendo o menos ativo', () => {
  const r = createRegistry({ limit: 2, inactivityMs: 10000 });
  r.register('a', 100);
  r.register('b', 200);
  const res = r.register('c', 300); // estoura -> remove 'a'
  expect(res.isNew).toBe(true);
  expect(res.removed).toEqual(['a']);
  expect(r.has('a')).toBe(false);
  expect(r.has('c')).toBe(true);
});

test('expirarInativos remove quem passou do tempo', () => {
  const r = createRegistry({ limit: 5, inactivityMs: 1000 });
  r.register('a', 1000);
  r.register('b', 1500);
  const removed = r.expireInactive(2200); // 'a' inativo há 1200ms
  expect(removed).toEqual(['a']);
  expect(r.has('b')).toBe(true);
});

test('exatamente no limite de inatividade NÃO expira (grace de 1ms)', () => {
  const r = createRegistry({ limit: 5, inactivityMs: 1000 });
  r.register('a', 1000);
  expect(r.expireInactive(2000)).toEqual([]);   // diff === 1000, não expira
  expect(r.expireInactive(2001)).toEqual(['a']); // diff > 1000, expira
});

test('configurar altera limite e inatividade em tempo real', () => {
  const r = createRegistry({ limit: 1, inactivityMs: 1000 });
  r.register('a', 100);
  r.configure({ limit: 2, inactivityMs: 5000 });
  const res = r.register('b', 200); // agora cabe sem remover ninguém
  expect(res.removed).toEqual([]);
  expect(r.has('a')).toBe(true);
  expect(r.expireInactive(2000)).toEqual([]); // 'a' inativo há 1900ms < 5000ms
});
