import { createScene } from './scene.js';
import { connectWS } from './ws-client.js';
import { createManager } from './avatar-manager.js';
import { loadCharacters } from './characters.js';
import { createEffectAudio } from './effect-audio.js';

// Valores padrão só até o backend enviar o frame { type: 'config' } (fonte de
// verdade = config/config.json). O overlay se reconfigura ao recebê-lo.
const DEFAULT_CONFIG = { avatarLimit: 18, inactivitySeconds: 150, stageMode: true, onlyInteractors: true, likeThreshold: 10, avatarScale: 2, avatarOffsetY: 0, nameScale: 1, bubbleScale: 1, bubblesEnabled: true, bubbleMax: 5, bubbleBadWords: [], effectsVolume: 0.6 };

const statusEl = document.getElementById('status');
let currentConfig = DEFAULT_CONFIG;
const effectAudio = createEffectAudio();
const unlockAudio = () => effectAudio.unlock();
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

const scene = await createScene(document.getElementById('stage'));
await loadCharacters();
try {
  const res = await fetch('terrain.local.json');
  if (res.ok) {
    const t = await res.json();
    await scene.applyTerrain({ active: t?.active ?? null, offset: t?.offsets?.[t?.active] ?? 0, scale: t?.scales?.[t?.active] ?? 1 });
  }
} catch {}
const manager = createManager(scene, DEFAULT_CONFIG);
manager.onEffect((type) => effectAudio.play(type, currentConfig.effectsVolume));

connectWS({
  onEvent: (event) => {
    if (event.type === 'config') { currentConfig = event; manager.configure(event); return; }
    if (event.type === 'terrain') { scene.applyTerrain(event); return; }
    if (event.type === 'sprites') { manager.onSprites(); return; }
    if (event.type === 'users') { manager.onUsers(); return; }
    manager.handle(event);
  },
  onStatus: (s) => {
    statusEl.textContent = s === 'connected' ? '' : (s === 'reconnecting' ? 'reconectando…' : s);
    statusEl.className = s === 'connected' ? 'ok' : '';
  },
});
