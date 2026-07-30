import { createScene } from './scene.js';
import { conectarWS } from './ws-client.js';
import { createManager } from './avatar-manager.js';
import { loadCharacters } from './characters.js';

// Valores padrão só até o backend enviar o frame { tipo: 'config' } (fonte de
// verdade = config/config.json). O overlay se reconfigura ao recebê-lo.
const CFG_PADRAO = { limiteAvatares: 18, inatividadeSegundos: 150 };

const statusEl = document.getElementById('status');

const scene = await createScene(document.getElementById('palco'));
await loadCharacters();
const manager = createManager(scene, CFG_PADRAO);

conectarWS({
  aoEvento: (evento) => {
    if (evento.tipo === 'config') { manager.configure(evento); return; }
    manager.handle(evento);
  },
  aoStatus: (s) => {
    statusEl.textContent = s === 'conectado' ? '' : (s === 'reconectando' ? 'reconectando…' : s);
    statusEl.className = s === 'conectado' ? 'ok' : '';
  },
});
