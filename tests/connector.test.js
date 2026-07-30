import { test, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { criarConnector } from '../src/server/connector.js';

function fakeConexao() {
  const em = new EventEmitter();
  em.connect = async () => ({ roomId: '1' });
  em.disconnect = () => {};
  return em;
}

test('encaminha comentário normalizado', async () => {
  const conexao = fakeConexao();
  const recebidos = [];
  const c = criarConnector('fulano', {
    criarConexao: () => conexao,
    aoEvento: (e) => recebidos.push(e),
  });
  await c.conectar();
  conexao.emit('chat', { user: { displayId: 'ana', nickname: 'Ana', avatarThumb: { urlList: ['f'] } }, content: 'oi' });
  expect(recebidos[0]).toEqual({ tipo: 'comentario', usuario: 'ana', nome: 'Ana', fotoUrl: 'f' });
});

test('presente streakável intermediário não é encaminhado', async () => {
  const conexao = fakeConexao();
  const recebidos = [];
  const c = criarConnector('fulano', { criarConexao: () => conexao, aoEvento: (e) => recebidos.push(e) });
  await c.conectar();
  conexao.emit('gift', { user: { displayId: 'ana' }, gift: { name: 'rosa', diamondCount: 1, type: 1 }, repeatCount: 1, repeatEnd: 0 });
  expect(recebidos).toHaveLength(0);
  conexao.emit('gift', { user: { displayId: 'ana' }, gift: { name: 'rosa', diamondCount: 1, type: 1 }, repeatCount: 2, repeatEnd: 1 });
  expect(recebidos[0].tipo).toBe('presente');
  expect(recebidos[0].valorMoedas).toBe(2);
});
