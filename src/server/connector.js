import { TikTokLiveConnection } from 'tiktok-live-connector';
import {
  normalizarComentario, normalizarEntrar, normalizarCurtida,
  normalizarSeguir, normalizarCompartilhar, normalizarPresente,
} from './normalize.js';

// Fábrica padrão da conexão real. Injetável nos testes.
// A v2 exige uma chave do sign server (Euler Stream) via signApiKey.
function conexaoReal(usuario, { signApiKey } = {}) {
  return new TikTokLiveConnection(usuario, { signApiKey });
}

export function criarConnector(usuario, {
  signApiKey,
  criarConexao = (u) => conexaoReal(u, { signApiKey }),
  aoEvento = () => {},
  aoStatus = () => {},
} = {}) {
  const conexao = criarConexao(usuario);

  function encaminhar(evento) {
    if (evento) aoEvento(evento);
  }

  conexao.on('chat', (d) => encaminhar(normalizarComentario(d)));
  conexao.on('member', (d) => encaminhar(normalizarEntrar(d)));
  conexao.on('like', (d) => encaminhar(normalizarCurtida(d)));
  conexao.on('gift', (d) => encaminhar(normalizarPresente(d)));
  conexao.on('follow', (d) => encaminhar(normalizarSeguir(d)));
  conexao.on('share', (d) => encaminhar(normalizarCompartilhar(d)));
  // Versões antigas emitem 'social' com displayType indicando follow/share.
  conexao.on('social', (d) => {
    const tipo = String(d?.displayType ?? '');
    if (tipo.includes('follow')) encaminhar(normalizarSeguir(d));
    else if (tipo.includes('share')) encaminhar(normalizarCompartilhar(d));
  });

  conexao.on('disconnected', () => aoStatus({ estado: 'desconectado' }));

  async function conectar() {
    try {
      const estado = await conexao.connect();
      aoStatus({ estado: 'conectado', sala: estado?.roomId });
      return estado;
    } catch (err) {
      aoStatus({ estado: 'erro', erro: String(err?.message ?? err) });
      throw err;
    }
  }

  return {
    conectar,
    desconectar() { try { conexao.disconnect(); } catch {} },
  };
}
