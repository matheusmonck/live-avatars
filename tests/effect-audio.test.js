import { describe, expect, test, vi } from 'vitest';
import { createEffectAudio, effectFor } from '../src/overlay/effect-audio.js';

describe('effect selection', () => {
  test('maps supported social effects and rejects unknown types', () => {
    expect(effectFor('follow').type).toBe('triangle');
    expect(effectFor('share').type).toBe('square');
    expect(effectFor('gift').type).toBe('sawtooth');
    expect(effectFor('like')).toBeNull();
  });
});

describe('effect playback', () => {
  function audioContext() {
    const nodes = [];
    let gain;
    const ctx = {
      state: 'suspended',
      currentTime: 1,
      resume: vi.fn(async () => {
        ctx.state = 'running';
      }),
      createOscillator: vi.fn(() => {
        const oscillator = {
          type: '',
          frequency: { value: 0 },
          connect: vi.fn(() => gain),
          start: vi.fn(),
          stop: vi.fn(),
        };
        return oscillator;
      }),
      createGain: vi.fn(() => {
        gain = {
          gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(() => ({ connect: vi.fn() })),
        };
        nodes.push(gain);
        return gain;
      }),
    };
    return { ctx, nodes };
  }

  test('plays a supported effect at the configured volume', () => {
    const now = 1000;
    const { ctx, nodes } = audioContext();
    const audio = createEffectAudio({
      AudioContext: function () {
        return ctx;
      },
      now: () => now,
    });
    ctx.state = 'running';
    return audio.unlock().then(() => {
      audio.play('gift', 0.4);

      expect(ctx.createOscillator).toHaveBeenCalled();
      expect(nodes[0].gain.setValueAtTime).toHaveBeenCalledWith(0.4, 1);
    });
  });

  test('does not play for zero volume or an unsupported browser', () => {
    const audio = createEffectAudio({ AudioContext: undefined });
    audio.play('gift', 0);
    audio.play('like', 0.5);
    expect(audio.ready).toBe(false);
  });
});
