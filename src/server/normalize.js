function dadosUsuario(raw) {
  return {
    usuario: String(raw?.uniqueId ?? '').replace(/^@/, ''),
    nome: String(raw?.nickname ?? raw?.uniqueId ?? ''),
    fotoUrl: String(raw?.profilePictureUrl ?? ''),
  };
}

export function normalizarComentario(raw) {
  return { tipo: 'comentario', ...dadosUsuario(raw) };
}

export function normalizarEntrar(raw) {
  return { tipo: 'entrar', ...dadosUsuario(raw) };
}

export function normalizarCurtida(raw) {
  return { tipo: 'curtida', ...dadosUsuario(raw), quantidade: Number(raw?.likeCount ?? 1) };
}

export function normalizarSeguir(raw) {
  return { tipo: 'seguir', ...dadosUsuario(raw) };
}

export function normalizarCompartilhar(raw) {
  return { tipo: 'compartilhar', ...dadosUsuario(raw) };
}

// Presentes "streakáveis" (giftType === 1) chegam repetidos enquanto a pessoa
// segura o botão; só contam quando repeatEnd === true. Retorna null nos frames
// intermediários pra não animar N vezes.
export function normalizarPresente(raw) {
  const streakable = raw?.giftType === 1;
  if (streakable && !raw?.repeatEnd) return null;
  const repeat = Number(raw?.repeatCount ?? 1);
  const diamantes = Number(raw?.diamondCount ?? 0);
  return {
    tipo: 'presente',
    ...dadosUsuario(raw),
    presente: String(raw?.giftName ?? 'presente'),
    valorMoedas: diamantes * repeat,
  };
}
