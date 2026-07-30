export const SIMULATABLE_TYPES = ['comentario', 'entrar', 'curtida', 'seguir', 'presente', 'compartilhar'];

// Poucos espectadores recorrentes: como numa live real, as mesmas pessoas voltam
// a interagir. Isso mantém a quantidade de avatares baixa e natural (≤ este pool),
// em vez de encher até o limite com nomes sempre novos.
const NAMES = ['ana.costa', 'bruninho', 'carla_m', 'dan', 'fefa', 'gustavo_tk', 'isa', 'joao.p'];

// Distribuição realista de eventos: curtida e comentário dominam; seguir, presente
// e compartilhar são bem mais raros. (peso = chance relativa)
const TYPE_WEIGHTS = [
  ['curtida', 45],
  ['comentario', 30],
  ['entrar', 12],
  ['seguir', 6],
  ['presente', 4],
  ['compartilhar', 3],
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
  const event = { tipo: type, usuario: username, nome: username, fotoUrl: `https://i.pravatar.cc/80?u=${username}` };
  if (type === 'curtida') event.quantidade = Math.floor(rnd() * 10) + 1;
  if (type === 'presente') {
    const p = weightedPick(GIFTS, (g) => g.weight, rnd());
    event.presente = p.name;
    event.valorMoedas = p.coins;
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
