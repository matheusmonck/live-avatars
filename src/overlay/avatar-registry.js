export function createRegistry({ limit, inactivityMs }) {
  // username -> { username, lastInteraction }
  const avatars = new Map();

  function oldest() {
    let target = null;
    for (const a of avatars.values()) {
      if (!target || a.lastInteraction < target.lastInteraction) target = a;
    }
    return target;
  }

  return {
    register(username, now) {
      const existing = avatars.get(username);
      if (existing) {
        existing.lastInteraction = now;
        return { isNew: false, avatar: existing, removed: [] };
      }
      const removed = [];
      while (avatars.size >= limit) {
        const old = oldest();
        if (!old) break;
        avatars.delete(old.username);
        removed.push(old.username);
      }
      const avatar = { username, lastInteraction: now };
      avatars.set(username, avatar);
      return { isNew: true, avatar, removed };
    },

    expireInactive(now) {
      const removed = [];
      for (const a of avatars.values()) {
        if (now - a.lastInteraction > inactivityMs) removed.push(a.username);
      }
      for (const u of removed) avatars.delete(u);
      return removed;
    },

    configure({ limit: newLimit, inactivityMs: newInactivity } = {}) {
      if (Number.isFinite(newLimit)) limit = newLimit;
      if (Number.isFinite(newInactivity)) inactivityMs = newInactivity;
    },

    has(username) { return avatars.has(username); },
    list() { return [...avatars.values()].map(a => ({ ...a })); },
  };
}
