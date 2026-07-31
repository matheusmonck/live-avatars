import { createRegistry } from './avatar-registry.js';
import { createThrottle } from './throttle.js';
import { createAvatarVisual } from './avatar.js';
import * as R from './reactions.js';

export function createManager(scene, cfg) {
  const registry = createRegistry({
    limit: cfg.avatarLimit,
    inactivityMs: cfg.inactivitySeconds * 1000,
  });
  // cfg.stageMode sempre chega booleano (DEFAULT_CONFIG ou validateConfig); o
  // `!== false` só faz omitir a chave também cair no padrão ligado.
  const settings = { stageMode: cfg.stageMode !== false };
  const throttle = createThrottle(1500);
  const THROTTLED_TYPES = new Set(['like', 'follow', 'share']);
  const visuals = new Map(); // usuario -> avatarVisual

  function ensure(event) {
    const result = registry.register(event.username, Date.now());
    for (const u of result.removed) removeVisual(u);
    if (result.isNew) {
      const v = createAvatarVisual(result.avatar, scene);
      visuals.set(event.username, v);
    }
    return visuals.get(event.username);
  }

  function removeVisual(usuario) {
    const v = visuals.get(usuario);
    if (v) { visuals.delete(usuario); v.leave(); }
  }

  function handle(event) {
    if (THROTTLED_TYPES.has(event.type) && !throttle.allow(event.type + ':' + event.username)) return;
    const v = ensure(event);
    if (!v) return;
    switch (event.type) {
      case 'comment': v.jump(); break;
      case 'join': break; // já entrou andando ao ser criado
      case 'like': R.reactionHearts(scene, v); break;
      case 'follow': R.reactionFollow(scene, v, event.name || event.username, { stage: settings.stageMode }); break;
      case 'share': R.reactionStars(scene, v); break;
      case 'gift': R.reactionGift(scene, v, event, { stage: settings.stageMode }); break;
    }
  }

  // Andar contínuo de todos os avatares.
  scene.app.ticker.add((ticker) => {
    for (const v of visuals.values()) v.walk(ticker.deltaMS);
  });

  // Expiração por inatividade a cada 5s.
  setInterval(() => {
    for (const u of registry.expireInactive(Date.now())) removeVisual(u);
  }, 5000);

  function configure(newCfg) {
    registry.configure({
      limit: newCfg.avatarLimit,
      inactivityMs: newCfg.inactivitySeconds * 1000,
    });
    if (typeof newCfg.stageMode === 'boolean') settings.stageMode = newCfg.stageMode;
  }

  return { handle, configure };
}
