// A tiktok-live-connector v2 entrega o protobuf cru: o usuário vem aninhado em
// `raw.user` (displayId = @, nickname = nome, avatarThumb.urlList = fotos) e o
// presente em `raw.gift` (type, diamondCount, name).
function dadosUsuario(raw) {
  const user = raw?.user ?? {};
  return {
    usuario: String(user.displayId ?? '').replace(/^@/, ''),
    nome: String(user.nickname ?? user.displayId ?? ''),
    fotoUrl: String(user.avatarThumb?.urlList?.[0] ?? ''),
  };
}

export function normalizarComentario(raw) {
  return { tipo: 'comentario', ...dadosUsuario(raw) };
}

export function normalizarEntrar(raw) {
  return { tipo: 'entrar', ...dadosUsuario(raw) };
}

export function normalizarCurtida(raw) {
  return { tipo: 'curtida', ...dadosUsuario(raw), quantidade: Number(raw?.count ?? 1) };
}

export function normalizarSeguir(raw) {
  return { tipo: 'seguir', ...dadosUsuario(raw) };
}

export function normalizarCompartilhar(raw) {
  return { tipo: 'compartilhar', ...dadosUsuario(raw) };
}

// Presentes "streakáveis" (gift.type === 1) chegam repetidos enquanto a pessoa
// segura o botão; só contam quando repeatEnd for verdadeiro (proto usa 0/1).
// Retorna null nos frames intermediários pra não animar N vezes.
export function normalizarPresente(raw) {
  const gift = raw?.gift ?? {};
  const streakable = gift.type === 1;
  if (streakable && !raw?.repeatEnd) return null;
  const repeat = Number(raw?.repeatCount ?? 1);
  const diamantes = Number(gift.diamondCount ?? 0);
  return {
    tipo: 'presente',
    ...dadosUsuario(raw),
    presente: String(gift.name ?? 'presente'),
    valorMoedas: diamantes * repeat,
  };
}
