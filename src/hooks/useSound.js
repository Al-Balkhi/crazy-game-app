import { useCallback, useRef } from 'react';

/**
 * Generates a futuristic chime sound using the Web Audio API.
 * No external audio files needed.
 */
export function useSound() {
  const ctxRef = useRef(null);

  const play = useCallback(() => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      const now = ctx.currentTime;

      // Three-tone futuristic chime
      const frequencies = [880, 1108.73, 1318.51]; // A5, C#6, E6

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.7);
      });

      // Add a subtle sweep effect
      const sweep = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweep.type = 'sawtooth';
      sweep.frequency.setValueAtTime(200, now + 0.5);
      sweep.frequency.exponentialRampToValueAtTime(2000, now + 0.9);
      sweepGain.gain.setValueAtTime(0.05, now + 0.5);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      sweep.connect(sweepGain);
      sweepGain.connect(ctx.destination);
      sweep.start(now + 0.5);
      sweep.stop(now + 1.0);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }, []);

  return { play };
}
