import { test, expect } from 'vitest';
import {
  normalizeComment, normalizeJoin, normalizeLike,
  normalizeFollow, normalizeShare, normalizeGift,
} from '../src/server/normalize.js';

// Shape do protobuf cru entregue pela tiktok-live-connector v2:
// o usuário vem aninhado em `user` (displayId/nickname/avatarThumb).
const base = { user: { displayId: 'fulano', nickname: 'Fulano', avatarThumb: { urlList: ['http://foto'] } } };

test('comentário', () => {
  expect(normalizeComment({ ...base, content: 'oi' })).toEqual({
    type: 'comment', username: 'fulano', name: 'Fulano', avatarUrl: 'http://foto',
  });
});

test('entrar', () => {
  expect(normalizeJoin(base).type).toBe('join');
});

test('curtida soma count', () => {
  const n = normalizeLike({ ...base, count: 7 });
  expect(n.type).toBe('like');
  expect(n.count).toBe(7);
});

test('seguir e compartilhar', () => {
  expect(normalizeFollow(base).type).toBe('follow');
  expect(normalizeShare(base).type).toBe('share');
});

test('presente: valor = diamondCount * repeatCount', () => {
  const n = normalizeGift({ ...base, gift: { name: 'rosa', diamondCount: 1, type: 2 }, repeatCount: 3, repeatEnd: 1 });
  expect(n).toEqual({
    type: 'gift', username: 'fulano', name: 'Fulano', avatarUrl: 'http://foto',
    giftName: 'rosa', coins: 3,
  });
});

test('presente streakável intermediário é ignorado (null)', () => {
  const n = normalizeGift({ ...base, gift: { name: 'rosa', diamondCount: 1, type: 1 }, repeatCount: 2, repeatEnd: 0 });
  expect(n).toBeNull();
});

test('foto ausente vira string vazia', () => {
  expect(normalizeJoin({ user: { displayId: 'x', nickname: 'X' } }).avatarUrl).toBe('');
});
