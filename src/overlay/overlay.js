import { createScene } from './scene.js';
import { connectWS } from './ws-client.js';
import { createManager } from './avatar-manager.js';
import { loadCharacters } from './characters.js';

// Valores padrão só até o backend enviar o frame { type: 'config' } (fonte de
// verdade = config/config.json). O overlay se reconfigura ao recebê-lo.
const DEFAULT_CONFIG = { avatarLimit: 18, inactivitySeconds: 150, stageMode: true };

const statusEl = document.getElementById('status');

const scene = await createScene(document.getElementById('stage'));
await loadCharacters();
try {
  const res = await fetch('terrain.local.json');
  if (res.ok) {
    const t = await res.json();
    await scene.applyTerrain({ active: t?.active ?? null, offset: t?.offsets?.[t?.active] ?? 0 });
  }
} catch {}
const manager = createManager(scene, DEFAULT_CONFIG);

connectWS({
  onEvent: (event) => {
    if (event.type === 'config') { manager.configure(event); return; }
    if (event.type === 'terrain') { scene.applyTerrain(event); return; }
    manager.handle(event);
  },
  onStatus: (s) => {
    statusEl.textContent = s === 'connected' ? '' : (s === 'reconnecting' ? 'reconectando…' : s);
    statusEl.className = s === 'connected' ? 'ok' : '';
  },
});
