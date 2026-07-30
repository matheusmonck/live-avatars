import { test, expect } from 'vitest';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { createBridge } from '../src/server/bridge.js';

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

test('broadcast entrega evento a um cliente conectado', async () => {
  const http = createServer();
  const bridge = createBridge(http);
  await new Promise(r => http.listen(0, r));
  const porta = http.address().port;

  const cliente = new WebSocket(`ws://localhost:${porta}`);
  const recebidos = [];
  cliente.on('message', (m) => recebidos.push(JSON.parse(m.toString())));
  await new Promise(r => cliente.on('open', r));

  bridge.broadcast({ tipo: 'comentario', usuario: 'fulano' });
  await esperar(50);

  expect(recebidos).toEqual([{ tipo: 'comentario', usuario: 'fulano' }]);
  expect(bridge.clients()).toBe(1);

  cliente.close();
  bridge.close();
  await new Promise(r => http.close(r));
});

test('onConnect envia mensagem inicial ao novo cliente', async () => {
  const http = createServer();
  const bridge = createBridge(http, (ws) => ws.send(JSON.stringify({ tipo: 'config', limiteAvatares: 7 })));
  await new Promise(r => http.listen(0, r));
  const porta = http.address().port;

  const cliente = new WebSocket(`ws://localhost:${porta}`);
  const recebidos = [];
  cliente.on('message', (m) => recebidos.push(JSON.parse(m.toString())));
  await new Promise(r => cliente.on('open', r));
  await esperar(50);

  expect(recebidos).toEqual([{ tipo: 'config', limiteAvatares: 7 }]);

  cliente.close();
  bridge.close();
  await new Promise(r => http.close(r));
});
