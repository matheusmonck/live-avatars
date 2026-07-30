import { createScene } from './scene.js';
import { connectWS } from './ws-client.js';
import { createManager } from './avatar-manager.js';
import { loadCharacters } from './characters.js';

// Valores padrão só até o backend enviar o frame { type: 'config' } (fonte de
// verdade = config/config.json). O overlay se reconfigura ao recebê-lo.
const DEFAULT_CONFIG = { avatarLimit: 18, inactivitySeconds: 150 };

const statusEl = document.getElementById('status');

const scene = await createScene(document.getElementById('stage'));
await loadCharacters();
const manager = createManager(scene, DEFAULT_CONFIG);

connectWS({
  onEvent: (event) => {
    if (event.type === 'config') { manager.configure(event); return; }
    manager.handle(event);
  },
  onStatus: (s) => {
    statusEl.textContent = s === 'connected' ? '' : (s === 'reconnecting' ? 'reconectando…' : s);
    statusEl.className = s === 'connected' ? 'ok' : '';
  },
});
