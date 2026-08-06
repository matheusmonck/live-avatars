import { test, expect } from 'vitest';
import { createBubbleQueue } from '../src/overlay/bubble-queue.js';

test('mostra até o teto; acima disso enfileira', () => {
  const q = createBubbleQueue({ max: 2 });
  expect(q.submit('a', 'oi').action).toBe('show');
  expect(q.submit('b', 'ola').action).toBe('show');
  expect(q.submit('c', 'eae').action).toBe('queued');
  expect(q.activeCount()).toBe(2);
  expect(q.queuedCount()).toBe(1);
});

test('mesmo usuário ativo troca texto (update, sem gastar slot)', () => {
  const q = createBubbleQueue({ max: 2 });
  q.submit('a', 'oi');
  const r = q.submit('a', 'mudou');
  expect(r.action).toBe('update');
  expect(r.text).toBe('mudou');
  expect(q.activeCount()).toBe(1);
});

test('dedup na fila: mantém a última mensagem do usuário', () => {
  const q = createBubbleQueue({ max: 1 });
  q.submit('a', 'ativo');
  expect(q.submit('b', 'primeira').action).toBe('queued');
  expect(q.submit('b', 'segunda').action).toBe('queued');
  expect(q.queuedCount()).toBe(1);
  const { next } = q.release('a');
  expect(next).toEqual({ username: 'b', text: 'segunda' });
});

test('release promove o próximo da fila (FIFO)', () => {
  const q = createBubbleQueue({ max: 1 });
  q.submit('a', 'A');
  q.submit('b', 'B');
  q.submit('c', 'C');
  expect(q.release('a').next).toEqual({ username: 'b', text: 'B' });
  expect(q.release('b').next).toEqual({ username: 'c', text: 'C' });
  expect(q.release('c').next).toBeNull();
});

test('release de quem só estava na fila remove sem promover indevidamente', () => {
  const q = createBubbleQueue({ max: 1 });
  q.submit('a', 'A'); // ativo
  q.submit('b', 'B'); // fila
  const r = q.release('b'); // b saiu antes de aparecer
  expect(r.next).toBeNull();
  expect(q.queuedCount()).toBe(0);
  expect(q.has('a')).toBe(true);
});

test('setMax aumenta o teto e promove os que couberem', () => {
  const q = createBubbleQueue({ max: 1 });
  q.submit('a', 'A');
  q.submit('b', 'B');
  q.submit('c', 'C');
  const promoted = q.setMax(3);
  expect(promoted).toEqual([
    { username: 'b', text: 'B' },
    { username: 'c', text: 'C' },
  ]);
  expect(q.activeCount()).toBe(3);
});
