export const TIPOS_SIMULAVEIS = ['comentario', 'entrar', 'curtida', 'seguir', 'presente', 'compartilhar'];

const NOMES = ['ana', 'bruno', 'carla', 'dan', 'edu', 'fer', 'gi', 'hugo', 'isa', 'joao'];
const PRESENTES = [
  { nome: 'rosa', moedas: 1 },
  { nome: 'sorvete', moedas: 5 },
  { nome: 'chapeu', moedas: 50 },
  { nome: 'leao', moedas: 300 },
  { nome: 'foguete', moedas: 1000 },
];

// `rnd` injetável (retorna 0..1) pra testes determinísticos.
export function gerarEventoAleatorio(rnd = Math.random) {
  const escolher = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
  const usuario = escolher(NOMES) + Math.floor(rnd() * 90 + 10);
  const tipo = escolher(TIPOS_SIMULAVEIS);
  const evento = { tipo, usuario, nome: usuario, fotoUrl: `https://i.pravatar.cc/80?u=${usuario}` };
  if (tipo === 'curtida') evento.quantidade = Math.floor(rnd() * 10) + 1;
  if (tipo === 'presente') {
    const p = escolher(PRESENTES);
    evento.presente = p.nome;
    evento.valorMoedas = p.moedas;
  }
  return evento;
}

// Dispara eventos num intervalo. Retorna função pra parar.
export function iniciarSimulador(aoEvento, intervaloMs = 900) {
  const id = setInterval(() => aoEvento(gerarEventoAleatorio()), intervaloMs);
  return () => clearInterval(id);
}
