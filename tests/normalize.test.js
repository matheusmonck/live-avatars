import { test, expect } from 'vitest';
import {
  normalizarComentario, normalizarEntrar, normalizarCurtida,
  normalizarSeguir, normalizarCompartilhar, normalizarPresente,
} from '../src/server/normalize.js';

const base = { uniqueId: 'fulano', nickname: 'Fulano', profilePictureUrl: 'http://foto' };

test('comentário', () => {
  expect(normalizarComentario({ ...base, comment: 'oi' })).toEqual({
    tipo: 'comentario', usuario: 'fulano', nome: 'Fulano', fotoUrl: 'http://foto',
  });
});

test('entrar', () => {
  expect(normalizarEntrar(base).tipo).toBe('entrar');
});

test('curtida soma likeCount', () => {
  const n = normalizarCurtida({ ...base, likeCount: 7 });
  expect(n.tipo).toBe('curtida');
  expect(n.quantidade).toBe(7);
});

test('seguir e compartilhar', () => {
  expect(normalizarSeguir(base).tipo).toBe('seguir');
  expect(normalizarCompartilhar(base).tipo).toBe('compartilhar');
});

test('presente: valor = diamondCount * repeatCount', () => {
  const n = normalizarPresente({ ...base, giftName: 'rosa', diamondCount: 1, repeatCount: 3, giftType: 2, repeatEnd: true });
  expect(n).toEqual({
    tipo: 'presente', usuario: 'fulano', nome: 'Fulano', fotoUrl: 'http://foto',
    presente: 'rosa', valorMoedas: 3,
  });
});

test('presente streakável intermediário é ignorado (null)', () => {
  const n = normalizarPresente({ ...base, giftName: 'rosa', diamondCount: 1, repeatCount: 2, giftType: 1, repeatEnd: false });
  expect(n).toBeNull();
});

test('foto ausente vira string vazia', () => {
  expect(normalizarEntrar({ uniqueId: 'x', nickname: 'X' }).fotoUrl).toBe('');
});
