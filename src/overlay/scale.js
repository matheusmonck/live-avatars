// Escala responsiva do overlay. Resolução de referência: 1080×1920 (9:16 vertical).
// Amarrar à ALTURA faz o MESMO overlay servir vertical (fator 1.0) e horizontal
// 1920×1080 (fator 0.5625) mantendo a proporção — o "formato" é só a dimensão da
// fonte de navegador no OBS. Puro e testável (sem PIXI/DOM).
export const REFERENCE_HEIGHT = 1920;

export function uiScale(height, reference = REFERENCE_HEIGHT) {
  const h = Number(height), r = Number(reference);
  if (!Number.isFinite(h) || !Number.isFinite(r) || r <= 0) return 1;
  return h / r;
}

// Escala efetiva do sprite: diferença por personagem × multiplicador global × responsivo.
export function effectiveScale(entryScale, globalScale, ui) {
  return (Number(entryScale) || 1) * (Number(globalScale) || 1) * (Number(ui) || 1);
}
