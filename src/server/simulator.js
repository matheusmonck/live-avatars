export const SIMULATABLE_TYPES = ['comment', 'join', 'like', 'follow', 'gift', 'share'];

// Poucos espectadores recorrentes: como numa live real, as mesmas pessoas voltam
// a interagir. Isso mantém a quantidade de avatares baixa e natural (≤ este pool),
// em vez de encher até o limite com nomes sempre novos.
const NAMES = ['ana.costa', 'bruninho', 'carla_m', 'dan', 'fefa', 'gustavo_tk', 'isa', 'joao.p'];

// Distribuição realista de eventos: curtida e comentário dominam; seguir, presente
// e compartilhar são bem mais raros. (peso = chance relativa)
const TYPE_WEIGHTS = [
  ['like', 45],
  ['comment', 30],
  ['join', 12],
  ['follow', 6],
  ['gift', 4],
  ['share', 3],
];

// Presentes: os baratos são comuns, os caros raros.
const GIFTS = [
  { name: 'rosa', coins: 1, weight: 50 },
  { name: 'sorvete', coins: 5, weight: 30 },
  { name: 'chapeu', coins: 50, weight: 14 },
  { name: 'leao', coins: 300, weight: 5 },
  { name: 'foguete', coins: 1000, weight: 1 },
];

// Escolha ponderada: sorteia um item proporcional ao seu peso, com `r` em 0..1.
function weightedPick(itens, weight, r) {
  const total = itens.reduce((s, it) => s + weight(it), 0);
  let x = r * total;
  for (const it of itens) { const p = weight(it); if (x < p) return it; x -= p; }
  return itens[itens.length - 1];
}

// `rnd` injetável (retorna 0..1) pra testes determinísticos.
export function randomEvent(rnd = Math.random) {
  const username = NAMES[Math.floor(rnd() * NAMES.length) % NAMES.length];
  const type = weightedPick(TYPE_WEIGHTS, (t) => t[1], rnd())[0];
  const event = { type, username, name: username, avatarUrl: `https://i.pravatar.cc/80?u=${username}` };
  if (type === 'like') event.count = Math.floor(rnd() * 10) + 1;
  if (type === 'gift') {
    const p = weightedPick(GIFTS, (g) => g.weight, rnd());
    event.giftName = p.name;
    event.coins = p.coins;
  }
  return event;
}

// Dispara eventos com intervalo variável (mais orgânico que uma batida fixa).
// Retorna função pra parar.
export function startSimulator(onEvent, { min = 700, max = 2200, rnd = Math.random } = {}) {
  let stopped = false;
  let timer = null;
  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(() => { onEvent(randomEvent(rnd)); schedule(); }, min + rnd() * (max - min));
  };
  schedule();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}
