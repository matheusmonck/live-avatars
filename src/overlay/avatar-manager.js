import { createRegistry } from './avatar-registry.js';
import { createThrottle } from './throttle.js';
import { createAvatarVisual } from './avatar.js';
import * as R from './reactions.js';
import { sanitizeBubble } from './bubble-text.js';
import { createBubbleQueue } from './bubble-queue.js';
import { vipUsers, isVip, characterForUser, rosterIds, reloadCharacters } from './characters.js';

// Balão de chat: duração na tela e corte de texto (o teto e a lista de palavrões
// vêm da config; duração/tamanho são "feel" fixo).
const BUBBLE = { durationMs: 3000, maxChars: 80 };

export function createManager(scene, cfg) {
  const registry = createRegistry({
    limit: cfg.avatarLimit,
    inactivityMs: cfg.inactivitySeconds * 1000,
  });
  // cfg.stageMode sempre chega booleano (DEFAULT_CONFIG ou validateConfig); o
  // `!== false` só faz omitir a chave também cair no padrão ligado.
  const settings = {
    stageMode: cfg.stageMode !== false,
    onlyInteractors: cfg.onlyInteractors !== false,
    likeThreshold: Number.isFinite(cfg.likeThreshold) ? cfg.likeThreshold : 10,
    avatarScale: Number.isFinite(cfg.avatarScale) ? cfg.avatarScale : 2,
    avatarOffsetY: Number.isFinite(cfg.avatarOffsetY) ? cfg.avatarOffsetY : 0,
    nameScale: Number.isFinite(cfg.nameScale) ? cfg.nameScale : 1,
    bubbleScale: Number.isFinite(cfg.bubbleScale) ? cfg.bubbleScale : 1,
    bubblesEnabled: cfg.bubblesEnabled !== false,
    bubbleMax: Number.isFinite(cfg.bubbleMax) ? cfg.bubbleMax : 5,
    bubbleBadWords: Array.isArray(cfg.bubbleBadWords) ? cfg.bubbleBadWords : [],
  };
  const throttle = createThrottle(1500);
  const THROTTLED_TYPES = new Set(['like', 'follow', 'share']);
  const visuals = new Map(); // usuario -> avatarVisual
  const likeCounts = new Map(); // username -> soma de corações (pro limiar de aparição)
  const bubbleQueue = createBubbleQueue({ max: settings.bubbleMax });
  const bubbleTimers = new Map(); // username -> timeoutId do sumiço do balão

  function ensure(event, canSpawn) {
    if (!canSpawn && !registry.has(event.username)) return null;
    const result = registry.register(event.username, Date.now());
    for (const u of result.removed) removeVisual(u);
    if (result.isNew) {
      const v = createAvatarVisual(result.avatar, scene, settings.avatarScale);
      visuals.set(event.username, v);
    }
    return visuals.get(event.username);
  }

  // Re-escala todos os avatares na tela (mudou escala global, per-sprite ou resize).
  function rescaleAll() {
    const ui = scene.uiScale();
    for (const v of visuals.values()) v.applyScale(settings.avatarScale, ui);
  }
  scene.app.renderer.on('resize', rescaleAll);
  scene.setGroundOffset(settings.avatarOffsetY);
  scene.setNameScale(settings.nameScale);
  scene.setBubbleScale(settings.bubbleScale);

  // Reassenta todos os avatares na linha do chão (após mudar o offset Y ao vivo).
  function repositionAll() { for (const v of visuals.values()) v.snapToGround(); }

  function removeVisual(usuario) {
    const v = visuals.get(usuario);
    if (v) {
      visuals.delete(usuario); // remove antes de promover, pra fila não repescar quem saiu
      const t = bubbleTimers.get(usuario);
      if (t) { clearTimeout(t); bubbleTimers.delete(usuario); }
      promoteNext(bubbleQueue.release(usuario)); // libera o slot e mostra o próximo (root sai junto no leave)
      v.leave();
    }
  }

  // Render + timer de um balão; reinicia o timer se já havia um (mensagem trocada).
  function showBubbleFor(username, text) {
    const v = visuals.get(username);
    if (!v) return;
    v.showBubble(text);
    const prev = bubbleTimers.get(username);
    if (prev) clearTimeout(prev);
    bubbleTimers.set(username, setTimeout(() => expireBubble(username), BUBBLE.durationMs));
  }

  function expireBubble(username) {
    bubbleTimers.delete(username);
    visuals.get(username)?.clearBubble();
    promoteNext(bubbleQueue.release(username));
  }

  // Depois de liberar um slot, mostra o próximo da fila que ainda esteja na tela.
  function promoteNext(res) {
    let next = res.next;
    while (next && !visuals.has(next.username)) next = bubbleQueue.release(next.username).next;
    if (next) showBubbleFor(next.username, next.text);
  }

  // Comentário -> balão: saneia; se sobrar texto, entra na fila (1 balão por avatar).
  function showComment(event) {
    if (!settings.bubblesEnabled) return;
    const clean = sanitizeBubble(event.text, { maxChars: BUBBLE.maxChars, badWords: settings.bubbleBadWords });
    if (!clean) return;
    const r = bubbleQueue.submit(event.username, clean);
    if (r.action === 'show' || r.action === 'update') showBubbleFor(event.username, clean);
  }

  function ensureVips() {
    for (const u of vipUsers()) ensure({ type: 'vip', username: u }, true);
  }

  function shouldSpawn(event) {
    if (!settings.onlyInteractors) return true;
    if (event.type === 'comment' || event.type === 'gift') return true;
    if (event.type === 'like') return (likeCounts.get(event.username) ?? 0) >= settings.likeThreshold;
    return false; // join/follow/share não criam avatar
  }

  function handle(event) {
    if (event.type === 'like') likeCounts.set(event.username, (likeCounts.get(event.username) ?? 0) + (Number(event.count) || 1));
    const v = ensure(event, shouldSpawn(event));
    if (!v) return;
    if (THROTTLED_TYPES.has(event.type) && !throttle.allow(event.type + ':' + event.username)) return;
    switch (event.type) {
      case 'comment': v.jump(); showComment(event); break;
      case 'join': break;
      case 'like': R.reactionHearts(scene, v); break;
      case 'follow': R.reactionFollow(scene, v, event.name || event.username, { stage: settings.stageMode }); break;
      case 'share': R.reactionStars(scene, v); break;
      case 'gift': R.reactionGift(scene, v, event, { stage: settings.stageMode }); break;
    }
  }

  // Spawn inicial dos VIPs.
  ensureVips();

  // Andar contínuo de todos os avatares.
  scene.app.ticker.add((ticker) => {
    for (const v of visuals.values()) v.walk(ticker.deltaMS);
  });

  // Expiração por inatividade a cada 5s.
  setInterval(() => {
    ensureVips();
    for (const u of registry.expireInactive(Date.now())) removeVisual(u);
  }, 5000);

  function configure(newCfg) {
    registry.configure({
      limit: newCfg.avatarLimit,
      inactivityMs: newCfg.inactivitySeconds * 1000,
    });
    if (typeof newCfg.stageMode === 'boolean') settings.stageMode = newCfg.stageMode;
    if (typeof newCfg.onlyInteractors === 'boolean') settings.onlyInteractors = newCfg.onlyInteractors;
    if (Number.isFinite(newCfg.likeThreshold)) settings.likeThreshold = newCfg.likeThreshold;
    if (Number.isFinite(newCfg.avatarScale)) { settings.avatarScale = newCfg.avatarScale; rescaleAll(); }
    if (Number.isFinite(newCfg.avatarOffsetY)) { settings.avatarOffsetY = newCfg.avatarOffsetY; scene.setGroundOffset(newCfg.avatarOffsetY); repositionAll(); }
    if (Number.isFinite(newCfg.nameScale)) { settings.nameScale = newCfg.nameScale; scene.setNameScale(newCfg.nameScale); rescaleAll(); }
    if (Number.isFinite(newCfg.bubbleScale)) { settings.bubbleScale = newCfg.bubbleScale; scene.setBubbleScale(newCfg.bubbleScale); rescaleAll(); }
    if (typeof newCfg.bubblesEnabled === 'boolean') settings.bubblesEnabled = newCfg.bubblesEnabled;
    if (Array.isArray(newCfg.bubbleBadWords)) settings.bubbleBadWords = newCfg.bubbleBadWords;
    if (Number.isFinite(newCfg.bubbleMax)) {
      settings.bubbleMax = newCfg.bubbleMax;
      for (const item of bubbleQueue.setMax(newCfg.bubbleMax)) { // teto subiu: mostra os que couberem
        if (visuals.has(item.username)) showBubbleFor(item.username, item.text);
        else promoteNext(bubbleQueue.release(item.username));
      }
    }
  }

  // Sprites mudaram ao vivo (escala/ocultar/upload/excluir). Reconciliação híbrida:
  // re-escala todos; remove quem virou identidade inválida (sprite oculto/excluído) —
  // volta correto no próximo evento.
  async function onSprites() {
    await reloadCharacters();
    const ids = new Set(rosterIds());
    for (const [u, v] of visuals) if (!ids.has(v.characterId())) removeVisual(u);
    rescaleAll();
    ensureVips();
  }

  // Usuários mudaram ao vivo (override/VIP). Coroa reconcilia na hora; troca de
  // identidade (novo override) faz o avatar sair e voltar correto.
  async function onUsers() {
    await reloadCharacters();
    for (const [u, v] of visuals) {
      v.setVip(isVip(u));
      if (characterForUser(u) !== v.characterId()) removeVisual(u);
    }
    ensureVips();
  }

  return { handle, configure, onSprites, onUsers };
}
