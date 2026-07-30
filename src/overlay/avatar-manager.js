import { createRegistry } from './avatar-registry.js';
import { createThrottle } from './throttle.js';
import { createAvatarVisual } from './avatar.js';
import * as R from './reactions.js';

export function createManager(scene, cfg) {
  const registry = createRegistry({
    limit: cfg.limiteAvatares,
    inactivityMs: cfg.inatividadeSegundos * 1000,
  });
  const throttle = createThrottle(1500);
  const THROTTLED_TYPES = new Set(['curtida', 'seguir', 'compartilhar']);
  const visuals = new Map(); // usuario -> avatarVisual

  function ensure(event) {
    const result = registry.register(event.usuario, Date.now());
    for (const u of result.removed) removeVisual(u);
    if (result.isNew) {
      const v = createAvatarVisual(result.avatar, scene);
      visuals.set(event.usuario, v);
    }
    return visuals.get(event.usuario);
  }

  function removeVisual(usuario) {
    const v = visuals.get(usuario);
    if (v) { visuals.delete(usuario); v.leave(); }
  }

  function handle(event) {
    if (THROTTLED_TYPES.has(event.tipo) && !throttle.allow(event.tipo + ':' + event.usuario)) return;
    const v = ensure(event);
    if (!v) return;
    switch (event.tipo) {
      case 'comentario': v.jump(); break;
      case 'entrar': break; // já entrou andando ao ser criado
      case 'curtida': R.reactionHearts(scene, v); break;
      case 'seguir': R.reactionFollow(scene, v, event.nome || event.usuario); break;
      case 'compartilhar': R.reactionStars(scene, v); break;
      case 'presente': R.reactionGift(scene, v, event); break;
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
      limit: newCfg.limiteAvatares,
      inactivityMs: newCfg.inatividadeSegundos * 1000,
    });
  }

  return { handle, configure };
}
