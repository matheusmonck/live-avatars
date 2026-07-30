export const TIPOS_SIMULAVEIS = ['comentario', 'entrar', 'curtida', 'seguir', 'presente', 'compartilhar'];

// Poucos espectadores recorrentes: como numa live real, as mesmas pessoas voltam
// a interagir. Isso mantém a quantidade de avatares baixa e natural (≤ este pool),
// em vez de encher até o limite com nomes sempre novos.
const NOMES = ['ana.costa', 'bruninho', 'carla_m', 'dan', 'fefa', 'gustavo_tk', 'isa', 'joao.p'];

// Distribuição realista de eventos: curtida e comentário dominam; seguir, presente
// e compartilhar são bem mais raros. (peso = chance relativa)
const PESOS_TIPO = [
  ['curtida', 45],
  ['comentario', 30],
  ['entrar', 12],
  ['seguir', 6],
  ['presente', 4],
  ['compartilhar', 3],
];

// Presentes: os baratos são comuns, os caros raros.
const PRESENTES = [
  { nome: 'rosa', moedas: 1, peso: 50 },
  { nome: 'sorvete', moedas: 5, peso: 30 },
  { nome: 'chapeu', moedas: 50, peso: 14 },
  { nome: 'leao', moedas: 300, peso: 5 },
  { nome: 'foguete', moedas: 1000, peso: 1 },
];

// Escolha ponderada: sorteia um item proporcional ao seu peso, com `r` em 0..1.
function escolherPeso(itens, peso, r) {
  const total = itens.reduce((s, it) => s + peso(it), 0);
  let x = r * total;
  for (const it of itens) { const p = peso(it); if (x < p) return it; x -= p; }
  return itens[itens.length - 1];
}

// `rnd` injetável (retorna 0..1) pra testes determinísticos.
export function gerarEventoAleatorio(rnd = Math.random) {
  const usuario = NOMES[Math.floor(rnd() * NOMES.length) % NOMES.length];
  const tipo = escolherPeso(PESOS_TIPO, (t) => t[1], rnd())[0];
  const evento = { tipo, usuario, nome: usuario, fotoUrl: `https://i.pravatar.cc/80?u=${usuario}` };
  if (tipo === 'curtida') evento.quantidade = Math.floor(rnd() * 10) + 1;
  if (tipo === 'presente') {
    const p = escolherPeso(PRESENTES, (g) => g.peso, rnd());
    evento.presente = p.nome;
    evento.valorMoedas = p.moedas;
  }
  return evento;
}

// Dispara eventos com intervalo variável (mais orgânico que uma batida fixa).
// Retorna função pra parar.
export function iniciarSimulador(aoEvento, { min = 700, max = 2200, rnd = Math.random } = {}) {
  let parado = false;
  let timer = null;
  const agendar = () => {
    if (parado) return;
    timer = setTimeout(() => { aoEvento(gerarEventoAleatorio()); agendar(); }, min + rnd() * (max - min));
  };
  agendar();
  return () => { parado = true; if (timer) clearTimeout(timer); };
}
