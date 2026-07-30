import { createRegistry } from './avatar-registry.js';
import { createThrottle } from './throttle.js';
import { criarAvatarVisual } from './avatar.js';
import * as R from './reactions.js';

export function criarGerenciador(cena, cfg) {
  const registry = createRegistry({
    limit: cfg.limiteAvatares,
    inactivityMs: cfg.inatividadeSegundos * 1000,
  });
  const throttle = createThrottle(1500);
  const TIPOS_THROTTLED = new Set(['curtida', 'seguir', 'compartilhar']);
  const visuais = new Map(); // usuario -> avatarVisual

  function garantir(evento) {
    const result = registry.register(evento.usuario, Date.now());
    for (const u of result.removed) removerVisual(u);
    if (result.isNew) {
      const v = criarAvatarVisual(result.avatar, cena);
      visuais.set(evento.usuario, v);
    }
    return visuais.get(evento.usuario);
  }

  function removerVisual(usuario) {
    const v = visuais.get(usuario);
    if (v) { visuais.delete(usuario); v.sair(); }
  }

  function tratar(evento) {
    if (TIPOS_THROTTLED.has(evento.tipo) && !throttle.allow(evento.tipo + ':' + evento.usuario)) return;
    const v = garantir(evento);
    if (!v) return;
    switch (evento.tipo) {
      case 'comentario': v.pular(); break;
      case 'entrar': break; // já entrou andando ao ser criado
      case 'curtida': R.reacaoCuracao(cena, v); break;
      case 'seguir': R.reacaoSeguir(cena, v, evento.nome || evento.usuario); break;
      case 'compartilhar': R.reacaoEstrelas(cena, v); break;
      case 'presente': R.reacaoPresente(cena, v, evento); break;
    }
  }

  // Andar contínuo de todos os avatares.
  cena.app.ticker.add((ticker) => {
    for (const v of visuais.values()) v.andar(ticker.deltaMS);
  });

  // Expiração por inatividade a cada 5s.
  setInterval(() => {
    for (const u of registry.expireInactive(Date.now())) removerVisual(u);
  }, 5000);

  function configurar(novo) {
    registry.configure({
      limit: novo.limiteAvatares,
      inactivityMs: novo.inatividadeSegundos * 1000,
    });
  }

  return { tratar, configurar };
}
