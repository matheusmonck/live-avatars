// Traduz o valor em moedas de um presente no tamanho/duração do efeito visual.
export function giftScale(coins) {
  const v = Number.isFinite(Number(coins)) ? Number(coins) : 0;
  if (v > 100) return { level: 'large', scale: 2.6, durationMs: 5000, confetti: 160 };
  if (v > 5) return { level: 'medium', scale: 2.0, durationMs: 3500, confetti: 70 };
  return { level: 'small', scale: 1.4, durationMs: 2500, confetti: 18 };
}
