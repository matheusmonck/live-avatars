import { test, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { createConnector } from '../src/server/connector.js';

function fakeConexao() {
  const em = new EventEmitter();
  em.connect = async () => ({ roomId: '1' });
  em.disconnect = () => {};
  return em;
}

test('encaminha comentário normalizado', async () => {
  const conexao = fakeConexao();
  const recebidos = [];
  const c = createConnector('fulano', {
    createConnection: () => conexao,
    onEvent: (e) => recebidos.push(e),
  });
  await c.connect();
  conexao.emit('chat', { user: { displayId: 'ana', nickname: 'Ana', avatarThumb: { urlList: ['f'] } }, comment: 'oi' });
  expect(recebidos[0]).toEqual({ type: 'comment', username: 'ana', name: 'Ana', avatarUrl: 'f', text: 'oi' });
});

test('presente streakável intermediário não é encaminhado', async () => {
  const conexao = fakeConexao();
  const recebidos = [];
  const c = createConnector('fulano', { createConnection: () => conexao, onEvent: (e) => recebidos.push(e) });
  await c.connect();
  conexao.emit('gift', { user: { displayId: 'ana' }, gift: { name: 'rosa', diamondCount: 1, type: 1 }, repeatCount: 1, repeatEnd: 0 });
  expect(recebidos).toHaveLength(0);
  conexao.emit('gift', { user: { displayId: 'ana' }, gift: { name: 'rosa', diamondCount: 1, type: 1 }, repeatCount: 2, repeatEnd: 1 });
  expect(recebidos[0].type).toBe('gift');
  expect(recebidos[0].coins).toBe(2);
});
