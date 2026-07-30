import { TikTokLiveConnection } from 'tiktok-live-connector';
import {
  normalizeComment, normalizeJoin, normalizeLike,
  normalizeFollow, normalizeShare, normalizeGift,
} from './normalize.js';

// Fábrica padrão da conexão real. Injetável nos testes.
// A v2 exige uma chave do sign server (Euler Stream) via signApiKey.
function realConnection(usuario, { signApiKey } = {}) {
  return new TikTokLiveConnection(usuario, { signApiKey });
}

export function createConnector(usuario, {
  signApiKey,
  createConnection = (u) => realConnection(u, { signApiKey }),
  onEvent = () => {},
  onStatus = () => {},
} = {}) {
  const connection = createConnection(usuario);

  function forward(event) {
    if (event) onEvent(event);
  }

  connection.on('chat', (d) => forward(normalizeComment(d)));
  connection.on('member', (d) => forward(normalizeJoin(d)));
  connection.on('like', (d) => forward(normalizeLike(d)));
  connection.on('gift', (d) => forward(normalizeGift(d)));
  connection.on('follow', (d) => forward(normalizeFollow(d)));
  connection.on('share', (d) => forward(normalizeShare(d)));
  // Versões antigas emitem 'social' com displayType indicando follow/share.
  connection.on('social', (d) => {
    const type = String(d?.displayType ?? '');
    if (type.includes('follow')) forward(normalizeFollow(d));
    else if (type.includes('share')) forward(normalizeShare(d));
  });

  connection.on('disconnected', () => onStatus({ state: 'disconnected' }));

  async function connect() {
    try {
      const state = await connection.connect();
      onStatus({ state: 'connected', room: state?.roomId });
      return state;
    } catch (err) {
      onStatus({ state: 'error', error: String(err?.message ?? err) });
      throw err;
    }
  }

  return {
    connect,
    disconnect() { try { connection.disconnect(); } catch {} },
  };
}
