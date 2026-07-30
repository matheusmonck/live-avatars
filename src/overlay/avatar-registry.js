export function criarRegistry({ limite, inatividadeMs }) {
  // usuario -> { usuario, ultimaInteracao }
  const avatares = new Map();

  function maisAntigo() {
    let alvo = null;
    for (const a of avatares.values()) {
      if (!alvo || a.ultimaInteracao < alvo.ultimaInteracao) alvo = a;
    }
    return alvo;
  }

  return {
    registrar(usuario, agora) {
      const existente = avatares.get(usuario);
      if (existente) {
        existente.ultimaInteracao = agora;
        return { novo: false, avatar: existente, removidos: [] };
      }
      const removidos = [];
      while (avatares.size >= limite) {
        const velho = maisAntigo();
        if (!velho) break;
        avatares.delete(velho.usuario);
        removidos.push(velho.usuario);
      }
      const avatar = { usuario, ultimaInteracao: agora };
      avatares.set(usuario, avatar);
      return { novo: true, avatar, removidos };
    },

    expirarInativos(agora) {
      const removidos = [];
      for (const a of avatares.values()) {
        if (agora - a.ultimaInteracao > inatividadeMs) removidos.push(a.usuario);
      }
      for (const u of removidos) avatares.delete(u);
      return removidos;
    },

    configurar({ limite: novoLimite, inatividadeMs: novaInatividade } = {}) {
      if (Number.isFinite(novoLimite)) limite = novoLimite;
      if (Number.isFinite(novaInatividade)) inatividadeMs = novaInatividade;
    },

    tem(usuario) { return avatares.has(usuario); },
    lista() { return [...avatares.values()].map(a => ({ ...a })); },
  };
}
