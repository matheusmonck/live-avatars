import { test, expect } from 'vitest';
import { sanitizeBubble } from '../src/overlay/bubble-text.js';

test('colapsa espaços e faz trim', () => {
  expect(sanitizeBubble('  oi   galera  \n\t legal ')).toBe('oi galera legal');
});

test('texto vazio ou só espaço vira string vazia', () => {
  expect(sanitizeBubble('')).toBe('');
  expect(sanitizeBubble('   \n ')).toBe('');
  expect(sanitizeBubble(null)).toBe('');
  expect(sanitizeBubble(undefined)).toBe('');
});

test('corta no maxChars com reticências', () => {
  const s = sanitizeBubble('abcdefghij', { maxChars: 5 });
  expect(s).toBe('abcd…');
  expect(s.length).toBe(5);
});

test('não corta quando cabe no limite', () => {
  expect(sanitizeBubble('curto', { maxChars: 80 })).toBe('curto');
});

test('mascara palavrão da lista (token inteiro, case-insensitive)', () => {
  const out = sanitizeBubble('seu MERDA total', { badWords: ['merda'] });
  expect(out).toBe('seu ***** total');
});

test('máscara respeita fronteira: não mexe em substring', () => {
  // "cu" na lista não pode mascarar "curtir"
  expect(sanitizeBubble('vou curtir isso', { badWords: ['cu'] })).toBe('vou curtir isso');
  expect(sanitizeBubble('que cu!', { badWords: ['cu'] })).toBe('que **!');
});

test('sem lista de palavrão, não mascara nada', () => {
  expect(sanitizeBubble('merda total')).toBe('merda total');
});
