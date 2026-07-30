import { criarCena } from './scene.js';
import { conectarWS } from './ws-client.js';
import { criarGerenciador } from './avatar-manager.js';

// Config mínima do overlay (limite/inatividade). Casada com o config do backend
// por valores padrão; o backend é a fonte de verdade dos eventos.
const CFG = { limiteAvatares: 18, inatividadeSegundos: 150 };

const statusEl = document.getElementById('status');

const cena = await criarCena(document.getElementById('palco'));
const gerenciador = criarGerenciador(cena, CFG);

conectarWS({
  aoEvento: (evento) => gerenciador.tratar(evento),
  aoStatus: (s) => {
    statusEl.textContent = s === 'conectado' ? '' : (s === 'reconectando' ? 'reconectando…' : s);
    statusEl.className = s === 'conectado' ? 'ok' : '';
  },
});
