// Gerencia quais avatares têm balão AGORA (teto simultâneo) e a fila de espera.
// Puro (sem PIXI nem timers): o gerenciador cuida do render e dos timers, e chama
// `release` quando um balão expira ou o avatar sai.

export function createBubbleQueue({ max = 5 } = {}) {
  let limit = max;
  const active = new Map();  // username -> text (aparecendo agora)
  const queue = [];          // [{ username, text }] esperando (dedup por usuário)

  const queueIndex = (u) => queue.findIndex((q) => q.username === u);

  // Puxa da fila enquanto houver slot livre; devolve os promovidos, em ordem.
  function drain() {
    const promoted = [];
    while (queue.length && active.size < limit) {
      const item = queue.shift();
      active.set(item.username, item.text);
      promoted.push(item);
    }
    return promoted;
  }

  return {
    submit(username, text) {
      if (active.has(username)) { active.set(username, text); return { action: 'update', username, text }; }
      if (active.size < limit) { active.set(username, text); return { action: 'show', username, text }; }
      const i = queueIndex(username);
      if (i >= 0) queue[i].text = text; else queue.push({ username, text });
      return { action: 'queued', username, text };
    },

    // Libera o slot (timer expirou ou avatar saiu) e promove o próximo, se houver.
    release(username) {
      active.delete(username);
      const i = queueIndex(username);
      if (i >= 0) queue.splice(i, 1);
      const [next] = drain();
      return { next: next ?? null };
    },

    // Ajusta o teto ao vivo; devolve os promovidos se o teto subiu.
    setMax(n) {
      limit = Math.max(0, Math.floor(n));
      return drain();
    },

    has: (u) => active.has(u),
    activeCount: () => active.size,
    queuedCount: () => queue.length,
  };
}
