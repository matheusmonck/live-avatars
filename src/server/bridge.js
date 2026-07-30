import { WebSocketServer } from 'ws';

// Anexa um servidor WebSocket a um http.Server existente e permite broadcast.
export function createBridge(httpServer, onConnect) {
  const wss = new WebSocketServer({ server: httpServer });
  // O http.Server já trata erros de listen (ex.: porta ocupada) com mensagem
  // amigável; o WebSocketServer reemite o mesmo erro, então aqui só evitamos que
  // um 'error' sem ouvinte derrube o processo. Outros erros são logados.
  wss.on('error', (err) => {
    if (err?.code !== 'EADDRINUSE') console.error('WebSocketServer:', err?.message ?? err);
  });
  if (onConnect) wss.on('connection', (ws) => onConnect(ws));

  return {
    broadcast(event) {
      const msg = JSON.stringify(event);
      for (const ws of wss.clients) {
        if (ws.readyState === ws.OPEN) ws.send(msg, () => {}); // callback absorve erro se o socket fechar no meio
      }
    },
    clients() { return wss.clients.size; },
    close() { wss.close(); },
  };
}
