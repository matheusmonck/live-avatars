const EFFECTS = {
  follow: { frequency: 660, durationMs: 180, type: 'triangle' },
  share: { frequency: 740, durationMs: 160, type: 'square' },
  gift: { frequency: 440, durationMs: 260, type: 'sawtooth' },
};

export function effectFor(type) {
  return EFFECTS[type] ?? null;
}

export function createEffectAudio({
  AudioContext = globalThis.AudioContext,
  now = () => performance.now(),
} = {}) {
  let context;
  let unlockedAt = -Infinity;

  async function unlock() {
    if (typeof AudioContext !== 'function') return false;
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    if (context.state === 'running') unlockedAt = now();
    return context.state === 'running';
  }

  function play(type, volume) {
    const effect = effectFor(type);
    const gainValue = Number(volume);
    if (!effect || !Number.isFinite(gainValue) || gainValue <= 0) return;
    if (!context || context.state !== 'running' || now() - unlockedAt > 5000) {
      void unlock();
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = effect.type;
    oscillator.frequency.value = effect.frequency;
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + effect.durationMs / 1000);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + effect.durationMs / 1000);
  }

  return {
    play,
    unlock,
    get ready() {
      return Boolean(context && context.state === 'running');
    },
  };
}
