// Throttle por usuário: evita animar N vezes numa enxurrada de eventos iguais
// (ex: rajada de curtidas). `agora` é injetável pra facilitar testes.
export function createThrottle(windowMs, now = () => Date.now()) {
  const last = new Map();
  return {
    allow(key) {
      const t = now();
      const previous = last.get(key) ?? -Infinity;
      if (t - previous < windowMs) return false;
      last.set(key, t);
      return true;
    },
  };
}
