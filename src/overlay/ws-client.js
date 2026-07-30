// Cliente WebSocket com reconexão automática. Deriva a URL do próprio host.
export function connectWS({ onEvent, onStatus }) {
  let ws;
  function open() {
    const url = `ws://${location.host}`;
    ws = new WebSocket(url);
    ws.onopen = () => onStatus('connected');
    ws.onmessage = (ev) => {
      try { onEvent(JSON.parse(ev.data)); }
      catch (err) { console.warn('overlay: frame inválido ignorado', err); }
    };
    ws.onclose = () => {
      onStatus('reconnecting');
      setTimeout(open, 2000);
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  open();
}
