// EMBER WING — sound effects, WebAudio synth only.
// One job: engine hum, drop whoosh, scoop splash, success chime and
// low-fuel alarm, all synthesized. Never starts before a user gesture,
// never crashes when audio is unavailable (headless screenshots).

export function createAudio() {
  let ctx = null;
  let engine = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx !== null) return ctx !== false;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        ctx = false;
        return false;
      }
      ctx = new AC();
      engine = ctx.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 62;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engine.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engine.start();
    } catch (err) {
      ctx = false;
      return false;
    }
    return true;
  }

  function beep(freq, dur, vol, when) {
    if (!ensure() || muted || ctx === false) return;
    try {
      const t = ctx.currentTime + (when || 0);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (err) {
      // Audio is best-effort; the game plays on without it.
    }
  }

  function noise(dur, vol, freq) {
    if (!ensure() || muted || ctx === false) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      src.start();
    } catch (err) {
      // Best-effort only.
    }
  }

  return {
    unlock() {
      if (ensure() && ctx !== false && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    },
    engine(throttle, active) {
      if (!ensure() || ctx === false || engineGain === null) return;
      try {
        const target = muted || !active ? 0 : 0.02 + throttle * 0.00045;
        engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
        engine.frequency.setTargetAtTime(52 + throttle * 0.9, ctx.currentTime, 0.1);
      } catch (err) {
        // Best-effort only.
      }
    },
    drop() {
      noise(0.5, 0.25, 900);
    },
    scoop() {
      noise(0.35, 0.16, 1600);
    },
    chime() {
      beep(660, 0.16, 0.2, 0);
      beep(880, 0.24, 0.2, 0.12);
    },
    alarm() {
      beep(440, 0.14, 0.16, 0);
      beep(523, 0.14, 0.16, 0.2);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}
