/**
 * SoundManager v2 — Drum roll + dramatic reveal sounds
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playNote(frequency, type, duration, volume = 0.3, startOffset = 0, decay = true) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);
  gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startOffset + 0.01);
  if (decay) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
  } else {
    gain.gain.setValueAtTime(volume, ctx.currentTime + startOffset + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startOffset + duration);
  }
  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration + 0.05);
}

function playNoise(duration, volume = 0.1, startOffset = 0) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime + startOffset);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + startOffset);
  source.stop(ctx.currentTime + startOffset + duration);
}

/** Drum roll during suspense — accelerating hits */
export function playDrumRoll(onEnd) {
  let running = true;
  let count = 0;
  const totalHits = 28;

  function hit() {
    if (!running) return;
    // Snare-like noise burst
    playNoise(0.06, 0.15);
    // Bass thud
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);

    count++;
    const progress = count / totalHits;
    // Start at 200ms gaps, accelerate to 40ms
    const delay = 220 - progress * 180;
    if (count < totalHits) {
      setTimeout(hit, delay);
    } else {
      setTimeout(() => { if (running) onEnd && onEnd(); }, 50);
    }
  }
  hit();
  return () => { running = false; };
}

/** Dramatic winner reveal */
export function playRevealSound() {
  // Rising brass swell
  const notes = [
    { f: 261, off: 0, d: 0.18 },
    { f: 330, off: 0.12, d: 0.18 },
    { f: 392, off: 0.22, d: 0.25 },
    { f: 523, off: 0.35, d: 0.5 },
  ];
  notes.forEach(n => playNote(n.f, 'sawtooth', n.d, 0.22, n.off));
  // Cymbal crash
  playNoise(0.6, 0.25, 0.35);
}

/** Joker lucky reveal */
export function playJokerSound() {
  // Happy ascending arpeggio
  const notes = [261, 330, 392, 523, 659, 784];
  notes.forEach((f, i) => playNote(f, 'sine', 0.18, 0.2, i * 0.07));
  // Sparkle high notes
  [1047, 1319].forEach((f, i) => playNote(f, 'sine', 0.15, 0.12, 0.42 + i * 0.08));
}

export function playAddSound() {
  playNote(660, 'sine', 0.1, 0.14);
  playNote(880, 'sine', 0.1, 0.12, 0.1);
}

export function playExcludeSound() {
  playNote(330, 'square', 0.08, 0.1);
  playNote(220, 'square', 0.12, 0.08, 0.08);
}

export function playReplaySound() {
  [440, 550, 660].forEach((f, i) => playNote(f, 'sine', 0.09, 0.14, i * 0.07));
}
