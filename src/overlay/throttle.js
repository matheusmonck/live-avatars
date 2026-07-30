// Throttle por usuário: evita animar N vezes numa enxurrada de eventos iguais
// (ex: rajada de curtidas). `agora` é injetável pra facilitar testes.
export function criarThrottle(janelaMs, agora = () => Date.now()) {
  const ultimo = new Map();
  return {
    permitir(usuario) {
      const t = agora();
      const anterior = ultimo.get(usuario) ?? -Infinity;
      if (t - anterior < janelaMs) return false;
      ultimo.set(usuario, t);
      return true;
    },
  };
}
