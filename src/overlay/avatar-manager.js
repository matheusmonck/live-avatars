import { criarRegistry } from './avatar-registry.js';
import { createThrottle } from './throttle.js';
import { criarAvatarVisual } from './avatar.js';
import * as R from './reactions.js';

export function criarGerenciador(cena, cfg) {
  const registry = criarRegistry({
    limite: cfg.limiteAvatares,
    inatividadeMs: cfg.inatividadeSegundos * 1000,
  });
  const throttle = createThrottle(1500);
  const TIPOS_THROTTLED = new Set(['curtida', 'seguir', 'compartilhar']);
  const visuais = new Map(); // usuario -> avatarVisual

  function garantir(evento) {
    const res = registry.registrar(evento.usuario, Date.now());
    for (const u of res.removidos) removerVisual(u);
    if (res.novo) {
      const v = criarAvatarVisual(res.avatar, cena);
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
    for (const u of registry.expirarInativos(Date.now())) removerVisual(u);
  }, 5000);

  function configurar(novo) {
    registry.configurar({
      limite: novo.limiteAvatares,
      inatividadeMs: novo.inatividadeSegundos * 1000,
    });
  }

  return { tratar, configurar };
}
