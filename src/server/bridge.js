import { WebSocketServer } from 'ws';

// Anexa um servidor WebSocket a um http.Server existente e permite broadcast.
export function criarBridge(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  return {
    broadcast(evento) {
      const msg = JSON.stringify(evento);
      for (const ws of wss.clients) {
        if (ws.readyState === ws.OPEN) ws.send(msg);
      }
    },
    clientes() { return wss.clients.size; },
    fechar() { wss.close(); },
  };
}
