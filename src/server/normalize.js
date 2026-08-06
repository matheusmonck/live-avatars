// A tiktok-live-connector v2 entrega o protobuf cru: o usuário vem aninhado em
// `raw.user` (displayId = @, nickname = nome, avatarThumb.urlList = fotos) e o
// presente em `raw.gift` (type, diamondCount, name).
function userData(raw) {
  const user = raw?.user ?? {};
  return {
    username: String(user.displayId ?? '').replace(/^@/, ''),
    name: String(user.nickname ?? user.displayId ?? ''),
    avatarUrl: String(user.avatarThumb?.urlList?.[0] ?? ''),
  };
}

// O texto do chat vem em `content` no proto v3 (usado pela tiktok-live-connector v2);
// protos antigos (v1) usavam `comment` — mantido como fallback pra compatibilidade.
export function normalizeComment(raw) {
  return { type: 'comment', ...userData(raw), text: String(raw?.content ?? raw?.comment ?? '') };
}

export function normalizeJoin(raw) {
  return { type: 'join', ...userData(raw) };
}

export function normalizeLike(raw) {
  return { type: 'like', ...userData(raw), count: Number(raw?.count ?? 1) };
}

export function normalizeFollow(raw) {
  return { type: 'follow', ...userData(raw) };
}

export function normalizeShare(raw) {
  return { type: 'share', ...userData(raw) };
}

// Presentes "streakáveis" (gift.type === 1) chegam repetidos enquanto a pessoa
// segura o botão; só contam quando repeatEnd for verdadeiro (proto usa 0/1).
// Retorna null nos frames intermediários pra não animar N vezes.
export function normalizeGift(raw) {
  const gift = raw?.gift ?? {};
  const streakable = gift.type === 1;
  if (streakable && !raw?.repeatEnd) return null;
  const repeat = Number(raw?.repeatCount ?? 1);
  const diamonds = Number(gift.diamondCount ?? 0);
  return {
    type: 'gift',
    ...userData(raw),
    giftName: String(gift.name ?? 'presente'),
    coins: diamonds * repeat,
  };
}
