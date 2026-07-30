import { WebSocketServer } from 'ws';

// Anexa um servidor WebSocket a um http.Server existente e permite broadcast.
export function criarBridge(httpServer, aoConectar) {
  const wss = new WebSocketServer({ server: httpServer });
  // O http.Server já trata erros de listen (ex.: porta ocupada) com mensagem
  // amigável; o WebSocketServer reemite o mesmo erro, então aqui só evitamos que
  // um 'error' sem ouvinte derrube o processo. Outros erros são logados.
  wss.on('error', (err) => {
    if (err?.code !== 'EADDRINUSE') console.error('WebSocketServer:', err?.message ?? err);
  });
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
