import { criarCena } from './scene.js';
import { conectarWS } from './ws-client.js';
import { criarGerenciador } from './avatar-manager.js';
import { carregarPersonagens } from './characters.js';

// Valores padrão só até o backend enviar o frame { tipo: 'config' } (fonte de
// verdade = config/config.json). O overlay se reconfigura ao recebê-lo.
const CFG_PADRAO = { limiteAvatares: 18, inatividadeSegundos: 150 };

const statusEl = document.getElementById('status');

const cena = await criarCena(document.getElementById('palco'));
await carregarPersonagens();
const gerenciador = criarGerenciador(cena, CFG_PADRAO);

conectarWS({
  aoEvento: (evento) => {
    if (evento.tipo === 'config') { gerenciador.configurar(evento); return; }
    gerenciador.tratar(evento);
  },
  aoStatus: (s) => {
    statusEl.textContent = s === 'conectado' ? '' : (s === 'reconectando' ? 'reconectando…' : s);
    statusEl.className = s === 'conectado' ? 'ok' : '';
  },
});
