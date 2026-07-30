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
  conexao.emit('chat', { uniqueId: 'ana', nickname: 'Ana', profilePictureUrl: 'f', comment: 'oi' });
  expect(recebidos[0]).toEqual({ tipo: 'comentario', usuario: 'ana', nome: 'Ana', fotoUrl: 'f' });
});

test('presente streakável intermediário não é encaminhado', async () => {
  const conexao = fakeConexao();
  const recebidos = [];
  const c = criarConnector('fulano', { criarConexao: () => conexao, aoEvento: (e) => recebidos.push(e) });
  await c.conectar();
  conexao.emit('gift', { uniqueId: 'ana', giftName: 'rosa', diamondCount: 1, repeatCount: 1, giftType: 1, repeatEnd: false });
  expect(recebidos).toHaveLength(0);
  conexao.emit('gift', { uniqueId: 'ana', giftName: 'rosa', diamondCount: 1, repeatCount: 2, giftType: 1, repeatEnd: true });
  expect(recebidos[0].tipo).toBe('presente');
  expect(recebidos[0].valorMoedas).toBe(2);
});
