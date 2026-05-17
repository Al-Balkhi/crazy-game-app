import { useCallback, useRef } from 'react';

/**
 * Generates an intense alarm sound using the Web Audio API.
 * Supports looping until explicitly stopped (for session-end alerts).
 * No external audio files needed.
 */
export function useSound() {
  const ctxRef = useRef(null);
  const loopRef = useRef(null);
  const nodesRef = useRef([]);

  const stopAll = useCallback(() => {
    // Stop all active oscillators
    nodesRef.current.forEach((node) => {
      try { node.stop(); } catch { /* already stopped */ }
    });
    nodesRef.current = [];

    // Clear the loop interval
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  const playOnce = useCallback(() => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // ── Layer 1: Intense rapid dual-tone alarm ──────────────────
      const alarmFreqs = [880, 660]; // alternating high-low
      alarmFreqs.forEach((freq, i) => {
        for (let rep = 0; rep < 6; rep++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now);

          const offset = rep * 0.25 + i * 0.125;
          gain.gain.setValueAtTime(0, now + offset);
          gain.gain.linearRampToValueAtTime(0.35, now + offset + 0.03);
          gain.gain.setValueAtTime(0.35, now + offset + 0.08);
          gain.gain.linearRampToValueAtTime(0, now + offset + 0.125);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + offset);
          osc.stop(now + offset + 0.15);
          nodesRef.current.push(osc);
        }
      });

      // ── Layer 2: Deep warning bass hit ──────────────────────────
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(110, now);
      bass.frequency.linearRampToValueAtTime(55, now + 0.5);
      bassGain.gain.setValueAtTime(0.4, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(now);
      bass.stop(now + 1.5);
      nodesRef.current.push(bass);

      // ── Layer 3: Rising sweep siren ─────────────────────────────
      const siren = ctx.createOscillator();
      const sirenGain = ctx.createGain();
      siren.type = 'sawtooth';
      siren.frequency.setValueAtTime(300, now);
      siren.frequency.exponentialRampToValueAtTime(1800, now + 0.8);
      siren.frequency.exponentialRampToValueAtTime(300, now + 1.6);
      sirenGain.gain.setValueAtTime(0.2, now);
      sirenGain.gain.setValueAtTime(0.2, now + 1.4);
      sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      siren.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      siren.start(now);
      siren.stop(now + 1.8);
      nodesRef.current.push(siren);

      // ── Layer 4: Harsh noise burst ──────────────────────────────
      const bufferSize = ctx.sampleRate * 0.15;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        noiseData[j] = (Math.random() * 2 - 1) * 0.8;
      }
      for (let rep = 0; rep < 3; rep++) {
        const noise = ctx.createBufferSource();
        const noiseGain = ctx.createGain();
        noise.buffer = noiseBuffer;
        const nOffset = rep * 0.6;
        noiseGain.gain.setValueAtTime(0.25, now + nOffset);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + nOffset + 0.15);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now + nOffset);
        noise.stop(now + nOffset + 0.15);
        nodesRef.current.push(noise);
      }
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }, []);

  /** Start looping alarm — plays every 2 seconds until stop() is called */
  const playLoop = useCallback(() => {
    stopAll();
    playOnce();
    loopRef.current = setInterval(playOnce, 2000);
  }, [playOnce, stopAll]);

  /** Play a single alarm burst (non-looping) */
  const play = useCallback(() => {
    playOnce();
  }, [playOnce]);

  /** Stop the looping alarm */
  const stop = useCallback(() => {
    stopAll();
  }, [stopAll]);

  return { play, playLoop, stop };
}
