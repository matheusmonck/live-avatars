import { test, expect } from 'vitest';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { criarBridge } from '../src/server/bridge.js';

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

test('broadcast entrega evento a um cliente conectado', async () => {
  const http = createServer();
  const bridge = criarBridge(http);
  await new Promise(r => http.listen(0, r));
  const porta = http.address().port;

  const cliente = new WebSocket(`ws://localhost:${porta}`);
  const recebidos = [];
  cliente.on('message', (m) => recebidos.push(JSON.parse(m.toString())));
  await new Promise(r => cliente.on('open', r));

  bridge.broadcast({ tipo: 'comentario', usuario: 'fulano' });
  await esperar(50);

  expect(recebidos).toEqual([{ tipo: 'comentario', usuario: 'fulano' }]);
  expect(bridge.clientes()).toBe(1);

  cliente.close();
  bridge.fechar();
  await new Promise(r => http.close(r));
});
