import { TikTokLiveConnection } from 'tiktok-live-connector';
import {
  normalizarComentario, normalizarEntrar, normalizarCurtida,
  normalizarSeguir, normalizarCompartilhar, normalizarPresente,
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

  connection.on('chat', (d) => forward(normalizarComentario(d)));
  connection.on('member', (d) => forward(normalizarEntrar(d)));
  connection.on('like', (d) => forward(normalizarCurtida(d)));
  connection.on('gift', (d) => forward(normalizarPresente(d)));
  connection.on('follow', (d) => forward(normalizarSeguir(d)));
  connection.on('share', (d) => forward(normalizarCompartilhar(d)));
  // Versões antigas emitem 'social' com displayType indicando follow/share.
  connection.on('social', (d) => {
    const tipo = String(d?.displayType ?? '');
    if (tipo.includes('follow')) forward(normalizarSeguir(d));
    else if (tipo.includes('share')) forward(normalizarCompartilhar(d));
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
