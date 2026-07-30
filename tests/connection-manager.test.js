import { test, expect, vi } from 'vitest';
import { createConnectionManager } from '../src/server/connection-manager.js';

function fakeBridge() {
  const frames = [];
  return { broadcast: (f) => frames.push(f), frames };
}

function fakeConnectorFactory(behavior) {
  return (username, opts) => ({
    _opts: opts,
    connect: () => behavior.connect(),
    disconnect: vi.fn(),
  });
}

test('start conecta e emite status connected', async () => {
  const bridge = fakeBridge();
  const createConnector = fakeConnectorFactory({ connect: () => Promise.resolve({ roomId: 'R1' }) });
  const m = createConnectionManager({ bridge, createConnector });
  m.start({ username: 'ana', signApiKey: 'k' });
  await vi.waitFor(() => expect(m.getStatus().state).toBe('connected'));
  expect(m.getStatus()).toMatchObject({ state: 'connected', username: 'ana', room: 'R1' });
  expect(bridge.frames.some(f => f.type === 'status' && f.state === 'connecting')).toBe(true);
  expect(bridge.frames.some(f => f.type === 'status' && f.state === 'connected')).toBe(true);
});

test('start exige username e signApiKey', () => {
  const m = createConnectionManager({ bridge: fakeBridge(), createConnector: fakeConnectorFactory({ connect: () => Promise.resolve({}) }) });
  expect(() => m.start({ username: '', signApiKey: 'k' })).toThrow(/username/);
  expect(() => m.start({ username: 'ana', signApiKey: '' })).toThrow(/signApiKey/);
});

test('falha de conexão vira status error e agenda retry', async () => {
  const bridge = fakeBridge();
  const createConnector = fakeConnectorFactory({ connect: () => Promise.reject(new Error('boom')) });
  const m = createConnectionManager({ bridge, createConnector, retryMs: 5 });
  m.start({ username: 'ana', signApiKey: 'k' });
  await vi.waitFor(() => expect(m.getStatus().state).toBe('error'));
  expect(m.getStatus().reason).toMatch(/boom/);
  m.stop();
});

test('stop volta para idle e desconecta', async () => {
  const bridge = fakeBridge();
  const disconnect = vi.fn();
  const createConnector = () => ({ connect: () => Promise.resolve({ roomId: 'R' }), disconnect });
  const m = createConnectionManager({ bridge, createConnector });
  m.start({ username: 'ana', signApiKey: 'k' });
  await vi.waitFor(() => expect(m.getStatus().state).toBe('connected'));
  m.stop();
  expect(m.getStatus().state).toBe('idle');
  expect(disconnect).toHaveBeenCalled();
});
