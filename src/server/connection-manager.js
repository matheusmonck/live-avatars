import { UserOfflineError } from 'tiktok-live-connector';
import { createConnector } from './connector.js';

// Gerencia o ciclo de vida da conexão com o TikTok de forma controlável (start/stop)
// e observável (getStatus + frames de status pelo bridge).
export function createConnectionManager({
  bridge,
  createConnector: makeConnector = createConnector,
  retryMs = 15000,
} = {}) {
  let status = { state: 'idle' };
  let connector = null;
  let timer = null;
  let cfg = null;

  function setStatus(s) {
    status = s;
    bridge.broadcast({ type: 'status', ...s });
  }

  function scheduleRetry() {
    timer = setTimeout(() => { timer = null; connect(); }, retryMs);
  }

  function connect() {
    setStatus({ state: 'connecting', username: cfg.username });
    connector = makeConnector(cfg.username, {
      signApiKey: cfg.signApiKey,
      onEvent: (e) => bridge.broadcast(e),
      onStatus: (st) => {
        if (st.state === 'disconnected') {
          setStatus({ state: 'reconnecting', username: cfg.username });
          scheduleRetry();
        }
      },
    });
    connector.connect()
      .then((st) => setStatus({ state: 'connected', username: cfg.username, room: st?.roomId }))
      .catch((err) => {
        const offline = err instanceof UserOfflineError;
        setStatus({
          state: offline ? 'offline' : 'error',
          username: cfg.username,
          reason: String(err?.message ?? err).slice(0, 120),
        });
        scheduleRetry();
      });
  }

  return {
    start(newCfg) {
      if (!newCfg?.username) throw new Error('username obrigatório para iniciar');
      if (!newCfg?.signApiKey) throw new Error('signApiKey obrigatório para iniciar');
      this.stop();
      cfg = newCfg;
      connect();
    },
    stop() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (connector) { try { connector.disconnect(); } catch {} connector = null; }
      if (status.state !== 'idle') setStatus({ state: 'idle' });
    },
    getStatus() { return status; },
  };
}
