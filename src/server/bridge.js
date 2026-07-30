import { WebSocketServer } from 'ws';

// Anexa um servidor WebSocket a um http.Server existente e permite broadcast.
export function criarBridge(httpServer, aoConectar) {
  const wss = new WebSocketServer({ server: httpServer });
  if (aoConectar) wss.on('connection', (ws) => aoConectar(ws));

  return {
    broadcast(evento) {
      const msg = JSON.stringify(evento);
      for (const ws of wss.clients) {
        if (ws.readyState === ws.OPEN) ws.send(msg, () => {}); // callback absorve erro se o socket fechar no meio
      }
    },
    clientes() { return wss.clients.size; },
    fechar() { wss.close(); },
  };
}
