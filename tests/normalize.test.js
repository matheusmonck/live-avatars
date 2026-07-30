import { test, expect } from 'vitest';
import {
  normalizarComentario, normalizarEntrar, normalizarCurtida,
  normalizarSeguir, normalizarCompartilhar, normalizarPresente,
} from '../src/server/normalize.js';

// Shape do protobuf cru entregue pela tiktok-live-connector v2:
// o usuário vem aninhado em `user` (displayId/nickname/avatarThumb).
const base = { user: { displayId: 'fulano', nickname: 'Fulano', avatarThumb: { urlList: ['http://foto'] } } };

test('comentário', () => {
  expect(normalizarComentario({ ...base, content: 'oi' })).toEqual({
    tipo: 'comentario', usuario: 'fulano', nome: 'Fulano', fotoUrl: 'http://foto',
  });
});

test('entrar', () => {
  expect(normalizarEntrar(base).tipo).toBe('entrar');
});

test('curtida soma count', () => {
  const n = normalizarCurtida({ ...base, count: 7 });
  expect(n.tipo).toBe('curtida');
  expect(n.quantidade).toBe(7);
});

test('seguir e compartilhar', () => {
  expect(normalizarSeguir(base).tipo).toBe('seguir');
  expect(normalizarCompartilhar(base).tipo).toBe('compartilhar');
});

test('presente: valor = diamondCount * repeatCount', () => {
  const n = normalizarPresente({ ...base, gift: { name: 'rosa', diamondCount: 1, type: 2 }, repeatCount: 3, repeatEnd: 1 });
  expect(n).toEqual({
    tipo: 'presente', usuario: 'fulano', nome: 'Fulano', fotoUrl: 'http://foto',
    presente: 'rosa', valorMoedas: 3,
  });
});

test('presente streakável intermediário é ignorado (null)', () => {
  const n = normalizarPresente({ ...base, gift: { name: 'rosa', diamondCount: 1, type: 1 }, repeatCount: 2, repeatEnd: 0 });
  expect(n).toBeNull();
});

test('foto ausente vira string vazia', () => {
  expect(normalizarEntrar({ user: { displayId: 'x', nickname: 'X' } }).fotoUrl).toBe('');
});
