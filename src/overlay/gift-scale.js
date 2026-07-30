// Traduz o valor em moedas de um presente no tamanho/duração do efeito visual.
export function escalaPresente(valorMoedas) {
  const v = Number.isFinite(Number(valorMoedas)) ? Number(valorMoedas) : 0;
  if (v > 100) {
    return { nivel: 'grande', escala: 2.6, duracaoMs: 5000, confetes: 160 };
  }
  if (v > 5) {
    return { nivel: 'medio', escala: 2.0, duracaoMs: 3500, confetes: 70 };
  }
  return { nivel: 'pequeno', escala: 1.4, duracaoMs: 2500, confetes: 18 };
}
