// Cliente WebSocket com reconexão automática. Deriva a URL do próprio host.
export function conectarWS({ aoEvento, aoStatus }) {
  let ws;
  function abrir() {
    const url = `ws://${location.host}`;
    ws = new WebSocket(url);
    ws.onopen = () => aoStatus('conectado');
    ws.onmessage = (ev) => {
      try { aoEvento(JSON.parse(ev.data)); } catch {}
    };
    ws.onclose = () => {
      aoStatus('reconectando');
      setTimeout(abrir, 2000);
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  abrir();
}
