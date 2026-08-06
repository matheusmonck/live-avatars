// Saneia o texto de um comentário antes de virar balão. Puro e testável no Node
// (sem PIXI): colapsa espaços, mascara palavrões da lista e corta no tamanho.

const EDGE = /^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u; // separa pontuação das pontas do núcleo

function maskBadWords(text, badWords) {
  if (!badWords || badWords.length === 0) return text;
  const set = new Set(badWords.map((w) => String(w).toLowerCase()).filter(Boolean));
  if (set.size === 0) return text;
  return text
    .split(' ')
    .map((token) => token.replace(EDGE, (_, pre, core, post) =>
      set.has(core.toLowerCase()) ? pre + '*'.repeat(core.length) + post : token))
    .join(' ');
}

export function sanitizeBubble(text, { maxChars = 80, badWords = [] } = {}) {
  let s = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = maskBadWords(s, badWords);
  if (s.length > maxChars) s = s.slice(0, maxChars - 1).trimEnd() + '…';
  return s;
}
