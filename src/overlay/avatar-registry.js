// Hash simples e estável (djb2) -> escolhe o estilo do avatar.
// Mesmo usuário sempre recebe o mesmo estilo.
export function estiloDoUsuario(usuario) {
  let h = 5381;
  for (let i = 0; i < usuario.length; i++) h = ((h << 5) + h + usuario.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? 'blob' : 'pixel';
}

export function criarRegistry({ limite, inatividadeMs }) {
  // usuario -> { usuario, estilo, ultimaInteracao }
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
      const avatar = { usuario, estilo: estiloDoUsuario(usuario), ultimaInteracao: agora };
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

    tem(usuario) { return avatares.has(usuario); },
    lista() { return [...avatares.values()].map(a => ({ ...a })); },
  };
}
